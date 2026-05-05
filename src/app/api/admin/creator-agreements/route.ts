import { createHash } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import {
  CREATOR_AGREEMENT_TEMPLATE_COLLECTION,
  DEFAULT_CREATOR_AGREEMENT_TITLE,
  type CreatorAgreementSource,
  type CreatorAgreementTemplate,
  buildCreatorAgreementTemplateId,
  buildDefaultCreatorAgreementTemplate,
  normalizeCreatorAgreementTemplate,
  toCreatorAgreementTemplateAdminView,
} from "@/lib/creator-agreement-documents";
import {
  ACTIVE_CREATOR_AGREEMENT_EMBEDDED_FULL_TEXT_REFERENCE,
  buildAgreementHash,
} from "@/lib/creator-agreement-version";
import { isCreatorOwnerEmail } from "@/lib/creator-admin";
import {
  activateCreatorAgreementTemplate,
  getActiveCreatorAgreementTemplate,
  saveCreatorAgreementTemplate,
} from "@/lib/server/creator-agreement-templates";
import {
  countersignCreatorAgreementDispatch,
  sendCreatorAgreementDispatch,
} from "@/lib/server/creator-agreement-documents";
import { adminDb, adminStorage } from "@/lib/server/firebase-admin";
import { handleApiError } from "@/lib/server/auth";
import { trackServerEvent } from "@/lib/server/analytics";
import { MEDIA_PROXY } from "@/lib/server/rate-limit";
import { guardApiRequest } from "@/lib/server/request-guard";
import { withRouteRuntimeHealth } from "@/lib/server/route-runtime-health";
import {
  actorMarkerToTelemetryPayload,
  assertKnownActor,
  buildAdminOnBehalfMarker,
  type ActorMarker,
} from "@/lib/identity/actor-markers";

const MAX_AGREEMENT_UPLOAD_BYTES = 12 * 1024 * 1024;
const AGREEMENT_DOCUMENT_PREFIX = "creator-agreements/";
const AGREEMENT_DOCUMENT_SIGNED_URL_TTL_MS = 5 * 60 * 1000;
const CREATOR_AGREEMENT_MEDIA_POLICY = "MEDIA_PROXY";
const CREATOR_AGREEMENT_ROUTE_EVIDENCE = {
  adminAgreementRoute: true,
  adminOnly: true,
  storageEgressGuarded: true,
  mediaProxyGuarded: true,
  mediaProxyPolicy: CREATOR_AGREEMENT_MEDIA_POLICY,
  rawStorageUrlExposed: false,
  defaultDocumentResponse: "metadata_only",
  maxPreviewTtlSeconds: AGREEMENT_DOCUMENT_SIGNED_URL_TTL_MS / 1000,
} as const;
const AGREEMENT_UPLOAD_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readSummaryBullets(value: unknown) {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split("\n")
      : [];

  return raw
    .map((entry) => readString(entry))
    .filter(Boolean)
    .slice(0, 8);
}

function readAgreementSource(value: unknown): CreatorAgreementSource {
  return value === "uploaded_pdf_snapshot" || value === "hybrid"
    ? value
    : "native_full_text";
}

function buildAdminActor(input: {
  uid?: string | null;
  email?: string | null;
  isOwner: boolean;
}) {
  return {
    uid: input.uid,
    email: input.email,
    role: input.isOwner ? "owner_admin" : "admin",
    isAdmin: true,
    isOwner: input.isOwner,
  };
}

function buildCreatorOnboardingActorFromMarker(marker: ActorMarker) {
  return {
    id: marker.actorUid ?? marker.actorType,
    role: marker.actorType === "owner_admin" ? "owner_admin" as const : "admin" as const,
    label: marker.actorEmail ?? marker.actorUid ?? "Admin",
    marker,
  };
}

function readRequestIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || undefined;
  }

  return request.headers.get("x-real-ip")?.trim() || undefined;
}

function buildJsonResponse(status: number, error: string) {
  return NextResponse.json({ ...CREATOR_AGREEMENT_ROUTE_EVIDENCE, error }, { status });
}

function isSafeAgreementDocumentPath(storagePath: string) {
  return storagePath.startsWith(AGREEMENT_DOCUMENT_PREFIX)
    && storagePath.length > AGREEMENT_DOCUMENT_PREFIX.length
    && !storagePath.includes("..")
    && !storagePath.endsWith("/");
}

function isSafeAgreementSignedUrl(value: string) {
  try {
    if (value.trim() !== value) {
      return false;
    }
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:"
      && !url.username
      && !url.password
      && (host === "storage.googleapis.com" || host.endsWith(".storage.googleapis.com"))
      && !url.searchParams.has("token");
  } catch {
    return false;
  }
}

async function uploadAgreementFile(input: {
  file: File;
  agreementVersion: string;
  nowMs: number;
}) {
  if (!adminStorage) {
    throw new Error("Storage is not available for agreement uploads.");
  }

  if (input.file.size <= 0) {
    throw new Error("Choose an agreement source file before saving.");
  }

  if (input.file.size > MAX_AGREEMENT_UPLOAD_BYTES) {
    throw new Error("Agreement source file must be 12MB or smaller.");
  }

  const mimeType = input.file.type || "application/octet-stream";
  if (!AGREEMENT_UPLOAD_MIME_TYPES.has(mimeType)) {
    throw new Error("Agreement source must be a PDF, plain text, or markdown file.");
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const agreementHash = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  const safeName = input.file.name
    .split(/[/\\]/)
    .pop()
    ?.replace(/[^A-Za-z0-9._-]+/g, "_")
    .slice(0, 120) || "agreement-source";
  const safeVersion = buildCreatorAgreementTemplateId({
    agreementVersion: input.agreementVersion,
  }).replace(/^creator_agreement_/, "");
  const storagePath = `${AGREEMENT_DOCUMENT_PREFIX}${safeVersion}/${input.nowMs}-${safeName}`;
  if (!isSafeAgreementDocumentPath(storagePath)) {
    throw new Error("Invalid agreement document storage path.");
  }

  await adminStorage.bucket().file(storagePath).save(bytes, {
    resumable: false,
    contentType: mimeType,
    metadata: {
      metadata: {
        agreementHash,
        agreementVersion: input.agreementVersion,
      },
    },
  });

  return {
    agreementHash,
    storagePath,
    mimeType,
  };
}

async function buildTemplateFromJson(input: {
  source: Record<string, unknown>;
  actorUid: string;
  nowMs: number;
  fileUpload?: Awaited<ReturnType<typeof uploadAgreementFile>> | null;
  activeForNewCreators?: boolean;
}) {
  const agreementVersion = readString(input.source.agreementVersion);
  const agreementTitle = readString(input.source.agreementTitle) || DEFAULT_CREATOR_AGREEMENT_TITLE;
  const agreementSource = input.fileUpload
    ? input.fileUpload.mimeType === "application/pdf"
      ? "uploaded_pdf_snapshot" as const
      : "hybrid" as const
    : readAgreementSource(input.source.agreementSource);
  const agreementHash = input.fileUpload?.agreementHash
    || readString(input.source.agreementHash)
    || (agreementSource === "native_full_text" ? buildAgreementHash({ agreementVersion }) : "");

  if (!agreementVersion || agreementVersion.length < 3) {
    throw new Error("Enter an agreement version before saving.");
  }

  if (!agreementHash) {
    throw new Error("Agreement hash is required unless the native full text source is active.");
  }

  const templateId = readString(input.source.templateId)
    || buildCreatorAgreementTemplateId({ agreementVersion, agreementTitle });

  return {
    templateId,
    agreementVersion,
    agreementTitle,
    agreementSource,
    activeForNewCreators: input.activeForNewCreators === true,
    fullTextStoragePath: input.fileUpload && input.fileUpload.mimeType !== "application/pdf"
      ? input.fileUpload.storagePath
      : undefined,
    fullTextSnapshotPath: input.fileUpload && input.fileUpload.mimeType !== "application/pdf"
      ? input.fileUpload.storagePath
      : undefined,
    pdfStoragePath: input.fileUpload && input.fileUpload.mimeType === "application/pdf"
      ? input.fileUpload.storagePath
      : undefined,
    embeddedFullTextReference: agreementSource === "native_full_text"
      ? ACTIVE_CREATOR_AGREEMENT_EMBEDDED_FULL_TEXT_REFERENCE
      : undefined,
    agreementHash,
    summaryBullets: readSummaryBullets(input.source.summaryBullets).length > 0
      ? readSummaryBullets(input.source.summaryBullets)
      : buildDefaultCreatorAgreementTemplate(input.nowMs).summaryBullets,
    createdAt: input.nowMs,
    createdByUid: input.actorUid,
    effectiveAt: input.activeForNewCreators === true ? input.nowMs : undefined,
    supersedesVersion: readString(input.source.supersedesVersion) || undefined,
  } satisfies CreatorAgreementTemplate;
}

async function readBody(request: NextRequest, actorUid: string, nowMs: number) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const action = readOptionalString(form.get("action"));
    const file = form.get("agreementFile");
    const agreementVersion = readOptionalString(form.get("agreementVersion"));
    const fileUpload = file instanceof File && file.size > 0
      ? await uploadAgreementFile({
        file,
        agreementVersion,
        nowMs,
      })
      : null;

    return {
      action,
      targetUserId: readOptionalString(form.get("targetUserId")),
      template: await buildTemplateFromJson({
        source: {
          templateId: readOptionalString(form.get("templateId")),
          agreementVersion,
          agreementTitle: readOptionalString(form.get("agreementTitle")),
          agreementSource: readOptionalString(form.get("agreementSource")),
          agreementHash: readOptionalString(form.get("agreementHash")),
          summaryBullets: readOptionalString(form.get("summaryBullets")),
          supersedesVersion: readOptionalString(form.get("supersedesVersion")),
        },
        actorUid,
        nowMs,
        fileUpload,
        activeForNewCreators: action === "activate_template",
      }),
    };
  }

  const json = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = readString(json.action);
  const templateInput = json.template && typeof json.template === "object" && !Array.isArray(json.template)
    ? json.template as Record<string, unknown>
    : json;

  return {
    action,
    targetUserId: readString(json.targetUserId),
    template: action === "create_template" || action === "activate_template"
      ? await buildTemplateFromJson({
        source: templateInput,
        actorUid,
        nowMs,
        activeForNewCreators: action === "activate_template",
      })
      : null,
  };
}

async function GET_handler(request: NextRequest) {
  try {
    // google-cost-guard: creator agreement storage access is protected by MEDIA_PROXY or equivalent document byte/rate policy.
    // storage-egress-guard: agreement route does not expose unbounded raw document bytes.
    // safe-url-guard: raw agreement Storage URLs are not exposed by default.
    await guardApiRequest(request, {
      routeName: "admin/creator-agreements",
      rateLimit: MEDIA_PROXY,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    const templateId = request.nextUrl.searchParams.get("templateId");
    const shouldDownload = request.nextUrl.searchParams.get("download") === "1";

    if (shouldDownload) {
      if (!adminDb || !adminStorage) {
        return buildJsonResponse(500, "Agreement document storage is unavailable.");
      }

      const template = templateId
        ? normalizeCreatorAgreementTemplate((await adminDb.collection(CREATOR_AGREEMENT_TEMPLATE_COLLECTION).doc(templateId).get()).data())
        : await getActiveCreatorAgreementTemplate();
      const storagePath = template?.pdfStoragePath || template?.fullTextStoragePath;

      if (!template || !storagePath) {
        return buildJsonResponse(404, "No uploaded agreement source is available for this template.");
      }
      if (!isSafeAgreementDocumentPath(storagePath)) {
        return buildJsonResponse(400, "Invalid agreement document reference.");
      }

      const [url] = await adminStorage.bucket().file(storagePath).getSignedUrl({
        action: "read",
        expires: Date.now() + AGREEMENT_DOCUMENT_SIGNED_URL_TTL_MS,
      });
      if (!isSafeAgreementSignedUrl(url)) {
        return buildJsonResponse(400, "Invalid agreement preview URL.");
      }

      return NextResponse.redirect(url);
    }

    const activeTemplate = await getActiveCreatorAgreementTemplate();
    return NextResponse.json({
      ...CREATOR_AGREEMENT_ROUTE_EVIDENCE,
      success: true,
      activeTemplate: toCreatorAgreementTemplateAdminView(activeTemplate),
    });
  } catch (error) {
    return handleApiError(error, "Admin.CreatorAgreements.GET");
  }
}

async function POST_handler(request: NextRequest) {
  try {
    // google-cost-guard: creator agreement storage access is protected by MEDIA_PROXY or equivalent document byte/rate policy.
    // storage-egress-guard: agreement route does not expose unbounded raw document bytes.
    // safe-url-guard: raw agreement Storage URLs are not exposed by default.
    const caller = await guardApiRequest(request, {
      routeName: "admin/creator-agreements",
      rateLimit: MEDIA_PROXY,
      requireTrustedOrigin: true,
      auth: "admin",
    });

    if (!caller?.uid) {
      return buildJsonResponse(401, "Unauthorized");
    }

    const nowMs = Date.now();
    const isOwnerActor = isCreatorOwnerEmail(caller.email);
    const body = await readBody(request, caller.uid, nowMs);

    if (body.action === "create_template") {
      if (!body.template) {
        return buildJsonResponse(400, "Agreement template details are required.");
      }

      const saved = await saveCreatorAgreementTemplate(body.template);
      const marker = assertKnownActor(buildAdminOnBehalfMarker(
        buildAdminActor({ uid: caller.uid, email: caller.email, isOwner: isOwnerActor }),
        caller.uid,
        {
          surface: "admin_roster",
          route: "/api/admin/creator-agreements",
          actionKey: "admin_creator_agreement_template_created",
          source: "admin_creator_agreements_route",
          performedAs: "admin_on_behalf",
          targetCreatorId: caller.uid,
        },
      ));

      await trackServerEvent("admin_creator_agreement_template_created", {
        page_path: "/admin/roster",
        template_id: saved.templateId,
        agreement_version: saved.agreementVersion,
        agreement_hash: saved.agreementHash,
        ...actorMarkerToTelemetryPayload(marker),
      }, caller.uid).catch(() => undefined);

      return NextResponse.json({
        ...CREATOR_AGREEMENT_ROUTE_EVIDENCE,
        success: true,
        activeTemplate: toCreatorAgreementTemplateAdminView(await getActiveCreatorAgreementTemplate(nowMs)),
        template: toCreatorAgreementTemplateAdminView(saved),
      });
    }

    if (body.action === "activate_template") {
      if (!isOwnerActor) {
        return buildJsonResponse(403, "Only the primary owner can activate the agreement for new creators.");
      }

      if (!body.template) {
        return buildJsonResponse(400, "Agreement template details are required.");
      }

      const activated = await activateCreatorAgreementTemplate({
        template: body.template,
        activatedAt: nowMs,
        activatedByUid: caller.uid,
      });
      const marker = assertKnownActor(buildAdminOnBehalfMarker(
        buildAdminActor({ uid: caller.uid, email: caller.email, isOwner: true }),
        caller.uid,
        {
          surface: "admin_roster",
          route: "/api/admin/creator-agreements",
          actionKey: "admin_creator_agreement_template_activated",
          source: "admin_creator_agreements_route",
          performedAs: "owner_override",
          targetCreatorId: caller.uid,
        },
      ));

      await trackServerEvent("admin_creator_agreement_template_activated", {
        page_path: "/admin/roster",
        template_id: activated.templateId,
        agreement_version: activated.agreementVersion,
        agreement_hash: activated.agreementHash,
        ...actorMarkerToTelemetryPayload(marker),
      }, caller.uid).catch(() => undefined);

      return NextResponse.json({
        ...CREATOR_AGREEMENT_ROUTE_EVIDENCE,
        success: true,
        activeTemplate: toCreatorAgreementTemplateAdminView(activated),
      });
    }

    if (body.action === "send_agreement" || body.action === "send_updated_agreement") {
      if (!body.targetUserId) {
        return buildJsonResponse(400, "Select a creator before sending an agreement.");
      }

      const marker = assertKnownActor(buildAdminOnBehalfMarker(
        buildAdminActor({ uid: caller.uid, email: caller.email, isOwner: isOwnerActor }),
        body.targetUserId,
        {
          surface: "admin_roster",
          route: "/api/admin/creator-agreements",
          actionKey: body.action === "send_updated_agreement"
            ? "admin_creator_agreement_update_sent"
            : "admin_creator_agreement_sent",
          source: "admin_creator_agreements_route",
          performedAs: "admin_on_behalf",
          targetCreatorId: body.targetUserId,
        },
      ));
      const result = await sendCreatorAgreementDispatch({
        targetUserId: body.targetUserId,
        sentByUid: caller.uid,
        actor: buildCreatorOnboardingActorFromMarker(marker),
        sendUpdatedAgreement: body.action === "send_updated_agreement",
      });
      const eventName = body.action === "send_updated_agreement"
        ? "admin_creator_agreement_update_sent"
        : "admin_creator_agreement_sent";

      await trackServerEvent(eventName, {
        page_path: "/admin/roster",
        template_id: result.template.templateId,
        agreement_version: result.template.agreementVersion,
        agreement_hash: result.template.agreementHash,
        dispatch_id: result.dispatch.dispatchId,
        ...actorMarkerToTelemetryPayload(marker),
      }, body.targetUserId).catch(() => undefined);

      return NextResponse.json({
        ...CREATOR_AGREEMENT_ROUTE_EVIDENCE,
        success: true,
        dispatch: result.dispatch,
        creatorApplication: result.after,
      });
    }

    if (body.action === "countersign_agreement") {
      if (!body.targetUserId) {
        return buildJsonResponse(400, "Select a creator before countersigning.");
      }

      const marker = assertKnownActor(buildAdminOnBehalfMarker(
        buildAdminActor({ uid: caller.uid, email: caller.email, isOwner: isOwnerActor }),
        body.targetUserId,
        {
          surface: "admin_roster",
          route: "/api/admin/creator-agreements",
          actionKey: "admin_creator_agreement_countersigned",
          source: "admin_creator_agreements_route",
          performedAs: "admin_on_behalf",
          targetCreatorId: body.targetUserId,
        },
      ));
      const result = await countersignCreatorAgreementDispatch({
        targetUserId: body.targetUserId,
        actor: buildCreatorOnboardingActorFromMarker(marker),
        signerUid: caller.uid,
        signerEmail: caller.email,
        signerName: caller.email ?? caller.uid,
        signerIp: readRequestIp(request),
        signerUserAgent: request.headers.get("user-agent"),
      });

      await trackServerEvent("admin_creator_agreement_countersigned", {
        page_path: "/admin/roster",
        template_id: result.template.templateId,
        agreement_version: result.template.agreementVersion,
        agreement_hash: result.template.agreementHash,
        dispatch_id: result.dispatch.dispatchId,
        ...actorMarkerToTelemetryPayload(marker),
      }, body.targetUserId).catch(() => undefined);

      return NextResponse.json({
        ...CREATOR_AGREEMENT_ROUTE_EVIDENCE,
        success: true,
        dispatch: result.dispatch,
        signature: result.signature,
        creatorApplication: result.after,
      });
    }

    return buildJsonResponse(400, "Unknown agreement action.");
  } catch (error) {
    return handleApiError(error, "Admin.CreatorAgreements.POST");
  }
}

export let GET = withRouteRuntimeHealth("admin/creator-agreements:GET", GET_handler);
export let POST = withRouteRuntimeHealth("admin/creator-agreements:POST", POST_handler);

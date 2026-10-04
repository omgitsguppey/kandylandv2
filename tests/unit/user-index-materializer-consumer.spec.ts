import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  requestedLimit: 0,
  factLimit: 0,
  requestIds: Array.from({ length: 80 }, (_, index) => `request_${index}`),
  timelineFacts: [] as Array<Record<string, unknown>>,
  lineageDocs: [] as Array<Record<string, unknown>>,
  queryLog: [] as Array<Record<string, unknown>>,
  documents: new Map<string, Record<string, unknown>>(),
  rejectNextCommit: false,
  claimUserIndexMaterializerRequest: vi.fn(async (): Promise<unknown> => null),
  publishUserIndexMaterializerBundle: vi.fn(async () => true),
}));

vi.mock("@/lib/server/firebase-admin", () => ({
  adminDb: {
    async runTransaction(callback: (transaction: any) => Promise<unknown>) {
      const staged: Array<{ref:any;value:Record<string,unknown>;merge:boolean}> = [];
      const result = await callback({
        get: async (ref:any) => ref.get(),
        set: (ref:any,value:Record<string,unknown>,options?:{merge?:boolean}) => staged.push({ref,value,merge:options?.merge===true}),
      });
      if (mockState.rejectNextCommit) {mockState.rejectNextCommit=false;throw new Error("unavailable: controlled transaction commit failure");}
      for (const {ref,value,merge} of staged) mockState.documents.set(ref.path,merge?{...mockState.documents.get(ref.path),...value}:value);
      return result;
    },
    collection(collectionName: string) {
      let limit = 0;
      const filters: Array<{field:string; operator:string; value:unknown}> = [];
      const query = {
        doc(id:string) {
          const documentPath = collectionName+"/"+id;
          return {path:documentPath,get:async()=>({exists:mockState.documents.has(documentPath),data:()=>structuredClone(mockState.documents.get(documentPath))}),
            set:async(value:Record<string,unknown>,options?:{merge?:boolean})=>mockState.documents.set(documentPath,options?.merge?{...mockState.documents.get(documentPath),...value}:value)};
        },
        where: vi.fn((field:string, operator:string, value:unknown) => { filters.push({field,operator,value}); return query; }),
        orderBy: vi.fn(() => query),
        limit: vi.fn((value:number) => {
          limit = value;
          if (collectionName === "behavioral_timeline_facts") mockState.factLimit = value;
          if (collectionName === "user_index_materializer_requests") mockState.requestedLimit = value;
          return query;
        }),
        get: vi.fn(async () => {
          const rows = collectionName === "behavioral_timeline_facts" ? mockState.timelineFacts : collectionName === "identity_lineage_indexes" ? mockState.lineageDocs : [];
          const filtered = rows.filter(row => filters.every(({field,operator,value}) => operator === "==" ? row[field] === value : operator === "in" ? (value as unknown[]).includes(row[field]) : operator === ">=" ? Number(row[field]) >= Number(value) : operator === "<=" ? Number(row[field]) <= Number(value) : false));
          const selected = filtered.slice(0,limit);
          mockState.queryLog.push({collectionName,filters:[...filters],limit,returned:selected.length,available:filtered.length});
          return {docs: collectionName === "user_index_materializer_requests" ? mockState.requestIds.slice(0,limit).map(id=>({id})) : selected.map(data=>({id:collectionName+"_"+rows.indexOf(data),data:()=>data}))};
        }),
      };
      return query;
    },
  },
}));

vi.mock("@/lib/server/user-index-writer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/user-index-writer")>();
  return ({
  claimUserIndexMaterializerRequest: mockState.claimUserIndexMaterializerRequest,
  deriveUserIndexMaterializerWindowReceipt: actual.deriveUserIndexMaterializerWindowReceipt,
  enqueueUserIndexMaterializerRequests: vi.fn(async () => ({ created: 0, requeued: 0, coalesced: 0 })),
  failUserIndexMaterializerRequest: vi.fn(async () => true),
  publishUserIndexMaterializerBundle: mockState.publishUserIndexMaterializerBundle,
  writeUserIndexMaterializerWindowReceipt: vi.fn(async () => undefined),
});});

import {
  buildUserIndexMaterializerRequests,
  consumeUserIndexMaterializerOutbox,
} from "@/lib/server/user-index-materializer";
import { USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE } from "@/lib/user-indexes/user-tracking-index-contract";

describe("user index materializer consumer bounds", () => {
  beforeEach(() => {
    mockState.requestedLimit = 0;
    mockState.factLimit = 0;
    mockState.requestIds = Array.from({ length: 80 }, (_, index) => `request_${index}`);
    mockState.timelineFacts = [];
    mockState.lineageDocs = [];
    mockState.queryLog = [];
    mockState.documents.clear();
    mockState.rejectNextCommit=false;
    mockState.claimUserIndexMaterializerRequest.mockReset().mockResolvedValue(null);
    mockState.publishUserIndexMaterializerBundle.mockReset().mockResolvedValue(true);
  });

  it("examines at most 5 requests including stale or non-claimable candidates", async () => {
    const result = await consumeUserIndexMaterializerOutbox({
      mode: "shadow",
      sourceFingerprint: "source_a",
      maxRequests: 5_000,
      runtimeCapMs: 30_000,
      workerId: "worker_a",
    });

    expect(result.status).toBe("no_work");
    expect(mockState.requestedLimit).toBe(5);
    expect(mockState.claimUserIndexMaterializerRequest).toHaveBeenCalledTimes(5);
  });

  it("publishes a capped shadow subject as explicit partial evidence", async () => {
    const request = buildUserIndexMaterializerRequests({
      userIds: ["user_1"],
      sourceFingerprint: "source_a",
      sourceWindowStartMs: 0,
      sourceWindowEndMs: 10,
      requestedAtMs: 1_000,
      maxFacts: 2,
    })[0];
    mockState.requestIds = [request.requestId];
    mockState.claimUserIndexMaterializerRequest.mockResolvedValue({
      ...request,
      state: "leased",
      leaseOwner: "worker_a",
      leaseExpiresAtMs: Date.now() + 30_000,
    });
    mockState.timelineFacts = [1, 2].map((timestampMs) => ({
      factId: `fact_${timestampMs}`,
      actorType: "user",
      actorUserId: "user_1",
      sessionId: "session_1",
      normalizedAction: "drop_viewed",
      eventName: "drop_viewed",
      timestampMs,
      route: "/drops/drop_1",
      sourceComponent: "test",
      surface: "user",
      target: { dropId: "drop_1" },
      sourceTruth: "client",
      sourceReliability: 0.8,
      consentState: "granted",
      metricEligible: true,
      confidenceInputs: {
        schemaComplete: true,
        hasActor: true,
        hasTargetWhenRequired: true,
        hasSession: true,
        hasServerTruth: false,
      },
    }));

    const result = await consumeUserIndexMaterializerOutbox({
      mode: "shadow",
      sourceFingerprint: "source_a",
      maxRequests: 1,
      maxFactsPerSubject: 2,
      runtimeCapMs: 30_000,
      workerId: "worker_a",
    });

    expect(mockState.publishUserIndexMaterializerBundle).toHaveBeenCalledWith(expect.objectContaining({
      mode: "shadow",
      factsRead: 2,
      isPotentiallyTruncated: true,
    }));
    expect(result.receipt?.truncatedSubjectCount).toBe(1);
    expect(result.issueCodes).toContain(USER_INDEX_MATERIALIZER_SUBJECT_TRUNCATED_ISSUE_CODE);
  });
});

import { ANALYTICS_IDENTITY_LINEAGE_OWNER_VERSION as lineageOwnerVersion } from "@/lib/analytics/identity-link-contract";
import { RUNTIME_FACT_REQUEST_CONSENT_ADMISSION_VERSION as sourceAdmissionVersion } from "@/lib/runtime-facts/runtime-fact-contract";

import { USER_INDEX_MATERIALIZER_MAX_LINKED_GUEST_SUBJECTS as linkedGuestCap, USER_INDEX_MATERIALIZER_MAX_LINEAGES_PER_QUERY as rawLineageCap } from "@/lib/user-indexes/user-tracking-index-contract";

describe("Audience lineage coverage source-gap probe", () => {
  const eligibleLineage = (userId:string, guestId:string, id:string) => ({ identityLinkId:id, ownerKeyVersion:lineageOwnerVersion, userId, anonymousVisitorId:guestId, sessionIds:["session_1"], linkedAtMs:900, updatedAtMs:1000, consentState:"granted", consentMode:"full_behavioral", mergeAllowed:true, personLevelBehaviorAllowed:true, confidence:1, linkageConfidenceSource:"full_behavioral_consent" });
  async function publishObserved(lineages:Array<Record<string,unknown>>, guestId?:string) {
    mockState.lineageDocs = lineages;
    mockState.queryLog = [];
    mockState.publishUserIndexMaterializerBundle.mockClear();
    const request = buildUserIndexMaterializerRequests({userIds:["user_1"], sourceFingerprint:"source_a",sourceWindowStartMs:0,sourceWindowEndMs:10_000,requestedAtMs:1000,maxFacts:200})[0];
    mockState.requestIds=[request.requestId];
    mockState.claimUserIndexMaterializerRequest.mockResolvedValue({...request,state:"leased",leaseOwner:"worker_a",leaseExpiresAtMs:Date.now()+30_000});
    mockState.timelineFacts=[{factId:"observed_1",actorType:"user",actorUserId:"user_1",anonymousVisitorId:guestId,sessionId:"session_1",normalizedAction:"page_viewed",eventName:"page_viewed",timestampMs:1000,route:"/dashboard",sourceComponent:"existing-source-probe",surface:"user",target:{},sourceTruth:"client",sourceReliability:0.8,consentState:"granted",requestConsentAdmission:{version:sourceAdmissionVersion,consentMode:"full_behavioral"},includeInGlobalEvents:true,includeInPersonMetrics:true,metricEligible:true,confidenceInputs:{schemaComplete:true,hasActor:true,hasTargetWhenRequired:true,hasSession:true,hasServerTruth:false}}];
    const result=await consumeUserIndexMaterializerOutbox({mode:"shadow",sourceFingerprint:"source_a",maxRequests:1,maxFactsPerSubject:200,runtimeCapMs:30_000,workerId:"worker_a"});
    const publication=mockState.publishUserIndexMaterializerBundle.mock.calls.at(-1)?.[0] as any;
    expect(publication).toBeTruthy();
    expect(publication.factsRead).toBeLessThan(200);
    return {publication,result,queries:[...mockState.queryLog]};
  }
  it("marks the canonical user-lineage cutoff as incomplete even when fact rows remain below cap", async () => {
    const {publication,queries}=await publishObserved(Array.from({length:linkedGuestCap+1},(_,i)=>eligibleLineage("user_1","guest_"+i,"link_"+i)));
    expect(queries).toContainEqual(expect.objectContaining({collectionName:"identity_lineage_indexes",limit:linkedGuestCap,returned:linkedGuestCap,available:linkedGuestCap+1}));
    expect(publication.isPotentiallyTruncated).toBe(true);
  });
  it("marks50 raw guest-lineage rows incomplete before dropping unsupported owner versions", async () => {
    const rows=[eligibleLineage("user_1","guest_shared","link_current"),...Array.from({length:rawLineageCap-1},(_,i)=>({...eligibleLineage("historical_"+i,"guest_shared","link_historical_"+i),ownerKeyVersion:undefined})),eligibleLineage("user_2","guest_shared","link_conflicting")];
    const {publication,queries}=await publishObserved(rows,"guest_shared");
    expect(queries).toContainEqual(expect.objectContaining({collectionName:"identity_lineage_indexes",limit:rawLineageCap,returned:rawLineageCap,available:rawLineageCap+1}));
    expect(publication.isPotentiallyTruncated).toBe(true);
  });
  it("reads overlapping direct and discovered guest lineage only once", async () => {
    const {publication,queries}=await publishObserved([eligibleLineage("user_1","guest_shared","link_shared")],"guest_shared");
    const guestQueries=queries.filter((query:any)=>query.collectionName === "identity_lineage_indexes" && query.filters.some((filter:any)=>filter.field === "anonymousVisitorId"));
    expect(guestQueries).toHaveLength(1);
    expect(publication.isPotentiallyTruncated).toBe(false);
    expect(publication.bundle.trackingIndex.actionCounts.total).toBe(1);
  });
  it("retains rejected lineage source as unavailable even below query cutoff", async () => {
    const {publication}=await publishObserved([{...eligibleLineage("user_1","guest_1","old_link"),ownerKeyVersion:undefined}]);
    expect(publication.bundle.trackingIndex.dataAvailabilityReason).toBe("source_disagreement");
    expect(publication.exclusions.lineageSourceMissingCount).toBeGreaterThan(0);
  });
  it("rejects malformed current lineage without repeated reader failure", async () => {
    const {publication,result}=await publishObserved([{...eligibleLineage("user_1","guest_1","broken_link"),sessionIds:null}]);
    expect(publication.bundle.trackingIndex.dataAvailabilityReason).toBe("source_disagreement");
    expect(publication.exclusions.lineageSourceMissingCount).toBeGreaterThan(0);
    expect(result.receipt?.requestsFailed).toBe(0);
  });
  it("counts one rejected physical lineage once across discovery and guest lookup", async () => {
    const rows=[eligibleLineage("user_1","guest_shared","current_link"),{...eligibleLineage("user_1","guest_shared","old_link"),ownerKeyVersion:undefined}];
    const {publication}=await publishObserved(rows,"guest_shared");
    expect(publication.exclusions.lineageSourceMissingCount).toBe(1);
  });
  it("retains a complete below-cap lineage window and admitted direct actor", async () => {
    const {publication,queries}=await publishObserved(Array.from({length:4},(_,i)=>eligibleLineage("user_1","guest_"+i,"link_"+i)));
    expect(queries).toContainEqual(expect.objectContaining({collectionName:"identity_lineage_indexes",limit:linkedGuestCap,returned:4,available:4}));
    expect(publication.isPotentiallyTruncated).toBe(false);
    expect(publication.bundle.trackingIndex.actionCounts.total).toBe(1);
    expect(publication.bundle.trackingIndex.dataAvailabilityReason).toBe("available");
  });
});

import { USER_INDEX_COLLECTIONS, USER_INDEX_MATERIALIZER_CONTRACT_VERSION, USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID } from "@/lib/user-indexes/user-tracking-index-contract";
import { buildIndividualUserMetricSourceTruth } from "@/lib/identity-truth/individual-user-metric-truth";

describe("Audience actual publisher persisted recovery", () => {
  beforeEach(()=>{
    mockState.documents.clear();mockState.rejectNextCommit=false;mockState.queryLog=[];mockState.lineageDocs=[];mockState.timelineFacts=[];
    mockState.publishUserIndexMaterializerBundle.mockReset().mockResolvedValue(true);
    mockState.claimUserIndexMaterializerRequest.mockReset().mockResolvedValue(null);
  });
  function currentFact(overrides:Record<string,unknown>={}) {
    return {factId:"current_fact",actorType:"user",actorUserId:"user_1",sessionId:"session_1",normalizedAction:"page_viewed",eventName:"page_viewed",timestampMs:Date.now()-500,
      route:"/dashboard",sourceComponent:"existing-persisted-owner-proof",surface:"user",target:{},sourceTruth:"client",sourceReliability:0.8,consentState:"granted",
      requestConsentAdmission:{version:sourceAdmissionVersion,consentMode:"full_behavioral"},includeInGlobalEvents:true,includeInPersonMetrics:true,metricEligible:true,
      confidenceInputs:{schemaComplete:true,hasActor:true,hasTargetWhenRequired:true,hasSession:true,hasServerTruth:false},...overrides};
  }
  function seedLease() {
    const now=Date.now();
    const request=buildUserIndexMaterializerRequests({userIds:["user_1"],sourceFingerprint:"source_a",sourceWindowStartMs:now-1000,sourceWindowEndMs:now,requestedAtMs:now,maxFacts:200})[0];
    const leased={...request,state:"leased" as const,leaseOwner:"worker_a",leaseExpiresAtMs:now+30000};
    mockState.requestIds=[request.requestId];
    mockState.claimUserIndexMaterializerRequest.mockResolvedValue(leased);
    mockState.documents.set(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests+"/"+request.requestId,leased);
    mockState.documents.set(USER_INDEX_COLLECTIONS.userIndexMaterializerState+"/"+USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID,{documentId:USER_INDEX_MATERIALIZER_ACTIVATION_DOCUMENT_ID,sourceFingerprint:"source_a",materializerVersion:USER_INDEX_MATERIALIZER_CONTRACT_VERSION,
      consecutiveCleanShadowWindowIds:["clean_1","clean_2"],latestShadowWindowId:"clean_2",latestShadowCompletedAtMs:now,latestShadowWindowClean:true,updatedAtMs:now});
    return leased;
  }
  async function reopenedProjection() {
    const {adminDb}=await import("@/lib/server/firebase-admin");
    const snapshot=await adminDb!.collection(USER_INDEX_COLLECTIONS.userTrackingIndexes).doc("user_1").get();
    expect(snapshot.exists).toBe(true);
    const index=snapshot.data() as any;
    const truth=buildIndividualUserMetricSourceTruth({requestedUserId:"user_1",materializedUserId:index.userId,materializedSourceTruth:index.sourceTruth,currentConsentMode:"full_behavioral",directUserSourceCount:0,displayedUserCount:0,identityLinkCount:0,materializerDocumentPresent:true,materializedUserCount:index.actionCounts.total,
      materializedDataAvailabilityReason:index.dataAvailabilityReason,sourceWindowStartMs:index.sourceWindowStartMs,sourceWindowEndMs:index.sourceWindowEndMs,materializerMetadata:index.materializer,currentSourceFingerprint:"source_a",evaluatedAtMs:Date.now()});
    return {index,truth};
  }
  async function publishCurrent(facts:Array<Record<string,unknown>>,lineages:Array<Record<string,unknown>>=[]) {
    mockState.timelineFacts=facts;mockState.lineageDocs=lineages;
    const leased=seedLease();
    const actual=await vi.importActual<typeof import("@/lib/server/user-index-writer")>("@/lib/server/user-index-writer");
    mockState.publishUserIndexMaterializerBundle.mockImplementation(actual.publishUserIndexMaterializerBundle as any);
    const result=await consumeUserIndexMaterializerOutbox({mode:"active",sourceFingerprint:"source_a",maxRequests:1,maxFactsPerSubject:200,runtimeCapMs:30000,workerId:"worker_a"});
    expect(result.receipt?.requestsCompleted).toBe(1);expect(result.receipt?.requestsFailed).toBe(0);
    expect(mockState.publishUserIndexMaterializerBundle).toHaveBeenCalledTimes(1);
    expect(mockState.claimUserIndexMaterializerRequest).toHaveBeenCalledTimes(1);
    expect(mockState.documents.get(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests+"/"+leased.requestId)).toMatchObject({state:"completed",leaseOwner:null});
    return {...await reopenedProjection(),result};
  }
  it("persists and reopens unadmitted history as unavailable without retrying the completed request", async()=>{
    const {index,truth,result}=await publishCurrent([currentFact({requestConsentAdmission:undefined})]);
    expect(index).toMatchObject({dataAvailabilityReason:"source_disagreement",actionCounts:{total:0}});
    expect(truth).toMatchObject({provenZero:false,valuesDisplayable:false});
    expect(result.receipt?.clean).toBe(false);
    expect(truth.admittedActivity).toBeNull();
  });
  it.each(["minimal_analytics","full_analytics"] as const)("persists lawful %s privacy exclusion as clean and unavailable person data",async consentMode=>{
    const {index,truth,result}=await publishCurrent([currentFact({requestConsentAdmission:{version:sourceAdmissionVersion,consentMode},consentState:"partial",includeInPersonMetrics:false})]);
    expect(index).toMatchObject({dataAvailabilityReason:"privacy_limited",actionCounts:{total:0}});
    expect(truth).toMatchObject({state:"permission_blocked",provenZero:false,valuesDisplayable:false,admittedActivity:null,admittedActivityUnavailableReason:"privacy_limited"});
    expect(result.receipt?.clean).toBe(true);
  });
  it("reopens a complete empty admitted window as a fresh zero without a raw fallback",async()=>{
    const {index,truth,result}=await publishCurrent([]);
    expect(index).toMatchObject({dataAvailabilityReason:"available",actionCounts:{total:0}});
    expect(truth).toMatchObject({state:"proven_zero",provenZero:true,valuesDisplayable:false,admittedActivity:{userId:"user_1",recordCount:0,sourceWindowStartMs:index.sourceWindowStartMs,sourceWindowEndMs:index.sourceWindowEndMs}});
    expect(result.receipt?.clean).toBe(true);
  });
  it("persists a valid current user action but keeps projection hydration separate",async()=>{
    const {index,truth}=await publishCurrent([currentFact()]);
    expect(index).toMatchObject({dataAvailabilityReason:"available",actionCounts:{total:1},personMetricCounts:{page_views:1}});
    expect(truth).toMatchObject({state:"bridge_missing",provenZero:false,valuesDisplayable:false,admittedActivity:{userId:"user_1",recordCount:1,sourceWindowStartMs:index.sourceWindowStartMs,sourceWindowEndMs:index.sourceWindowEndMs}});
  });
  it("preserves trusted necessary server operation projection without requiring an HTTP marker",async()=>{
    const {index}=await publishCurrent([currentFact({requestConsentAdmission:undefined,sourceTruth:"server",consentState:"not_required",eventName:"gumdrops_purchased",normalizedAction:"gumdrops_purchased"})]);
    expect(index).toMatchObject({dataAvailabilityReason:"available",actionCounts:{total:1,purchase:1}});
  });
  it("keeps a transaction commit failure from replacing verified state and permits the next valid publication",async()=>{
    const leased=seedLease();mockState.timelineFacts=[currentFact()];
    await consumeUserIndexMaterializerOutbox({mode:"shadow",sourceFingerprint:"source_a",maxRequests:1,maxFactsPerSubject:200,runtimeCapMs:30000,workerId:"worker_a"});
    const publication=mockState.publishUserIndexMaterializerBundle.mock.calls.at(-1)?.[0] as any;
    const actual=await vi.importActual<typeof import("@/lib/server/user-index-writer")>("@/lib/server/user-index-writer");
    const indexPath=USER_INDEX_COLLECTIONS.userTrackingIndexes+"/user_1";
    mockState.documents.set(indexPath,{verifiedPrior:true,actionCounts:{total:4}});
    mockState.rejectNextCommit=true;
    await expect(actual.publishUserIndexMaterializerBundle({...publication,request:leased,mode:"active"})).rejects.toThrow("controlled transaction commit failure");
    expect(mockState.documents.get(indexPath)).toEqual({verifiedPrior:true,actionCounts:{total:4}});
    expect(mockState.documents.get(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests+"/"+leased.requestId)?.state).toBe("leased");
    expect(await actual.publishUserIndexMaterializerBundle({...publication,request:leased,mode:"active"})).toBe(true);
    const reopened=await reopenedProjection();
    expect(reopened.index).toMatchObject({actionCounts:{total:1},dataAvailabilityReason:"available",materializer:{materializerVersion:USER_INDEX_MATERIALIZER_CONTRACT_VERSION,sourceFingerprint:"source_a"}});
    expect(reopened.truth.admittedActivity).toMatchObject({userId:"user_1",recordCount:1});
  });
  it("refuses stale semantic publication and retains the previous stored index",async()=>{
    const leased=seedLease();mockState.timelineFacts=[currentFact()];
    await consumeUserIndexMaterializerOutbox({mode:"shadow",sourceFingerprint:"source_a",maxRequests:1,maxFactsPerSubject:200,runtimeCapMs:30000,workerId:"worker_a"});
    const publication=mockState.publishUserIndexMaterializerBundle.mock.calls.at(-1)?.[0] as any;
    const actual=await vi.importActual<typeof import("@/lib/server/user-index-writer")>("@/lib/server/user-index-writer");
    const old={...leased,materializerVersion:"2026.07.user-index-materializer.v3"};
    mockState.documents.set(USER_INDEX_COLLECTIONS.userIndexMaterializerRequests+"/"+leased.requestId,old);
    const indexPath=USER_INDEX_COLLECTIONS.userTrackingIndexes+"/user_1";mockState.documents.set(indexPath,{verifiedPrior:true});
    expect(await actual.publishUserIndexMaterializerBundle({...publication,request:old,mode:"active"})).toBe(false);
    expect(mockState.documents.get(indexPath)).toEqual({verifiedPrior:true});
  });
});

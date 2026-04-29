import { resolveAnalyticsSemanticContext as resolveAppSemanticContext } from "../src/lib/analytics-semantics";
import { resolveAnalyticsSemanticContext as resolveFunctionsSemanticContext } from "../functions/src/analytics-semantics";

type SemanticSample = {
  label: string;
  pagePath?: string | null;
  dropId?: string | null;
  dropCategory?: string | null;
  semanticCategory?: string | null;
  semanticCategoryLabel?: string | null;
  semanticScopeKey?: string | null;
  semanticScopeLabel?: string | null;
  semanticSurfaceKey?: string | null;
  semanticSurfaceLabel?: string | null;
};

const SAMPLES: SemanticSample[] = [
  { label: "home", pagePath: "/" },
  { label: "creator apply", pagePath: "/creators/apply" },
  { label: "creator waitlist", pagePath: "/creators/waitlist" },
  { label: "faq", pagePath: "/faq" },
  { label: "dashboard", pagePath: "/dashboard" },
  { label: "library", pagePath: "/dashboard/library" },
  { label: "experiences", pagePath: "/experiences" },
  { label: "drops catalog", pagePath: "/drops" },
  { label: "drop viewer", pagePath: "/dashboard/viewer", dropId: "drop_123" },
  { label: "admin analytics", pagePath: "/admin/analytics" },
  { label: "admin ai", pagePath: "/admin/ai" },
  { label: "admin privacy", pagePath: "/admin/privacy" },
  { label: "admin support", pagePath: "/admin/support" },
  { label: "admin roster", pagePath: "/admin/users" },
  {
    label: "stamped semantic context",
    pagePath: "/custom",
    semanticCategory: "user",
    semanticCategoryLabel: "User",
    semanticScopeKey: "custom_scope",
    semanticScopeLabel: "Custom scope",
    semanticSurfaceKey: "custom_surface",
    semanticSurfaceLabel: "Custom surface",
  },
];

const mismatches: string[] = [];

SAMPLES.forEach((sample) => {
  const appContext = resolveAppSemanticContext(sample);
  const functionsContext = resolveFunctionsSemanticContext(sample);

  const fieldsToCompare = [
    "category",
    "categoryLabel",
    "scopeKey",
    "scopeLabel",
    "surfaceKey",
    "surfaceLabel",
    "pagePath",
  ] as const;

  fieldsToCompare.forEach((field) => {
    if (appContext[field] !== functionsContext[field]) {
      mismatches.push(`${sample.label}: ${field} mismatch (${String(appContext[field])} !== ${String(functionsContext[field])})`);
    }
  });
});

if (mismatches.length > 0) {
  console.error("Analytics semantic contract mismatches:");
  mismatches.forEach((mismatch) => console.error(`- ${mismatch}`));
  process.exit(1);
}

console.log(`Analytics semantic contract passed for ${SAMPLES.length} samples.`);

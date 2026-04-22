import {
  installEarlyClientBootDiagnostics,
  recordRouterTransitionBreadcrumb,
} from "@/lib/client-boot-diagnostics";

installEarlyClientBootDiagnostics();

export function onRouterTransitionStart(url: string) {
  recordRouterTransitionBreadcrumb(url);
}

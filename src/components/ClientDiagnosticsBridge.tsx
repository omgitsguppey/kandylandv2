"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  installClientDiagnosticsBridge,
  recordClientBreadcrumb,
  recordClientDiagnostic,
} from "@/lib/client-diagnostics";

function DiagnosticsBridgeInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    installClientDiagnosticsBridge();
    recordClientDiagnostic("runtime", "Client diagnostics bridge ready");
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    recordClientBreadcrumb("route", pathname, {
      search: searchParams?.toString() || "",
    });
  }, [pathname, searchParams]);

  return null;
}

export function ClientDiagnosticsBridge() {
  return (
    <Suspense fallback={null}>
      <DiagnosticsBridgeInner />
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import {
  installClientDiagnosticsBridge,
  recordClientBreadcrumb,
  recordClientDiagnostic,
} from "@/lib/client-diagnostics";

export function ClientDiagnosticsBridge() {
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

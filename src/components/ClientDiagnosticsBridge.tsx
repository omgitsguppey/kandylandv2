"use client";

import { useEffect } from "react";

import { installClientDiagnosticsBridge, recordClientDiagnostic } from "@/lib/client-diagnostics";

export function ClientDiagnosticsBridge() {
  useEffect(() => {
    installClientDiagnosticsBridge();
    recordClientDiagnostic("runtime", "Client diagnostics bridge ready");
  }, []);

  return null;
}

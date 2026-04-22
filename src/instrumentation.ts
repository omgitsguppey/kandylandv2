export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    return;
  }
}

export async function onRequestError(
  error: Error,
  request: {
    method?: string;
    url?: string;
    headers?: Headers;
  },
  context: {
    routerKind?: string;
    routePath?: string;
    routeType?: string;
    renderSource?: string;
    renderType?: string;
  },
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { recordFrameworkRequestError } = await import("@/lib/server/framework-request-diagnostics");
  await recordFrameworkRequestError({
    error,
    request,
    context,
  });
}

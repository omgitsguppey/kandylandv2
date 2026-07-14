const DEFAULT_RESPONSE_LIMIT_BYTES = 64 * 1024
const DEFAULT_TIMEOUT_MS = 60_000
const MAX_ALLOWED_HOSTS = 10

export class ScheduledHttpError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = "ScheduledHttpError"
    this.code = code
  }
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function hasExactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!isPlainRecord(value)) return false
  const actualKeys = Object.keys(value).sort()
  const expectedKeys = [...keys].sort()
  return actualKeys.length === expectedKeys.length && actualKeys.every((key, index) => key === expectedKeys[index])
}

export function isNonNegativeInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum
}

export function isCanonicalCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_:-]{1,80}$/u.test(value)
}

function isLoopbackHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  return normalized === "localhost" || normalized === "::1" || normalized.startsWith("127.")
}

function normalizeAllowedHost(value: string) {
  const candidate = value.trim().toLowerCase()
  if (!candidate || candidate.includes("://") || /[/?#@]/u.test(candidate)) {
    throw new ScheduledHttpError("scheduled_allowed_hosts_invalid")
  }
  let url: URL
  try {
    url = new URL(`https://${candidate}/`)
  } catch {
    throw new ScheduledHttpError("scheduled_allowed_hosts_invalid")
  }
  const canonicalHostname = url.hostname.toLowerCase()
  const unbracketedHostname = canonicalHostname.replace(/^\[|\]$/g, "")
  if (
    url.username
    || url.password
    || url.port
    || url.pathname !== "/"
    || url.search
    || url.hash
    || (candidate !== canonicalHostname && candidate !== unbracketedHostname && candidate !== `[${unbracketedHostname}]`)
  ) {
    throw new ScheduledHttpError("scheduled_allowed_hosts_invalid")
  }
  return canonicalHostname
}

export function parseScheduledAllowedHosts(value: string) {
  const entries = value.split(",").map((entry) => entry.trim())
  if (entries.length === 0 || entries.length > MAX_ALLOWED_HOSTS || entries.some((entry) => !entry)) {
    throw new ScheduledHttpError(value.trim() ? "scheduled_allowed_hosts_invalid" : "scheduled_allowed_hosts_missing")
  }
  return Array.from(new Set(entries.map(normalizeAllowedHost))).sort()
}

export type ScheduledEndpointPolicy = {
  allowedHosts: readonly string[]
  expectedPath: string
  allowLoopback?: boolean
}

export function validateScheduledEndpoint(endpoint: string, policy: ScheduledEndpointPolicy) {
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new ScheduledHttpError("scheduled_endpoint_invalid")
  }
  const loopback = isLoopbackHostname(url.hostname)
  if (url.username || url.password) {
    throw new ScheduledHttpError("scheduled_endpoint_credentials_disallowed")
  }
  if (url.search || url.href.includes("?")) {
    throw new ScheduledHttpError("scheduled_endpoint_query_disallowed")
  }
  if (url.hash || url.href.includes("#")) {
    throw new ScheduledHttpError("scheduled_endpoint_fragment_disallowed")
  }
  if (url.pathname !== policy.expectedPath) {
    throw new ScheduledHttpError("scheduled_endpoint_path_disallowed")
  }
  if (loopback && !policy.allowLoopback) {
    throw new ScheduledHttpError("scheduled_endpoint_loopback_disallowed")
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback && policy.allowLoopback)) {
    throw new ScheduledHttpError("scheduled_endpoint_insecure")
  }
  if (url.port && !(loopback && policy.allowLoopback)) {
    throw new ScheduledHttpError("scheduled_endpoint_port_disallowed")
  }
  const allowedHosts = policy.allowedHosts.map(normalizeAllowedHost)
  if (allowedHosts.length === 0 || !allowedHosts.includes(url.hostname.toLowerCase())) {
    throw new ScheduledHttpError("scheduled_endpoint_host_disallowed")
  }
  return url.toString()
}

async function readBoundedResponseBody(response: Response, maxBytes: number) {
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const {done, value} = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel("scheduled_response_too_large").catch(() => undefined)
      throw new ScheduledHttpError("scheduled_response_too_large")
    }
    chunks.push(value)
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder("utf-8", {fatal: true}).decode(body)
}

export async function requestScheduledJson<T>(input: {
  endpoint: string
  token: string
  method?: "GET" | "POST"
  body?: Record<string, unknown>
  signal: AbortSignal
  timeoutMs?: number
  responseLimitBytes?: number
  authHeader?: "authorization_bearer" | "x-kandydrops-scheduler-token"
  allowedHosts: readonly string[]
  expectedPath: string
  allowLoopback?: boolean
}) {
  const endpoint = validateScheduledEndpoint(input.endpoint, {
    allowedHosts: input.allowedHosts,
    expectedPath: input.expectedPath,
    allowLoopback: input.allowLoopback,
  })
  const endpointUrl = new URL(endpoint)
  const localTestEndpoint = isLoopbackHostname(endpointUrl.hostname)
  const token = input.token.trim()
  if (localTestEndpoint && token) {
    throw new ScheduledHttpError("scheduled_loopback_token_disallowed")
  }
  if (!localTestEndpoint && !token) {
    throw new ScheduledHttpError("scheduled_token_missing")
  }
  const controller = new AbortController()
  const abortFromParent = () => controller.abort(input.signal.reason)
  if (input.signal.aborted) abortFromParent()
  input.signal.addEventListener("abort", abortFromParent, {once: true})
  const timeout = setTimeout(
    () => controller.abort(new ScheduledHttpError("scheduled_request_timeout")),
    Math.max(1_000, input.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  )

  try {
    const method = input.method ?? "POST"
    const response = await fetch(endpoint, {
      method,
      headers: {
        "content-type": "application/json",
        ...(token
          ? input.authHeader === "x-kandydrops-scheduler-token"
            ? {"x-kandydrops-scheduler-token": token}
            : {authorization: `Bearer ${token}`}
          : {}),
      },
      ...(method === "POST" ? {body: JSON.stringify(input.body ?? {})} : {}),
      signal: controller.signal,
      redirect: "manual",
    })
    if (response.status >= 300 && response.status < 400) {
      throw new ScheduledHttpError("scheduled_redirect_disallowed")
    }
    if (response.redirected) {
      throw new ScheduledHttpError("scheduled_redirect_disallowed")
    }
    if (response.url && new URL(response.url).origin !== endpointUrl.origin) {
      throw new ScheduledHttpError("scheduled_response_origin_mismatch")
    }
    const body = await readBoundedResponseBody(
      response,
      Math.max(1_024, input.responseLimitBytes ?? DEFAULT_RESPONSE_LIMIT_BYTES),
    )
    let payload: unknown = {}
    if (body) {
      try {
        payload = JSON.parse(body)
      } catch {
        throw new ScheduledHttpError("scheduled_response_malformed")
      }
    }
    if (!response.ok) {
      throw new ScheduledHttpError(`scheduled_http_${response.status}`)
    }
    return payload as T
  } catch (error) {
    if (controller.signal.aborted && !input.signal.aborted) {
      throw new ScheduledHttpError("scheduled_request_timeout")
    }
    if (input.signal.aborted) {
      throw new ScheduledHttpError("scheduled_job_timeout")
    }
    throw error
  } finally {
    clearTimeout(timeout)
    input.signal.removeEventListener("abort", abortFromParent)
  }
}

export function postScheduledJson<T>(input: {
  endpoint: string
  token: string
  body: Record<string, unknown>
  signal: AbortSignal
  timeoutMs?: number
  responseLimitBytes?: number
  authHeader?: "authorization_bearer" | "x-kandydrops-scheduler-token"
  allowedHosts: readonly string[]
  expectedPath: string
  allowLoopback?: boolean
}) {
  return requestScheduledJson<T>({...input, method: "POST"})
}

// The one place that talks HTTP. Every failure becomes an ApiError with the
// server's error code, so components can react to "VERSION_CONFLICT" etc.
// instead of parsing messages.

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  readonly details?: Record<string, unknown>

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
    details?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
    this.details = details
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  signal?: AbortSignal
}

export async function api<T>(path: string, { method = 'GET', body, signal }: RequestOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin', // send the httpOnly login cookie
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.')
  }

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => null)

  // 502/503/504 come from a proxy when our API is down or restarting - not from our API itself.
  if ([502, 503, 504].includes(res.status)) {
    throw new ApiError(res.status, 'SERVER_UNAVAILABLE', 'The server is not responding right now. Please try again in a moment.')
  }
  if (!res.ok) {
    const e = data?.error
    throw new ApiError(
      res.status,
      e?.code ?? 'UNKNOWN_ERROR',
      e?.message ?? `Request failed (${res.status}). Please try again.`,
      e?.fields,
      e?.details,
    )
  }
  return data as T
}

export const isApiError = (err: unknown, code?: string): err is ApiError =>
  err instanceof ApiError && (code === undefined || err.code === code)

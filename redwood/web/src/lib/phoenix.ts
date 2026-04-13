declare const process: { env: { PHOENIX_URL?: string } }

const getPhoenixUrl = (): string => {
  // Runtime override: index.html can set `window.__PHOENIX_URL__` for
  // remote/tunnel access. Otherwise fall back to the build-time value
  // Redwood stamps into the bundle from process.env.PHOENIX_URL
  // (whitelisted in redwood.toml [web].includeEnvironmentVariables).
  // Direct dot-access is required — optional chaining (`process?.env?.X`)
  // compiles to `process == null ? void 0 : ...` which Redwood's
  // string-replace transform does NOT match, leaving a live `process`
  // reference that crashes the browser with "process is not defined".
  if (typeof window !== 'undefined') {
    return (window as any).__PHOENIX_URL__ || process.env.PHOENIX_URL || ''
  }
  return process.env.PHOENIX_URL || 'http://localhost:4000'
}

export const phoenixUrl = getPhoenixUrl()

export const phoenixGql = async (query: string, variables?: Record<string, any>) => {
  const url = phoenixUrl ? `${phoenixUrl}/api/graphql` : '/api/graphql'
  const res = await fetch(url, {
    method: 'POST',
    // credentials: 'include' so the signed session cookie rides with every
    // GraphQL request — the Phoenix :api pipeline rejects unauthenticated
    // callers with 401 via RequireOwner.
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  if (res.status === 401 || res.status === 403) {
    window.dispatchEvent(new CustomEvent('fyoa:session-revoked'))
    throw new Error(res.status === 401 ? 'unauthenticated' : 'forbidden')
  }
  const data = await res.json()
  if (data.errors) throw new Error(data.errors[0].message)
  return data
}

/** WebSocket URL for Absinthe subscriptions */
export const phoenixWsUrl = (() => {
  if (!phoenixUrl) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/socket`
  }
  return phoenixUrl.replace(/^http/, 'ws') + '/socket'
})()

const getPhoenixUrl = () => {
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
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

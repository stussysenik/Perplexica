const PHOENIX_URL =
  typeof window !== 'undefined'
    ? (window as any).__PHOENIX_URL__ || 'http://localhost:4000'
    : process.env.PHOENIX_URL || 'http://localhost:4000'

export const phoenixGql = async (query: string, variables?: Record<string, any>) => {
  const res = await fetch(`${PHOENIX_URL}/api/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const data = await res.json()
  if (data.errors) throw new Error(data.errors[0].message)
  return data
}

export const phoenixUrl = PHOENIX_URL

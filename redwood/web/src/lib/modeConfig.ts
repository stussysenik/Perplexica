import { useCallback, useEffect, useState } from 'react'

import { phoenixGql } from 'src/lib/phoenix'

export type ModeKey = 'speed' | 'balanced' | 'quality'

export interface ModeConfig {
  mode: ModeKey
  maxIterations: number
  budgetMs: number
}

const LIST_QUERY = `
  query ModeConfigsQuery {
    modeConfigs {
      mode
      maxIterations
      budgetMs
    }
  }
`

const UPDATE_MUTATION = `
  mutation UpdateModeConfigMutation(
    $mode: String!
    $maxIterations: Int!
    $budgetMs: Int!
  ) {
    updateModeConfig(
      mode: $mode
      maxIterations: $maxIterations
      budgetMs: $budgetMs
    ) {
      mode
      maxIterations
      budgetMs
    }
  }
`

const RESET_MUTATION = `
  mutation ResetModeConfigMutation($mode: String!) {
    resetModeConfig(mode: $mode) {
      mode
      maxIterations
      budgetMs
    }
  }
`

// Module-level subscribers so every mounted useModeConfigs() re-syncs
// after any mutation, regardless of which component triggered it.
const listeners = new Set<() => void>()
const notifyAll = () => listeners.forEach((fn) => fn())

export function useModeConfigs() {
  const [configs, setConfigs] = useState<ModeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const res = await phoenixGql(LIST_QUERY)
      setConfigs((res.data?.modeConfigs ?? []) as ModeConfig[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
    listeners.add(refetch)
    return () => {
      listeners.delete(refetch)
    }
  }, [refetch])

  return { configs, loading, error, refetch }
}

interface UpdateArgs {
  variables: { mode: string; maxIterations: number; budgetMs: number }
}

type UpdateFn = (args: UpdateArgs) => Promise<ModeConfig>

export function useUpdateModeConfig(): [UpdateFn] {
  const run = useCallback<UpdateFn>(async ({ variables }) => {
    const res = await phoenixGql(UPDATE_MUTATION, variables)
    notifyAll()
    return res.data.updateModeConfig as ModeConfig
  }, [])
  return [run]
}

interface ResetArgs {
  variables: { mode: string }
}

type ResetFn = (args: ResetArgs) => Promise<ModeConfig>

export function useResetModeConfig(): [ResetFn] {
  const run = useCallback<ResetFn>(async ({ variables }) => {
    const res = await phoenixGql(RESET_MUTATION, variables)
    notifyAll()
    return res.data.resetModeConfig as ModeConfig
  }, [])
  return [run]
}

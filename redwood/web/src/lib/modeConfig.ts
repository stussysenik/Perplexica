import { useMutation, useQuery } from '@redwoodjs/web'
import { gql } from '@apollo/client'

export type ModeKey = 'speed' | 'balanced' | 'quality'

export interface ModeConfig {
  mode: ModeKey
  maxIterations: number
  budgetMs: number
}

export const MODE_CONFIGS_QUERY = gql`
  query ModeConfigsQuery {
    modeConfigs {
      mode
      maxIterations
      budgetMs
    }
  }
`

export const UPDATE_MODE_CONFIG_MUTATION = gql`
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

export const RESET_MODE_CONFIG_MUTATION = gql`
  mutation ResetModeConfigMutation($mode: String!) {
    resetModeConfig(mode: $mode) {
      mode
      maxIterations
      budgetMs
    }
  }
`

export function useModeConfigs() {
  const { data, loading, error, refetch } = useQuery(MODE_CONFIGS_QUERY, {
    fetchPolicy: 'cache-and-network',
  })

  return {
    configs: (data?.modeConfigs ?? []) as ModeConfig[],
    loading,
    error,
    refetch,
  }
}

export function useUpdateModeConfig() {
  return useMutation(UPDATE_MODE_CONFIG_MUTATION, {
    refetchQueries: [{ query: MODE_CONFIGS_QUERY }],
  })
}

export function useResetModeConfig() {
  return useMutation(RESET_MODE_CONFIG_MUTATION, {
    refetchQueries: [{ query: MODE_CONFIGS_QUERY }],
  })
}

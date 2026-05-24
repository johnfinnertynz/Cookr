import type { AccountState } from '../types'
import { trackEvent } from './analytics'
import { getSupabaseClient } from './supabase'

export const defaultAccountState: AccountState = {
  email: '',
  syncEnabled: false,
  status: 'local',
  message: 'Local-only beta mode. Add Supabase env vars to enable cloud sync.',
}

export const requestMagicLink = async (email: string): Promise<AccountState> => {
  const supabase = getSupabaseClient()
  if (!supabase) {
    trackEvent('account_sync_requested', { mode: 'local_only' })
    return {
      email,
      syncEnabled: false,
      status: 'local',
      message: 'Saved locally for beta. Supabase is not configured in this environment.',
    }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  })

  if (error) {
    trackEvent('account_sync_failed', { reason: error.message })
    return {
      email,
      syncEnabled: false,
      status: 'error',
      message: error.message,
    }
  }

  trackEvent('account_magic_link_sent', { mode: 'supabase' })
  return {
    email,
    syncEnabled: true,
    status: 'ready',
    message: 'Magic link sent. After sign-in, Cookr can sync profile, plan, favourites, and feedback.',
  }
}

export const markLocalSyncSnapshot = (account: AccountState): AccountState => ({
  ...account,
  lastSyncAt: new Date().toISOString(),
  status: account.syncEnabled ? 'synced' : account.status,
  message: account.syncEnabled ? 'Latest local snapshot marked for sync.' : account.message,
})

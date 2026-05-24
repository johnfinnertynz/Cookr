import type { AccountState } from '../types'
import { trackEvent } from './analytics'
import { getSupabaseClient } from './supabase'

export const defaultAccountState: AccountState = {
  email: '',
  syncEnabled: false,
  status: 'local',
  message: 'Your plan is saved privately on this device. Cloud backup is available only in configured beta builds.',
}

export const requestMagicLink = async (email: string): Promise<AccountState> => {
  const supabase = getSupabaseClient()
  if (!supabase) {
    trackEvent('account_sync_requested', { mode: 'local_only' })
    return {
      email,
      syncEnabled: false,
      status: 'local',
      message: 'Saved on this device. Cloud backup is not enabled in this beta build yet.',
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
    trackEvent('sync_failure_seen', { surface: 'account' })
    return {
      email,
      syncEnabled: false,
      status: 'error',
      message: 'We could not send that sign-in link. Check the email address and try again.',
    }
  }

  trackEvent('account_magic_link_sent', { mode: 'supabase' })
  return {
    email,
    syncEnabled: true,
    status: 'ready',
    message: 'Sign-in link sent. After sign-in, Cookr can back up your setup, plan, favourites, and feedback.',
  }
}

export const markLocalSyncSnapshot = (account: AccountState): AccountState => ({
  ...account,
  lastSyncAt: new Date().toISOString(),
  status: account.syncEnabled ? 'synced' : account.status,
  message: account.syncEnabled ? 'Latest Cookr plan checkpoint saved.' : account.message,
})

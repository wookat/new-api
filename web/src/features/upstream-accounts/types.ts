/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
export type ApiResponse<T> = {
  success: boolean
  message?: string
  data?: T
}

export type UpstreamPool = {
  name: string
  // Onboarding methods the bridge reports via /admin/capabilities
  // (e.g. 'devin' = email+password sign-in). Absent on older bridges:
  // the UI then offers token-paste only.
  login_methods?: string[]
}

// Whether the bridge has confirmed the credential reaches the upstream. A newly
// added account is 'unverified' until a zero-cost probe (or real traffic)
// proves it, so a typo'd credential never reads as healthy.
export type UpstreamVerification = 'unverified' | 'verified' | 'invalid'

// Snapshot returned by the bridge's /admin/accounts. Secrets are never sent in
// full: only the token tail and the proxy host (no credentials) are exposed.
export type UpstreamAccount = {
  id: string
  label: string
  enabled: boolean
  weight: number
  token_tail: string
  // scheme://host:port only; proxy credentials are stripped server-side.
  proxy: string
  has_proxy: boolean
  daily_limit: number
  hourly_limit: number
  day_used: number
  hour_used: number
  quota_exhausted: boolean
  verification: UpstreamVerification
  healthy: boolean
  cooling_down: boolean
  cooldown_remaining_s: number
  consecutive_fails: number
  ok_count: number
  fail_count: number
  last_error: string
  last_ok_age_s: number | null
}

export type UpstreamAccountsResponse = {
  accounts: UpstreamAccount[]
}

export type UpstreamAccountCreate = {
  token: string
  label?: string
  weight?: number
  enabled?: boolean
  proxy?: string
  daily_limit?: number
  hourly_limit?: number
}

export type UpstreamAccountUpdate = {
  enabled?: boolean
  weight?: number
  label?: string
  token?: string
  proxy?: string
  daily_limit?: number
  hourly_limit?: number
}

// One parsed row of a batch import, before it is sent to the bridge.
export type UpstreamAccountImportRow = {
  token: string
  label?: string
  weight?: number
  proxy?: string
  daily_limit?: number
  hourly_limit?: number
}

export type UpstreamAccountBatchCreate = {
  accounts: UpstreamAccountImportRow[]
}

// The bridge reports which rows it accepted and which it rejected, so a paste of
// many credentials never fails as a whole because of one bad line.
export type UpstreamAccountBatchResult = {
  added: UpstreamAccount[]
  errors: { index: number; error: string }[]
}

// Sign-in onboarding: the bridge replays the real Devin web login + CLI PKCE
// handshake and pools the minted session credential. The password transits to
// the bridge once and is never stored or shown again.
export type UpstreamDevinLogin = {
  email: string
  password: string
  label?: string
  org?: string
  weight?: number
  enabled?: boolean
  proxy?: string
  daily_limit?: number
  hourly_limit?: number
}

export type UpstreamDevinLoginResult = {
  account: UpstreamAccount
  email?: string
  plan?: string
  verification?: UpstreamVerification
}

export type UpstreamAccountProbeResult = {
  verification: UpstreamVerification
  reachable: boolean
  plan?: string
  email?: string
  account?: string
  error?: string
}

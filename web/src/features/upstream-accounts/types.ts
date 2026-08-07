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
}

// Snapshot returned by the bridge's /admin/accounts. Tokens are never sent in
// full: only the last 4 characters (token_tail) are exposed.
export type UpstreamAccount = {
  id: string
  label: string
  enabled: boolean
  weight: number
  token_tail: string
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
}

export type UpstreamAccountUpdate = {
  enabled?: boolean
  weight?: number
  label?: string
  token?: string
}

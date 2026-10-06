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
import { api } from '@/lib/api'

import type {
  ApiResponse,
  UpstreamAccountBatchCreate,
  UpstreamAccountBatchResult,
  UpstreamAccountCreate,
  UpstreamAccountProbeResult,
  UpstreamAccountUpdate,
  UpstreamAccountsResponse,
  UpstreamDevinLogin,
  UpstreamDevinLoginResult,
  UpstreamPool,
} from './types'

export async function getUpstreamPools(): Promise<ApiResponse<UpstreamPool[]>> {
  const res = await api.get('/api/upstream-account/pools')
  return res.data
}

export async function getUpstreamAccounts(
  pool: string
): Promise<ApiResponse<UpstreamAccountsResponse>> {
  const res = await api.get(
    `/api/upstream-account/pools/${encodeURIComponent(pool)}/accounts`
  )
  return res.data
}

export async function createUpstreamAccount(
  pool: string,
  data: UpstreamAccountCreate
): Promise<ApiResponse<unknown>> {
  const res = await api.post(
    `/api/upstream-account/pools/${encodeURIComponent(pool)}/accounts`,
    data
  )
  return res.data
}

export async function updateUpstreamAccount(
  pool: string,
  id: string,
  data: UpstreamAccountUpdate
): Promise<ApiResponse<unknown>> {
  const res = await api.patch(
    `/api/upstream-account/pools/${encodeURIComponent(pool)}/accounts/${encodeURIComponent(id)}`,
    data
  )
  return res.data
}

export async function createUpstreamAccountsBatch(
  pool: string,
  data: UpstreamAccountBatchCreate
): Promise<ApiResponse<UpstreamAccountBatchResult>> {
  const res = await api.post(
    `/api/upstream-account/pools/${encodeURIComponent(pool)}/accounts`,
    data
  )
  return res.data
}

export async function deleteUpstreamAccount(
  pool: string,
  id: string
): Promise<ApiResponse<unknown>> {
  const res = await api.delete(
    `/api/upstream-account/pools/${encodeURIComponent(pool)}/accounts/${encodeURIComponent(id)}`
  )
  return res.data
}

export async function devinLoginUpstreamAccount(
  pool: string,
  data: UpstreamDevinLogin
): Promise<ApiResponse<UpstreamDevinLoginResult>> {
  const res = await api.post(
    `/api/upstream-account/pools/${encodeURIComponent(pool)}/devin-login`,
    data
  )
  return res.data
}

export async function probeUpstreamAccount(
  pool: string,
  id: string
): Promise<ApiResponse<UpstreamAccountProbeResult>> {
  const res = await api.post(
    `/api/upstream-account/pools/${encodeURIComponent(pool)}/accounts/${encodeURIComponent(id)}/probe`
  )
  return res.data
}

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
import type { UpstreamAccountImportRow } from '../types'

export type ParsedImport = {
  rows: UpstreamAccountImportRow[]
  // 1-based source line numbers that could not be parsed, with an i18n key.
  badLines: { line: number; reason: string }[]
}

// Guard against a paste large enough to be abusive; the server enforces its own
// limit too, this is just fast local feedback.
const MAX_ROWS = 200

/**
 * Parse the batch-import textarea into account rows.
 *
 * One account per line, fields separated by a vertical bar:
 *   token | label | proxy | daily_limit | hourly_limit
 * Only the token is required; blank lines are skipped. Numeric limits that are
 * not valid non-negative integers make the whole line invalid so a typo never
 * silently imports an unlimited account.
 */
export function parseImportRows(text: string): ParsedImport {
  const rows: UpstreamAccountImportRow[] = []
  const badLines: { line: number; reason: string }[] = []

  const lines = text.split('\n')
  lines.forEach((raw, index) => {
    const lineNo = index + 1
    if (rows.length >= MAX_ROWS) {
      badLines.push({ line: lineNo, reason: 'Too many rows (max 200).' })
      return
    }
    const trimmed = raw.trim()
    if (trimmed === '') return

    const parts = trimmed.split('|').map((p) => p.trim())
    const token = parts[0]
    if (!token) {
      badLines.push({ line: lineNo, reason: 'Missing token.' })
      return
    }

    const daily = parseLimit(parts[3])
    const hourly = parseLimit(parts[4])
    if (daily === null || hourly === null) {
      badLines.push({
        line: lineNo,
        reason: 'Daily and hourly limits must be non-negative whole numbers.',
      })
      return
    }

    rows.push({
      token,
      label: parts[1] || undefined,
      proxy: parts[2] || undefined,
      daily_limit: daily,
      hourly_limit: hourly,
    })
  })

  return { rows, badLines }
}

function parseLimit(value: string | undefined): number | null {
  if (value === undefined || value === '') return 0
  if (!/^\d+$/.test(value)) return null
  return Number.parseInt(value, 10)
}

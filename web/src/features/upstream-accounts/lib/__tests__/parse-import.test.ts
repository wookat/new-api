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
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { parseImportRows } from '../parse-import'

describe('parseImportRows', () => {
  test('parses a token-only line with unlimited quota', () => {
    const result = parseImportRows('tokenAAA')
    assert.equal(result.badLines.length, 0)
    assert.deepEqual(result.rows, [
      {
        token: 'tokenAAA',
        label: undefined,
        proxy: undefined,
        daily_limit: 0,
        hourly_limit: 0,
      },
    ])
  })

  test('parses all fields separated by vertical bars', () => {
    const result = parseImportRows(
      'tokenAAA | primary | http://user:pass@1.2.3.4:8080 | 2000 | 200'
    )
    assert.equal(result.badLines.length, 0)
    assert.deepEqual(result.rows[0], {
      token: 'tokenAAA',
      label: 'primary',
      proxy: 'http://user:pass@1.2.3.4:8080',
      daily_limit: 2000,
      hourly_limit: 200,
    })
  })

  test('ignores blank and whitespace-only lines', () => {
    const result = parseImportRows('tokenAAA\n\n   \ntokenBBB')
    assert.equal(result.rows.length, 2)
    assert.equal(result.badLines.length, 0)
  })

  test('flags a line whose token is missing', () => {
    const result = parseImportRows('| label-only')
    assert.equal(result.rows.length, 0)
    assert.deepEqual(result.badLines[0], {
      line: 1,
      reason: 'Missing token.',
    })
  })

  test('flags a line with a non-numeric limit instead of importing it', () => {
    const result = parseImportRows('tokenAAA | l | | abc | 10')
    assert.equal(result.rows.length, 0)
    assert.equal(result.badLines[0].line, 1)
  })

  test('reports the correct 1-based line number for a bad line among good ones', () => {
    const result = parseImportRows('tokenAAA\ntokenBBB | l | | -5 | 0')
    assert.equal(result.rows.length, 1)
    assert.equal(result.badLines[0].line, 2)
  })

  test('rejects a paste that exceeds the row cap', () => {
    const many = Array.from({ length: 205 }, (_, i) => `token${i}`).join('\n')
    const result = parseImportRows(many)
    assert.equal(result.rows.length, 200)
    assert.ok(result.badLines.length > 0)
  })
})

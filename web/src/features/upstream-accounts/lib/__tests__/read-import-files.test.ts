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

import {
  MAX_IMPORT_FILE_BYTES,
  normalizeSeparators,
  readImportFiles,
} from '../read-import-files'

function makeFile(name: string, content: string): File {
  return new File([content], name, { type: 'text/plain' })
}

describe('readImportFiles', () => {
  test('reads accepted files and joins their trimmed contents', async () => {
    const result = await readImportFiles([
      makeFile('a.txt', 'tokenAAA\n'),
      makeFile('b.csv', '\ntokenBBB\n'),
    ])
    assert.deepEqual(result.accepted, ['a.txt', 'b.csv'])
    assert.equal(result.skipped.length, 0)
    assert.equal(result.text, 'tokenAAA\ntokenBBB')
  })

  test('skips a file with an unsupported extension instead of reading it', async () => {
    const result = await readImportFiles([makeFile('creds.pdf', 'tokenAAA')])
    assert.equal(result.text, '')
    assert.equal(result.accepted.length, 0)
    assert.equal(result.skipped[0]?.name, 'creds.pdf')
  })

  test('skips an oversized file so the dialog stays responsive', async () => {
    const big = 'x'.repeat(MAX_IMPORT_FILE_BYTES + 1)
    const result = await readImportFiles([makeFile('big.txt', big)])
    assert.equal(result.text, '')
    assert.equal(result.skipped[0]?.reason, 'File is too large.')
  })

  test('skips an empty file', async () => {
    const result = await readImportFiles([makeFile('empty.txt', '   \n')])
    assert.equal(result.text, '')
    assert.equal(result.skipped[0]?.reason, 'File is empty.')
  })
})

describe('normalizeSeparators', () => {
  test('leaves pipe-separated lines untouched', () => {
    assert.equal(
      normalizeSeparators('tokenAAA | primary | http://1.2.3.4:8080'),
      'tokenAAA | primary | http://1.2.3.4:8080'
    )
  })

  test('converts comma and tab separated rows to pipe format', () => {
    assert.equal(
      normalizeSeparators('tokenAAA,primary,2000'),
      'tokenAAA | primary | 2000'
    )
    assert.equal(normalizeSeparators('tokenAAA\tprimary'), 'tokenAAA | primary')
  })

  test('does not split a proxy url that contains a comma-free token line', () => {
    assert.equal(normalizeSeparators('tokenAAA'), 'tokenAAA')
  })
})

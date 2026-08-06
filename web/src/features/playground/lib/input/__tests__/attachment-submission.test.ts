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
  getInputControlState,
  getSubmittableInput,
} from '../input-control-utils'

const IMAGE_DATA_URL = 'data:image/png;base64,aGVsbG8='

describe('getSubmittableInput', () => {
  test('returns null when disabled even if text and files exist', () => {
    const result = getSubmittableInput(
      {
        text: 'hello',
        files: [{ url: IMAGE_DATA_URL, mediaType: 'image/png' }],
      },
      true
    )
    assert.equal(result, null)
  })

  test('returns null when there is no text and no files', () => {
    assert.equal(getSubmittableInput({ text: '   ' }), null)
    assert.equal(getSubmittableInput({}), null)
  })

  test('collects image attachments as image URLs alongside text', () => {
    const result = getSubmittableInput({
      text: 'describe this',
      files: [
        { url: IMAGE_DATA_URL, mediaType: 'image/png', filename: 'a.png' },
        { url: 'https://example.com/b.jpg', mediaType: 'image/jpeg' },
      ],
    })
    assert.ok(result)
    assert.equal(result.text, 'describe this')
    assert.deepEqual(result.images, [
      IMAGE_DATA_URL,
      'https://example.com/b.jpg',
    ])
    assert.deepEqual(result.unsupportedFiles, [])
  })

  test('allows image-only submissions without text', () => {
    const result = getSubmittableInput({
      text: '',
      files: [{ url: IMAGE_DATA_URL, mediaType: 'image/png' }],
    })
    assert.ok(result)
    assert.equal(result.text, '')
    assert.equal(result.images.length, 1)
  })

  test('inlines base64 text file content into the message text', () => {
    const encoded = Buffer.from('line one\nline two', 'utf8').toString('base64')
    const result = getSubmittableInput({
      text: 'see file',
      files: [
        {
          url: `data:text/plain;base64,${encoded}`,
          mediaType: 'text/plain',
          filename: 'notes.txt',
        },
      ],
    })
    assert.ok(result)
    assert.ok(result.text.includes('[File: notes.txt]'))
    assert.ok(result.text.includes('line one\nline two'))
    assert.ok(result.text.endsWith('see file'))
    assert.deepEqual(result.images, [])
  })

  test('collects PDF attachments as documents', () => {
    const result = getSubmittableInput({
      text: 'summarize this',
      files: [
        {
          url: 'data:application/pdf;base64,JVBERi0=',
          mediaType: 'application/pdf',
          filename: 'report.pdf',
        },
      ],
    })
    assert.ok(result)
    assert.deepEqual(result.documents, [
      { name: 'report.pdf', url: 'data:application/pdf;base64,JVBERi0=' },
    ])
    assert.deepEqual(result.unsupportedFiles, [])
  })

  test('allows document-only submissions without text', () => {
    const result = getSubmittableInput({
      text: '',
      files: [
        {
          url: 'data:application/pdf;base64,JVBERi0=',
          mediaType: 'application/pdf',
          filename: 'report.pdf',
        },
      ],
    })
    assert.ok(result)
    assert.equal(result.text, '')
    assert.equal(result.documents.length, 1)
  })

  test('reports unsupported binary files instead of silently dropping them', () => {
    const result = getSubmittableInput({
      text: 'hi',
      files: [
        {
          url: 'data:application/zip;base64,UEs=',
          mediaType: 'application/zip',
          filename: 'archive.zip',
        },
      ],
    })
    assert.ok(result)
    assert.deepEqual(result.unsupportedFiles, ['archive.zip'])
  })
})

describe('getInputControlState with attachments', () => {
  const baseOptions = {
    groups: [],
    hasStopHandler: false,
    models: [{ label: 'm', value: 'm' }],
    text: '',
  }

  test('empty text cannot submit without attachments', () => {
    const state = getInputControlState({ ...baseOptions })
    assert.equal(state.canSubmit, false)
  })

  test('attachments alone enable submission', () => {
    const state = getInputControlState({
      ...baseOptions,
      hasAttachments: true,
    })
    assert.equal(state.canSubmit, true)
  })
})

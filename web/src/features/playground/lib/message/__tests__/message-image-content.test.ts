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

import { appendUserMessagePair } from '../conversation-message-utils'
import {
  createUserMessage,
  formatMessageForAPI,
  isValidMessage,
} from '../message-utils'

const IMAGE_DATA_URL = 'data:image/png;base64,aGVsbG8='

describe('user messages with image attachments', () => {
  test('createUserMessage stores images only when provided', () => {
    const withImages = createUserMessage('hi', Date.now(), [IMAGE_DATA_URL])
    assert.deepEqual(withImages.images, [IMAGE_DATA_URL])

    const withoutImages = createUserMessage('hi')
    assert.equal(withoutImages.images, undefined)
  })

  test('formatMessageForAPI emits multimodal content parts for images', () => {
    const message = createUserMessage('what is this?', Date.now(), [
      IMAGE_DATA_URL,
    ])
    const formatted = formatMessageForAPI(message)
    assert.deepEqual(formatted.content, [
      { type: 'text', text: 'what is this?' },
      { type: 'image_url', image_url: { url: IMAGE_DATA_URL } },
    ])
  })

  test('formatMessageForAPI keeps plain string content without images', () => {
    const message = createUserMessage('plain text')
    const formatted = formatMessageForAPI(message)
    assert.equal(formatted.content, 'plain text')
  })

  test('image-only user message is valid, empty user message is not', () => {
    const imageOnly = createUserMessage('', Date.now(), [IMAGE_DATA_URL])
    assert.equal(isValidMessage(imageOnly), true)

    const empty = createUserMessage('')
    assert.equal(isValidMessage(empty), false)
  })

  test('appendUserMessagePair threads images onto the user message', () => {
    const messages = appendUserMessagePair([], 'look', [IMAGE_DATA_URL])
    assert.equal(messages.length, 2)
    assert.deepEqual(messages[0].images, [IMAGE_DATA_URL])
    assert.equal(messages[1].from, 'assistant')
  })
})

const PDF_DATA_URL = 'data:application/pdf;base64,JVBERi0='

describe('user messages with document attachments', () => {
  test('formatMessageForAPI emits file content parts for documents', () => {
    const message = createUserMessage(
      'summarize',
      Date.now(),
      [],
      [{ name: 'report.pdf', url: PDF_DATA_URL }]
    )
    const formatted = formatMessageForAPI(message)
    assert.deepEqual(formatted.content, [
      { type: 'text', text: 'summarize' },
      {
        type: 'file',
        file: { filename: 'report.pdf', file_data: PDF_DATA_URL },
      },
    ])
  })

  test('document-only user message is valid', () => {
    const docOnly = createUserMessage(
      '',
      Date.now(),
      [],
      [{ name: 'report.pdf', url: PDF_DATA_URL }]
    )
    assert.equal(isValidMessage(docOnly), true)
  })

  test('appendUserMessagePair threads documents onto the user message', () => {
    const messages = appendUserMessagePair(
      [],
      'read',
      [],
      [{ name: 'report.pdf', url: PDF_DATA_URL }]
    )
    assert.deepEqual(messages[0].documents, [
      { name: 'report.pdf', url: PDF_DATA_URL },
    ])
  })
})

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
import type { GroupOption, ModelOption } from '../../types'

type InputControlStateOptions = {
  disabled?: boolean
  groups: GroupOption[]
  hasAttachments?: boolean
  hasStopHandler: boolean
  isGenerating?: boolean
  isModelLoading?: boolean
  models: ModelOption[]
  text: string
}

type InputControlState = {
  canSubmit: boolean
  isSelectorDisabled: boolean
  shouldShowStop: boolean
}

type SubmittableInputFile = {
  url?: string
  mediaType?: string
  filename?: string
}

type SubmittableInputMessage = {
  text?: string | null
  files?: SubmittableInputFile[]
}

export type SubmittableInput = {
  text: string
  images: string[]
  documents: { name: string; url: string }[]
  unsupportedFiles: string[]
}

const DOCUMENT_MEDIA_TYPES = new Set(['application/pdf'])

const TEXT_LIKE_MEDIA_TYPES = new Set([
  'application/json',
  'application/xml',
  'application/x-yaml',
  'application/javascript',
  'application/typescript',
  'application/sql',
  'application/csv',
])

function isTextLikeMediaType(mediaType: string): boolean {
  return mediaType.startsWith('text/') || TEXT_LIKE_MEDIA_TYPES.has(mediaType)
}

function decodeTextDataUrl(url: string): string | null {
  const [header, payload] = url.split(',', 2)
  if (payload === undefined) {
    return null
  }

  try {
    if (header.includes(';base64')) {
      const binary = atob(payload)
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      return new TextDecoder().decode(bytes)
    }
    return decodeURIComponent(payload)
  } catch {
    return null
  }
}

export function getSubmittableInput(
  message: SubmittableInputMessage,
  disabled?: boolean
): SubmittableInput | null {
  if (disabled) {
    return null
  }

  const text = message.text?.trim() ? message.text : ''
  const images: string[] = []
  const documents: { name: string; url: string }[] = []
  const inlinedTexts: string[] = []
  const unsupportedFiles: string[] = []

  for (const file of message.files ?? []) {
    const mediaType = file.mediaType ?? ''
    const url = file.url ?? ''

    if (!url) {
      unsupportedFiles.push(file.filename || mediaType || 'attachment')
      continue
    }

    if (mediaType.startsWith('image/')) {
      images.push(url)
      continue
    }

    if (DOCUMENT_MEDIA_TYPES.has(mediaType) && url.startsWith('data:')) {
      documents.push({ name: file.filename || 'document.pdf', url })
      continue
    }

    if (isTextLikeMediaType(mediaType) && url.startsWith('data:')) {
      const decoded = decodeTextDataUrl(url)
      if (decoded !== null) {
        const name = file.filename || 'attachment'
        inlinedTexts.push(`[File: ${name}]\n\`\`\`\n${decoded}\n\`\`\``)
        continue
      }
    }

    unsupportedFiles.push(file.filename || mediaType || 'attachment')
  }

  const combinedText = [...inlinedTexts, text].filter(Boolean).join('\n\n')

  if (
    !combinedText &&
    images.length === 0 &&
    documents.length === 0 &&
    unsupportedFiles.length === 0
  ) {
    return null
  }

  return { text: combinedText, images, documents, unsupportedFiles }
}

export function getInputControlState({
  disabled,
  groups,
  hasAttachments,
  hasStopHandler,
  isGenerating,
  isModelLoading,
  models,
  text,
}: InputControlStateOptions): InputControlState {
  const hasModels = models.length > 0

  return {
    canSubmit:
      !disabled &&
      hasModels &&
      (text.trim().length > 0 || Boolean(hasAttachments)),
    isSelectorDisabled: disabled || isModelLoading || groups.length === 0,
    shouldShowStop: Boolean(isGenerating && hasStopHandler),
  }
}

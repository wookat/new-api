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
import {
  CameraIcon,
  FileIcon,
  ImageIcon,
  ScreenShareIcon,
  type LucideIcon,
} from 'lucide-react'

type AttachmentAction = {
  action: AttachmentActionType
  icon: LucideIcon
  label: string
}

type InputToolNotice = {
  description?: string
  title: string
}

export type AttachmentActionType =
  | 'upload-file'
  | 'upload-photo'
  | 'take-screenshot'
  | 'take-photo'

type AttachmentPickerConfig = {
  accept: string
  capture?: 'environment' | 'user'
}

export const ATTACHMENT_ACTIONS = [
  { action: 'upload-file', icon: FileIcon, label: 'Upload file' },
  { action: 'upload-photo', icon: ImageIcon, label: 'Upload photo' },
  {
    action: 'take-screenshot',
    icon: ScreenShareIcon,
    label: 'Take screenshot',
  },
  { action: 'take-photo', icon: CameraIcon, label: 'Take photo' },
] satisfies AttachmentAction[]

export function getAttachmentPickerConfig(
  action: AttachmentActionType
): AttachmentPickerConfig | null {
  switch (action) {
    case 'upload-file':
      return { accept: '' }
    case 'upload-photo':
      return { accept: 'image/*' }
    case 'take-photo':
      return { accept: 'image/*', capture: 'environment' }
    default:
      return null
  }
}

/**
 * Capture a screenshot of a user-selected screen/window via the
 * Screen Capture API and return it as a PNG file.
 */
export async function captureScreenshotFile(): Promise<File> {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error('screen-capture-unsupported')
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
  const track = stream.getVideoTracks()[0]

  try {
    const video = document.createElement('video')
    video.srcObject = stream
    video.muted = true
    await video.play()

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('screen-capture-unsupported')
    }
    context.drawImage(video, 0, 0)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) {
          resolve(result)
        } else {
          reject(new Error('screen-capture-failed'))
        }
      }, 'image/png')
    })

    return new File([blob], `screenshot-${Date.now()}.png`, {
      type: 'image/png',
    })
  } finally {
    track?.stop()
    for (const streamTrack of stream.getTracks()) {
      streamTrack.stop()
    }
  }
}

export function getSearchActionNotice(): InputToolNotice {
  return {
    title: 'Search feature in development',
  }
}

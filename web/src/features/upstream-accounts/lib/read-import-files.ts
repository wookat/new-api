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

/** Largest credential file we will read into the browser, to keep a stray
 * multi-megabyte drop from freezing the dialog. */
export const MAX_IMPORT_FILE_BYTES = 512 * 1024

const ACCEPTED_EXTENSIONS = ['.txt', '.csv', '.tsv']

export type ReadImportFilesResult = {
  /** Concatenated text of every accepted file, one file per line block. */
  text: string
  /** Names of files that were accepted and read. */
  accepted: string[]
  /** Files that were skipped, with the reason key. */
  skipped: { name: string; reason: string }[]
}

function isAcceptedName(name: string): boolean {
  const lower = name.toLowerCase()
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

/**
 * Reads dropped/selected credential files into a single text blob suitable for
 * the batch-import textarea. Unsupported or oversized files are reported rather
 * than silently ignored, so an operator never thinks a file was imported when
 * it was not.
 */
export async function readImportFiles(
  files: File[]
): Promise<ReadImportFilesResult> {
  const accepted: string[] = []
  const skipped: { name: string; reason: string }[] = []
  const chunks: string[] = []

  for (const file of files) {
    if (!isAcceptedName(file.name)) {
      skipped.push({
        name: file.name,
        reason: 'Only .txt, .csv and .tsv files are supported.',
      })
      continue
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      skipped.push({ name: file.name, reason: 'File is too large.' })
      continue
    }
    const content = await file.text()
    const trimmed = content.trim()
    if (trimmed === '') {
      skipped.push({ name: file.name, reason: 'File is empty.' })
      continue
    }
    chunks.push(trimmed)
    accepted.push(file.name)
  }

  return { text: chunks.join('\n'), accepted, skipped }
}

/**
 * Normalizes comma/tab separated rows to the pipe-separated format the batch
 * parser expects, so a spreadsheet export can be dropped in unchanged.
 */
export function normalizeSeparators(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (line.includes('|')) return line
      if (line.includes('\t')) return line.split('\t').join(' | ')
      if (line.includes(',')) return line.split(',').join(' | ')
      return line
    })
    .join('\n')
}

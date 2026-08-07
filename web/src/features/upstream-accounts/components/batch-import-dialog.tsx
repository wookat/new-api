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
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { createUpstreamAccountsBatch } from '../api'
import { parseImportRows } from '../lib/parse-import'
import type { UpstreamAccountBatchResult } from '../types'

type BatchImportDialogProps = {
  open: boolean
  pool: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function BatchImportDialog(props: BatchImportDialogProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [result, setResult] = useState<UpstreamAccountBatchResult | null>(null)

  useEffect(() => {
    if (!props.open) {
      setText('')
      setResult(null)
    }
  }, [props.open])

  const parsed = parseImportRows(text)

  const mutation = useMutation({
    mutationFn: () =>
      createUpstreamAccountsBatch(props.pool, { accounts: parsed.rows }),
    onSuccess: (res) => {
      if (!res.success || !res.data) {
        toast.error(res.message || t('Operation failed'))
        return
      }
      setResult(res.data)
      const added = res.data.added.length
      const failed = res.data.errors.length
      if (added > 0) {
        toast.success(t('Imported {{count}} accounts', { count: added }))
        props.onSaved()
      }
      if (added > 0 && failed === 0) {
        props.onOpenChange(false)
      }
    },
    onError: () => toast.error(t('Operation failed')),
  })

  const canSubmit = parsed.rows.length > 0 && parsed.badLines.length === 0

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className='max-h-[85vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{t('Batch import accounts')}</DialogTitle>
          <DialogDescription>
            {t(
              'Paste one account per line. Fields are separated by a vertical bar: token | label | proxy | daily limit | hourly limit. Only the token is required.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form
          className='space-y-4'
          onSubmit={(e) => {
            e.preventDefault()
            if (canSubmit) mutation.mutate()
          }}
        >
          <div className='space-y-2'>
            <Label htmlFor='batch-text'>{t('Accounts')}</Label>
            <Textarea
              id='batch-text'
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                'tokenAAA | primary | http://user:pass@1.2.3.4:8080 | 2000 | 200\ntokenBBB\ntokenCCC | backup'
              }
              rows={8}
              autoComplete='off'
              className='font-mono text-xs'
            />
            <p className='text-muted-foreground text-xs'>
              {t(
                '{{valid}} valid line(s) detected. Blank lines are ignored; proxy passwords are stored on the bridge only.',
                { valid: parsed.rows.length }
              )}
            </p>
          </div>

          {parsed.badLines.length > 0 && (
            <div className='border-destructive/40 bg-destructive/5 space-y-1 rounded-md border p-3 text-xs'>
              <p className='text-destructive font-medium'>
                {t('Fix these lines before importing:')}
              </p>
              {parsed.badLines.map((bad) => (
                <p key={bad.line} className='text-muted-foreground'>
                  {t('Line {{line}}', { line: bad.line })}: {t(bad.reason)}
                </p>
              ))}
            </div>
          )}

          {result && (
            <div className='space-y-1 rounded-md border p-3 text-xs'>
              <p className='font-medium'>
                {t('Added {{added}}, failed {{failed}}', {
                  added: result.added.length,
                  failed: result.errors.length,
                })}
              </p>
              {result.errors.map((err) => (
                <p key={err.index} className='text-destructive'>
                  {t('Row {{row}}', { row: err.index + 1 })}: {err.error}
                </p>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => props.onOpenChange(false)}
            >
              {t('Close')}
            </Button>
            <Button type='submit' disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending
                ? t('Importing...')
                : t('Import {{count}} accounts', { count: parsed.rows.length })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

import { createUpstreamAccount, updateUpstreamAccount } from '../api'
import type { UpstreamAccount } from '../types'

type AccountFormDialogProps = {
  open: boolean
  pool: string
  account: UpstreamAccount | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function AccountFormDialog(props: AccountFormDialogProps) {
  const { t } = useTranslation()
  const isEdit = Boolean(props.account)

  const [label, setLabel] = useState('')
  const [weight, setWeight] = useState('1')
  const [token, setToken] = useState('')
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!props.open) return
    if (props.account) {
      setLabel(props.account.label ?? '')
      setWeight(String(props.account.weight ?? 1))
      setEnabled(props.account.enabled)
      setToken('')
    } else {
      setLabel('')
      setWeight('1')
      setEnabled(true)
      setToken('')
    }
  }, [props.open, props.account])

  const mutation = useMutation({
    mutationFn: () => {
      const weightNum = Number.parseInt(weight, 10)
      const normalizedWeight =
        Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1
      if (isEdit && props.account) {
        return updateUpstreamAccount(props.pool, props.account.id, {
          label,
          weight: normalizedWeight,
          enabled,
          ...(token.trim() ? { token: token.trim() } : {}),
        })
      }
      return createUpstreamAccount(props.pool, {
        token: token.trim(),
        label,
        weight: normalizedWeight,
        enabled,
      })
    },
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Operation failed'))
        return
      }
      toast.success(isEdit ? t('Account updated') : t('Account added'))
      props.onSaved()
      props.onOpenChange(false)
    },
    onError: () => toast.error(t('Operation failed')),
  })

  const canSubmit = isEdit || token.trim().length > 0

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('Edit account') : t('Add account')}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? t(
                  'Update the account settings. Leave the token blank to keep it unchanged.'
                )
              : t(
                  'Upload a subscription account credential to the rotation pool.'
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
            <Label htmlFor='account-label'>{t('Label')}</Label>
            <Input
              id='account-label'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('e.g. primary account')}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='account-token'>
              {isEdit ? t('Replace token (optional)') : t('Token')}
            </Label>
            <Textarea
              id='account-token'
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={t('Paste the account credential / token')}
              rows={3}
              autoComplete='off'
            />
            <p className='text-muted-foreground text-xs'>
              {t(
                'The token is stored on the bridge and never shown again in full.'
              )}
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='account-weight'>{t('Weight')}</Label>
            <Input
              id='account-weight'
              type='number'
              min={1}
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='account-enabled'>{t('Enabled')}</Label>
            <Switch
              id='account-enabled'
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => props.onOpenChange(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type='submit' disabled={!canSubmit || mutation.isPending}>
              {mutation.isPending ? t('Saving...') : t('Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

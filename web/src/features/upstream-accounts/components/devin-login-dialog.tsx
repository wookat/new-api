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

import { devinLoginUpstreamAccount } from '../api'

type DevinLoginDialogProps = {
  open: boolean
  pool: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function DevinLoginDialog(props: DevinLoginDialogProps) {
  const { t } = useTranslation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [label, setLabel] = useState('')
  const [weight, setWeight] = useState('1')
  const [enabled, setEnabled] = useState(true)
  const [proxy, setProxy] = useState('')
  const [dailyLimit, setDailyLimit] = useState('0')
  const [hourlyLimit, setHourlyLimit] = useState('0')

  useEffect(() => {
    if (!props.open) return
    setEmail('')
    setPassword('')
    setLabel('')
    setWeight('1')
    setEnabled(true)
    setProxy('')
    setDailyLimit('0')
    setHourlyLimit('0')
  }, [props.open])

  const mutation = useMutation({
    mutationFn: () => {
      const weightNum = Number.parseInt(weight, 10)
      const normalizedWeight =
        Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1
      const daily = Math.max(0, Number.parseInt(dailyLimit, 10) || 0)
      const hourly = Math.max(0, Number.parseInt(hourlyLimit, 10) || 0)
      return devinLoginUpstreamAccount(props.pool, {
        email: email.trim(),
        password,
        enabled,
        weight: normalizedWeight,
        daily_limit: daily,
        hourly_limit: hourly,
        ...(label.trim() ? { label: label.trim() } : {}),
        ...(proxy.trim() ? { proxy: proxy.trim() } : {}),
      })
    },
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Operation failed'))
        return
      }
      toast.success(
        res.data?.plan
          ? t('Account added via Devin sign-in ({{plan}})', {
              plan: res.data.plan,
            })
          : t('Account added')
      )
      props.onSaved()
      props.onOpenChange(false)
    },
    onError: () => toast.error(t('Operation failed')),
  })

  const canSubmit = email.trim().length > 0 && password.length > 0

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Add account via Devin sign-in')}</DialogTitle>
          <DialogDescription>
            {t(
              'Sign in with the Devin account email and password. The bridge performs the real sign-in and pools the minted credential; the password is used once and never stored.'
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
            <Label htmlFor='devin-login-email'>{t('Email')}</Label>
            <Input
              id='devin-login-email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder='name@example.com'
              autoComplete='off'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='devin-login-password'>{t('Password')}</Label>
            <Input
              id='devin-login-password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete='new-password'
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='devin-login-label'>{t('Label')}</Label>
            <Input
              id='devin-login-label'
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('Defaults to devin:email if left blank')}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='devin-login-proxy'>{t('Outbound proxy')}</Label>
            <Input
              id='devin-login-proxy'
              value={proxy}
              onChange={(e) => setProxy(e.target.value)}
              placeholder='http://user:pass@host:port'
              autoComplete='off'
            />
            <p className='text-muted-foreground text-xs'>
              {t(
                'Route this account through its own egress IP. Supports http/https/socks5; the password is stored on the bridge only.'
              )}
            </p>
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='devin-login-weight'>{t('Weight')}</Label>
              <Input
                id='devin-login-weight'
                type='number'
                min={1}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='devin-login-daily'>{t('Daily limit')}</Label>
              <Input
                id='devin-login-daily'
                type='number'
                min={0}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(e.target.value)}
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='devin-login-hourly'>{t('Hourly limit')}</Label>
              <Input
                id='devin-login-hourly'
                type='number'
                min={0}
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(e.target.value)}
              />
            </div>
            <div className='flex items-end'>
              <p className='text-muted-foreground text-xs'>
                {t('0 means unlimited.')}
              </p>
            </div>
          </div>

          <div className='flex items-center justify-between'>
            <Label htmlFor='devin-login-enabled'>{t('Enabled')}</Label>
            <Switch
              id='devin-login-enabled'
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
              {mutation.isPending ? t('Signing in...') : t('Sign in and add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

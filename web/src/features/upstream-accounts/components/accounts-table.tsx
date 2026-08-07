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
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { UpstreamAccount } from '../types'

type AccountsTableProps = {
  accounts: UpstreamAccount[]
  onToggle: (account: UpstreamAccount) => void
  onEdit: (account: UpstreamAccount) => void
  onDelete: (account: UpstreamAccount) => void
  togglingId?: string
}

function HealthBadge(props: { account: UpstreamAccount }) {
  const { t } = useTranslation()
  const account = props.account
  if (!account.enabled) {
    return <Badge variant='secondary'>{t('Disabled')}</Badge>
  }
  if (account.cooling_down) {
    return (
      <Badge variant='warning'>
        {t('Cooling down')} {Math.round(account.cooldown_remaining_s)}s
      </Badge>
    )
  }
  if (account.healthy) {
    return <Badge variant='outline'>{t('Healthy')}</Badge>
  }
  return <Badge variant='destructive'>{t('Unhealthy')}</Badge>
}

export function AccountsTable(props: AccountsTableProps) {
  const { t } = useTranslation()

  return (
    <>
      {/* Desktop / tablet: table */}
      <div className='hidden overflow-x-auto rounded-md border md:block'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Label')}</TableHead>
              <TableHead>{t('Token')}</TableHead>
              <TableHead>{t('Status')}</TableHead>
              <TableHead className='text-right'>{t('Weight')}</TableHead>
              <TableHead className='text-right'>
                {t('Success / Fail')}
              </TableHead>
              <TableHead>{t('Enabled')}</TableHead>
              <TableHead className='text-right'>{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className='font-medium'>
                  {account.label || account.id}
                </TableCell>
                <TableCell className='text-muted-foreground font-mono text-xs'>
                  ****{account.token_tail}
                </TableCell>
                <TableCell>
                  <div className='flex flex-col gap-1'>
                    <HealthBadge account={account} />
                    {account.last_error && (
                      <span
                        className='text-muted-foreground max-w-[220px] truncate text-xs'
                        title={account.last_error}
                      >
                        {account.last_error}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className='text-right'>{account.weight}</TableCell>
                <TableCell className='text-right'>
                  <span className='text-emerald-600'>{account.ok_count}</span>
                  {' / '}
                  <span className='text-destructive'>{account.fail_count}</span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={account.enabled}
                    disabled={props.togglingId === account.id}
                    onCheckedChange={() => props.onToggle(account)}
                    aria-label={t('Enabled')}
                  />
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => props.onEdit(account)}
                      aria-label={t('Edit')}
                    >
                      <Pencil className='size-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={() => props.onDelete(account)}
                      aria-label={t('Delete')}
                    >
                      <Trash2 className='text-destructive size-4' />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: stacked cards */}
      <div className='flex flex-col gap-3 md:hidden'>
        {props.accounts.map((account) => (
          <div key={account.id} className='rounded-md border p-4'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <p className='truncate font-medium'>
                  {account.label || account.id}
                </p>
                <p className='text-muted-foreground font-mono text-xs'>
                  ****{account.token_tail}
                </p>
              </div>
              <HealthBadge account={account} />
            </div>
            <div className='text-muted-foreground mt-3 grid grid-cols-2 gap-2 text-sm'>
              <span>
                {t('Weight')}: {account.weight}
              </span>
              <span>
                {t('Success / Fail')}: {account.ok_count} / {account.fail_count}
              </span>
            </div>
            {account.last_error && (
              <p
                className='text-muted-foreground mt-2 truncate text-xs'
                title={account.last_error}
              >
                {account.last_error}
              </p>
            )}
            <div className='mt-3 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Switch
                  checked={account.enabled}
                  disabled={props.togglingId === account.id}
                  onCheckedChange={() => props.onToggle(account)}
                  aria-label={t('Enabled')}
                />
                <span className='text-sm'>{t('Enabled')}</span>
              </div>
              <div className='flex gap-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => props.onEdit(account)}
                  aria-label={t('Edit')}
                >
                  <Pencil className='size-4' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() => props.onDelete(account)}
                  aria-label={t('Delete')}
                >
                  <Trash2 className='text-destructive size-4' />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

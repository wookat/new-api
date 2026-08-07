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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw, ServerCog } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  deleteUpstreamAccount,
  getUpstreamAccounts,
  getUpstreamPools,
  updateUpstreamAccount,
} from './api'
import { AccountFormDialog } from './components/account-form-dialog'
import { AccountsTable } from './components/accounts-table'
import type { UpstreamAccount } from './types'

export function UpstreamAccounts() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [selectedPool, setSelectedPool] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UpstreamAccount | null>(null)
  const [deleting, setDeleting] = useState<UpstreamAccount | null>(null)

  const poolsQuery = useQuery({
    queryKey: ['upstream-account', 'pools'],
    queryFn: getUpstreamPools,
  })

  const pools = useMemo(
    () => poolsQuery.data?.data ?? [],
    [poolsQuery.data?.data]
  )

  useEffect(() => {
    if (!selectedPool && pools.length > 0) {
      setSelectedPool(pools[0].name)
    }
  }, [pools, selectedPool])

  const accountsQuery = useQuery({
    queryKey: ['upstream-account', 'accounts', selectedPool],
    queryFn: () => getUpstreamAccounts(selectedPool),
    enabled: Boolean(selectedPool),
    refetchInterval: 30_000,
  })

  const accounts = accountsQuery.data?.data?.accounts ?? []

  const invalidateAccounts = () =>
    queryClient.invalidateQueries({
      queryKey: ['upstream-account', 'accounts', selectedPool],
    })

  const toggleMutation = useMutation({
    mutationFn: (account: UpstreamAccount) =>
      updateUpstreamAccount(selectedPool, account.id, {
        enabled: !account.enabled,
      }),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Operation failed'))
        return
      }
      toast.success(t('Account updated'))
      void invalidateAccounts()
    },
    onError: () => toast.error(t('Operation failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: (account: UpstreamAccount) =>
      deleteUpstreamAccount(selectedPool, account.id),
    onSuccess: (res) => {
      if (!res.success) {
        toast.error(res.message || t('Operation failed'))
        return
      }
      toast.success(t('Account deleted'))
      setDeleting(null)
      void invalidateAccounts()
    },
    onError: () => toast.error(t('Operation failed')),
  })

  const renderContent = () => {
    if (poolsQuery.isLoading) {
      return <LoadingState />
    }
    if (poolsQuery.isError) {
      return <ErrorState onRetry={() => void poolsQuery.refetch()} />
    }
    if (pools.length === 0) {
      return (
        <EmptyState
          icon={ServerCog}
          title={t('No account pool configured')}
          description={t(
            'Set UPSTREAM_ACCOUNT_POOLS on the server to enable upstream account management.'
          )}
          bordered
        />
      )
    }
    if (accountsQuery.isLoading) {
      return <LoadingState />
    }
    if (accountsQuery.isError) {
      return <ErrorState onRetry={() => void accountsQuery.refetch()} />
    }
    if (accounts.length === 0) {
      return (
        <EmptyState
          icon={ServerCog}
          title={t('No accounts yet')}
          description={t(
            'Add a subscription account to start rotating traffic.'
          )}
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className='size-4' />
              {t('Add account')}
            </Button>
          }
          bordered
        />
      )
    }
    return (
      <AccountsTable
        accounts={accounts}
        onToggle={(account) => toggleMutation.mutate(account)}
        onEdit={(account) => {
          setEditing(account)
          setFormOpen(true)
        }}
        onDelete={(account) => setDeleting(account)}
        togglingId={
          toggleMutation.isPending ? toggleMutation.variables?.id : undefined
        }
      />
    )
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {t('Upstream Accounts')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <div className='flex flex-wrap items-center gap-2'>
          {pools.length > 1 && (
            <Select
              value={selectedPool}
              onValueChange={(value) => setSelectedPool(value ?? '')}
            >
              <SelectTrigger className='w-40'>
                <SelectValue placeholder={t('Select pool')} />
              </SelectTrigger>
              <SelectContent>
                {pools.map((pool) => (
                  <SelectItem key={pool.name} value={pool.name}>
                    {pool.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant='outline'
            size='icon'
            onClick={() => void accountsQuery.refetch()}
            disabled={!selectedPool || accountsQuery.isFetching}
            aria-label={t('Refresh')}
          >
            <RefreshCw
              className={
                accountsQuery.isFetching ? 'size-4 animate-spin' : 'size-4'
              }
            />
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
            disabled={pools.length === 0}
          >
            <Plus className='size-4' />
            {t('Add account')}
          </Button>
        </div>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          {pools.length > 0 && (
            <Badge variant='outline'>
              {t('Active pool')}: {selectedPool || '-'}
            </Badge>
          )}
          {renderContent()}

          <AccountFormDialog
            open={formOpen}
            pool={selectedPool}
            account={editing}
            onOpenChange={(open) => {
              setFormOpen(open)
              if (!open) setEditing(null)
            }}
            onSaved={() => void invalidateAccounts()}
          />

          <ConfirmDialog
            open={Boolean(deleting)}
            onOpenChange={(open) => {
              if (!open) setDeleting(null)
            }}
            title={t('Delete account')}
            desc={t(
              'This removes the account from the rotation pool. This action cannot be undone.'
            )}
            destructive
            isLoading={deleteMutation.isPending}
            handleConfirm={() => {
              if (deleting) deleteMutation.mutate(deleting)
            }}
          />
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}

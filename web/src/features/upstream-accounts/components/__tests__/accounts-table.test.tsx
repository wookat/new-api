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
import { after, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'SVGElement',
  'Node',
  'Element',
  'Event',
  'CustomEvent',
  'MutationObserver',
  'ResizeObserver',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'getComputedStyle',
] as const

for (const key of domGlobals) {
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: domWindow[key],
  })
}

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { AccountsTable } = await import('../accounts-table')
type UpstreamAccount = import('../../types').UpstreamAccount

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        Label: 'Label',
        Token: 'Token',
        Status: 'Status',
        Verification: 'Verification',
        Proxy: 'Proxy',
        Quota: 'Quota',
        Weight: 'Weight',
        Enabled: 'Enabled',
        Actions: 'Actions',
        Healthy: 'Healthy',
        Unhealthy: 'Unhealthy',
        Disabled: 'Disabled',
        'Quota exhausted': 'Quota exhausted',
        Verified: 'Verified',
        Unverified: 'Unverified',
        'Invalid credential': 'Invalid credential',
        Direct: 'Direct',
        Unlimited: 'Unlimited',
        'Cooling down': 'Cooling down',
        'Success / Fail': 'Success / Fail',
        Verify: 'Verify',
        Edit: 'Edit',
        Delete: 'Delete',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

function account(overrides: Partial<UpstreamAccount> = {}): UpstreamAccount {
  return {
    id: 'acc1',
    label: 'primary',
    enabled: true,
    weight: 3,
    token_tail: '9f2c',
    proxy: '',
    has_proxy: false,
    daily_limit: 0,
    hourly_limit: 0,
    day_used: 0,
    hour_used: 0,
    quota_exhausted: false,
    verification: 'unverified',
    healthy: true,
    cooling_down: false,
    cooldown_remaining_s: 0,
    consecutive_fails: 0,
    ok_count: 12,
    fail_count: 1,
    last_error: '',
    last_ok_age_s: 5,
    ...overrides,
  }
}

async function renderTable(accounts: UpstreamAccount[]) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const toggled: UpstreamAccount[] = []
  const deleted: UpstreamAccount[] = []
  const probed: UpstreamAccount[] = []

  await act(async () =>
    root.render(
      <I18nextProvider i18n={i18n}>
        <AccountsTable
          accounts={accounts}
          onToggle={(a) => toggled.push(a)}
          onEdit={() => {}}
          onDelete={(a) => deleted.push(a)}
          onProbe={(a) => probed.push(a)}
        />
      </I18nextProvider>
    )
  )

  return {
    container,
    toggled,
    deleted,
    probed,
    cleanup: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

describe('upstream accounts table', () => {
  after(() => {
    domWindow.close()
  })

  test('shows only the masked token tail so full credentials never reach the DOM', async () => {
    const view = await renderTable([account({ token_tail: '9f2c' })])

    const text = view.container.textContent ?? ''
    assert.equal(text.includes('****9f2c'), true)
    assert.equal(text.includes('primary'), true)

    await view.cleanup()
  })

  test('labels a cooling-down account with its remaining cooldown instead of Healthy', async () => {
    const view = await renderTable([
      account({
        healthy: false,
        cooling_down: true,
        cooldown_remaining_s: 42.4,
        consecutive_fails: 3,
        last_error: 'upstream 429',
      }),
    ])

    const text = view.container.textContent ?? ''
    assert.equal(text.includes('Cooling down'), true)
    assert.equal(text.includes('42'), true)
    assert.equal(text.includes('Healthy'), false)
    assert.equal(text.includes('upstream 429'), true)

    await view.cleanup()
  })

  test('labels a manually disabled account as Disabled even when it is otherwise healthy', async () => {
    const view = await renderTable([account({ enabled: false, healthy: true })])

    const text = view.container.textContent ?? ''
    assert.equal(text.includes('Disabled'), true)
    assert.equal(text.includes('Healthy'), false)

    await view.cleanup()
  })

  test('shows a freshly added account as Unverified until it is probed', async () => {
    const view = await renderTable([account({ verification: 'unverified' })])

    const text = view.container.textContent ?? ''
    assert.equal(text.includes('Unverified'), true)
    assert.equal(
      text.includes('Verified') && !text.includes('Unverified'),
      false
    )

    await view.cleanup()
  })

  test('marks an account whose credential the upstream rejected as Invalid', async () => {
    const view = await renderTable([account({ verification: 'invalid' })])

    const text = view.container.textContent ?? ''
    assert.equal(text.includes('Invalid credential'), true)

    await view.cleanup()
  })

  test('shows the masked proxy host but never a proxy password', async () => {
    const view = await renderTable([
      account({ has_proxy: true, proxy: 'http://1.2.3.4:8080' }),
    ])

    const text = view.container.textContent ?? ''
    assert.equal(text.includes('1.2.3.4:8080'), true)
    assert.equal(text.includes('pass'), false)

    await view.cleanup()
  })

  test('flags an account that has hit its quota so it is visibly out of rotation', async () => {
    const view = await renderTable([
      account({
        quota_exhausted: true,
        daily_limit: 100,
        day_used: 100,
      }),
    ])

    const text = view.container.textContent ?? ''
    assert.equal(text.includes('Quota exhausted'), true)
    assert.equal(text.includes('100/100'), true)

    await view.cleanup()
  })

  test('reports the account back to the caller when its verify button is clicked', async () => {
    const view = await renderTable([account({ id: 'acc-probe' })])

    const buttons = [
      ...view.container.querySelectorAll<HTMLElement>(
        'button[aria-label="Verify"]'
      ),
    ]
    assert.ok(buttons.length > 0)
    await act(async () => {
      buttons[0].click()
    })

    assert.equal(view.probed.length, 1)
    assert.equal(view.probed[0].id, 'acc-probe')

    await view.cleanup()
  })

  test('reports the account back to the caller when its enable switch is toggled', async () => {
    const view = await renderTable([account({ id: 'acc-toggle' })])

    const switches = [
      ...view.container.querySelectorAll<HTMLElement>('[role="switch"]'),
    ]
    assert.ok(switches.length > 0)
    await act(async () => {
      switches[0].click()
    })

    assert.equal(view.toggled.length, 1)
    assert.equal(view.toggled[0].id, 'acc-toggle')

    await view.cleanup()
  })
})

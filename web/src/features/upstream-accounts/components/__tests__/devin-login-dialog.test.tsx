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
import http from 'node:http'
import { after, describe, test } from 'node:test'

import { Window } from 'happy-dom'

const domWindow = new Window()
const domGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLButtonElement',
  'HTMLInputElement',
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
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { api } = await import('@/lib/api')
const { DevinLoginDialog } = await import('../devin-login-dialog')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: {
    en: {
      translation: {
        Email: 'Email',
        Password: 'Password',
        Label: 'Label',
        'Outbound proxy': 'Outbound proxy',
        Weight: 'Weight',
        'Daily limit': 'Daily limit',
        'Hourly limit': 'Hourly limit',
        '0 means unlimited.': '0 means unlimited.',
        Enabled: 'Enabled',
        Cancel: 'Cancel',
        'Signing in...': 'Signing in...',
        'Sign in and add': 'Sign in and add',
        'Add account via Devin sign-in': 'Add account via Devin sign-in',
        'Sign in with the Devin account email and password. The bridge performs the real sign-in and pools the minted credential; the password is used once and never stored.':
          'Sign in with the Devin account email and password. The bridge performs the real sign-in and pools the minted credential; the password is used once and never stored.',
        'Defaults to devin:email if left blank':
          'Defaults to devin:email if left blank',
        'Organization (optional)': 'Organization (optional)',
        'Org ID or display name. Leave blank to use the home org of the account; set it to mint a credential for a specific workspace seat.':
          'Org ID or display name. Leave blank to use the home org of the account; set it to mint a credential for a specific workspace seat.',
        'Route this account through its own egress IP. Supports http/https/socks5; the password is stored on the bridge only.':
          'Route this account through its own egress IP. Supports http/https/socks5; the password is stored on the bridge only.',
        'Account added': 'Account added',
        'Account added via Devin sign-in ({{plan}})':
          'Account added via Devin sign-in ({{plan}})',
        'Operation failed': 'Operation failed',
      },
    },
  },
})

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

function setInputValue(input: Element, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    domWindow.HTMLInputElement.prototype,
    'value'
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function renderDialog(props: {
  onSaved?: () => void
  onOpenChange?: (open: boolean) => void
}) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  await act(async () =>
    root.render(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <DevinLoginDialog
            open={true}
            pool='devin-native'
            onSaved={props.onSaved ?? (() => {})}
            onOpenChange={props.onOpenChange ?? (() => {})}
          />
        </I18nextProvider>
      </QueryClientProvider>
    )
  )

  return {
    container,
    cleanup: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error('waitFor timed out')
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

describe('devin login dialog', () => {
  after(() => {
    domWindow.close()
  })

  test('keeps the submit button disabled until both email and password are filled', async () => {
    const view = await renderDialog({})

    const submit = document.querySelector<HTMLButtonElement>(
      'button[type="submit"]'
    )
    const email = document.querySelector('#devin-login-email')
    const password = document.querySelector('#devin-login-password')
    assert.ok(submit && email && password)

    assert.equal(submit.disabled, true)

    await act(async () => setInputValue(email, 'user@example.com'))
    assert.equal(submit.disabled, true)

    await act(async () => setInputValue(password, 's3cret'))
    assert.equal(submit.disabled, false)

    await view.cleanup()
  })

  test('posts the credentials to the pool devin-login endpoint and closes on success', async () => {
    let capturedMethod = ''
    let capturedPath = ''
    let capturedBody: Record<string, unknown> = {}
    const server = http.createServer((req, res) => {
      capturedMethod = req.method ?? ''
      capturedPath = req.url ?? ''
      const chunks: Buffer[] = []
      req.on('data', (chunk: Buffer) => chunks.push(chunk))
      req.on('end', () => {
        capturedBody = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(
          JSON.stringify({
            success: true,
            data: {
              account: { id: 'acc3', label: 'devin:user@example.com' },
              plan: 'pro',
              verification: 'verified',
            },
          })
        )
      })
    })
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', () => resolve())
    )
    const address = server.address()
    const port =
      typeof address === 'object' && address !== null ? address.port : 0
    const previousBaseURL = api.defaults.baseURL
    api.defaults.baseURL = `http://127.0.0.1:${port}`

    let saved = false
    let lastOpen: boolean | null = null
    const view = await renderDialog({
      onSaved: () => {
        saved = true
      },
      onOpenChange: (open) => {
        lastOpen = open
      },
    })

    try {
      const email = document.querySelector('#devin-login-email')
      const password = document.querySelector('#devin-login-password')
      const label = document.querySelector('#devin-login-label')
      const org = document.querySelector('#devin-login-org')
      const submit = document.querySelector<HTMLButtonElement>(
        'button[type="submit"]'
      )
      assert.ok(email && password && label && org && submit)

      await act(async () => {
        setInputValue(email, 'user@example.com')
        setInputValue(password, 's3cret-pw')
        setInputValue(label, 'ops-secondary')
        setInputValue(org, 'zalize Pro')
      })
      await act(async () => {
        submit.click()
      })

      await waitFor(() => saved)

      assert.equal(capturedMethod, 'POST')
      assert.equal(
        capturedPath,
        '/api/upstream-account/pools/devin-native/devin-login'
      )
      assert.deepEqual(capturedBody, {
        email: 'user@example.com',
        password: 's3cret-pw',
        label: 'ops-secondary',
        org: 'zalize Pro',
        enabled: true,
        weight: 1,
        daily_limit: 0,
        hourly_limit: 0,
      })
      assert.equal(lastOpen, false)
    } finally {
      api.defaults.baseURL = previousBaseURL
      server.close()
      await view.cleanup()
    }
  })
})

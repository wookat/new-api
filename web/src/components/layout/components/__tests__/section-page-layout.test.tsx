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
const { SectionPageLayout } = await import('../section-page-layout')
const { Dialog, DialogContent, DialogTitle } = await import(
  '@/components/ui/dialog'
)

const reactTestGlobals = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean
}
reactTestGlobals.IS_REACT_ACT_ENVIRONMENT = true

async function render(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  return {
    cleanup: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

describe('SectionPageLayout child rendering contract', () => {
  after(() => {
    domWindow.close()
  })

  test('mounts an open dialog placed inside the Content slot', async () => {
    const view = await render(
      <SectionPageLayout>
        <SectionPageLayout.Title>Accounts</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div>list</div>
          <Dialog open onOpenChange={() => {}}>
            <DialogContent>
              <DialogTitle>Add account</DialogTitle>
            </DialogContent>
          </Dialog>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )

    const dialog = document.body.querySelector('[role="dialog"]')
    assert.ok(dialog, 'dialog inside Content slot must mount')
    assert.equal((document.body.textContent ?? '').includes('Add account'), true)

    await view.cleanup()
  })

  test('drops a dialog passed as a bare child outside any slot', async () => {
    // Regression guard: dialogs must live inside SectionPageLayout.Content,
    // otherwise the slot extraction silently discards them and they never open.
    const view = await render(
      <SectionPageLayout>
        <SectionPageLayout.Title>Accounts</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <div>list</div>
        </SectionPageLayout.Content>
        <Dialog open onOpenChange={() => {}}>
          <DialogContent>
            <DialogTitle>Add account</DialogTitle>
          </DialogContent>
        </Dialog>
      </SectionPageLayout>
    )

    assert.equal(document.body.querySelector('[role="dialog"]'), null)

    await view.cleanup()
  })
})

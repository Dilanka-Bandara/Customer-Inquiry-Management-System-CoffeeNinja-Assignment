// Test helpers: render a page the way the app does (router + data cache + signed-in user),
// and replace `fetch` with a fake server so tests are fast and don't need the backend.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { vi } from 'vitest'
import { CurrentUserContext } from '../auth/currentUser'
import type { Inquiry, User } from '../types'

export const alice: User = { id: 2, email: 'alice@example.com', name: 'Alice Staff', role: 'STAFF' }

export function renderPage(
  ui: ReactElement,
  { path, url, user = alice, extraRoutes = {} }: { path: string; url: string; user?: User; extraRoutes?: Record<string, ReactElement> },
) {
  // A fresh cache per test, without retries, so one test can't affect another.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserContext.Provider value={user}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path={path} element={ui} />
            {Object.entries(extraRoutes).map(([p, el]) => (
              <Route key={p} path={p} element={el} />
            ))}
          </Routes>
        </MemoryRouter>
      </CurrentUserContext.Provider>
    </QueryClientProvider>,
  )
}

type FakeRoute = { method: string; path: string; status: number; body?: unknown }

/**
 * Replaces fetch. Each request takes the first matching route (and removes it),
 * so the same URL can answer differently the second time.
 * Returns the mock, so tests can inspect which requests were sent.
 */
export function fakeServer(routes: FakeRoute[]) {
  const queue = [...routes]
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET'
    const index = queue.findIndex((r) => r.method === method && url === `/api${r.path}`)
    if (index === -1) throw new Error(`Unexpected request: ${method} ${url}`)
    const [route] = queue.splice(index, 1)
    return new Response(route!.body === undefined ? null : JSON.stringify(route!.body), {
      status: route!.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** The JSON body sent with the n-th request (0-based). */
export const sentBody = (fetchMock: ReturnType<typeof fakeServer>, n: number) =>
  JSON.parse(String(fetchMock.mock.calls[n]?.[1]?.body))

export function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 5,
    customerName: 'Ruwan Wijesinghe',
    contact: 'ruwan@example.com',
    subject: 'Warranty claim',
    description: 'Coffee machine stopped working.',
    status: 'NEW',
    version: 1,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    createdBy: { id: 2, name: 'Alice Staff' },
    assignedTo: { id: 2, name: 'Alice Staff' },
    allowedNextStatuses: ['IN_PROGRESS'],
    ...overrides,
  }
}

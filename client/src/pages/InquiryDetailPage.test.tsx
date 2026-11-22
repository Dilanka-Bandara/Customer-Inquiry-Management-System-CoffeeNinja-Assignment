// Detail page states: status buttons come from the server's rules, a stale tab gets a clear
// warning (brief: "real world situation" #2), and missing / forbidden records are explained.
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeServer, makeInquiry, renderPage, sentBody } from '../test/utils'
import { InquiryDetailPage } from './InquiryDetailPage'

const renderDetail = (id = '5') => renderPage(<InquiryDetailPage />, { path: '/inquiries/:id', url: `/inquiries/${id}` })

describe('Inquiry detail page', () => {
  it('shows only the status actions the server allows', async () => {
    fakeServer([{ method: 'GET', path: '/inquiries/5', status: 200, body: makeInquiry({ status: 'RESOLVED', allowedNextStatuses: ['IN_PROGRESS'] }) }])
    renderDetail()

    expect(await screen.findByRole('button', { name: 'Reopen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as resolved' })).not.toBeInTheDocument()
  })

  it('when another tab changed the inquiry first: warns, and shows the latest data instead of overwriting', async () => {
    const latest = makeInquiry({ status: 'IN_PROGRESS', version: 2, allowedNextStatuses: ['RESOLVED'] })
    const fetchMock = fakeServer([
      { method: 'GET', path: '/inquiries/5', status: 200, body: makeInquiry() }, // this tab loaded version 1
      {
        method: 'PATCH',
        path: '/inquiries/5/status',
        status: 409,
        body: { error: { code: 'VERSION_CONFLICT', message: 'Changed by someone else', details: { current: latest } } },
      },
      { method: 'GET', path: '/inquiries/5', status: 200, body: latest }, // possible background refresh
    ])
    const user = userEvent.setup()
    renderDetail()

    await user.click(await screen.findByRole('button', { name: 'Start working' }))

    const warning = await screen.findByRole('alert')
    expect(warning).toHaveTextContent('This inquiry was changed in another tab or by someone else')
    expect(within(warning).getByText('In Progress')).toBeInTheDocument()
    // The page now shows the real current state and its allowed action.
    expect(screen.getByRole('button', { name: 'Mark as resolved' })).toBeInTheDocument()
    // The request carried the version this tab had seen.
    expect(sentBody(fetchMock, 1)).toEqual({ status: 'IN_PROGRESS', version: 1 })
  })

  it('explains a missing or forbidden inquiry without revealing which', async () => {
    fakeServer([{ method: 'GET', path: '/inquiries/3', status: 404, body: { error: { code: 'NOT_FOUND', message: 'Inquiry not found.' } } }])
    renderDetail('3')

    expect(await screen.findByRole('heading', { name: 'Inquiry not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '← Back to inquiries' })).toBeInTheDocument()
  })
})

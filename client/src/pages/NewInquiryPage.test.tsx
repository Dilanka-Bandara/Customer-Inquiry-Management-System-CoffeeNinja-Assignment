// Form behaviour: the UI guides the user before anything is sent, and handles the
// server's "possible duplicate" answer (brief: "real world situation" #1).
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { fakeServer, makeInquiry, renderPage, sentBody } from '../test/utils'
import { NewInquiryPage } from './NewInquiryPage'

const renderForm = () =>
  renderPage(<NewInquiryPage />, {
    path: '/inquiries/new',
    url: '/inquiries/new',
    extraRoutes: { '/inquiries/:id': <p>Detail page</p> },
  })

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Customer name'), 'Ruwan Wijesinghe')
  await user.type(screen.getByLabelText(/Contact/), 'ruwan@example.com')
  await user.type(screen.getByLabelText('Subject'), 'Warranty claim')
  await user.type(screen.getByLabelText('Description'), 'Coffee machine stopped working.')
}

describe('New inquiry form', () => {
  it('shows a message for every missing field and sends nothing to the API', async () => {
    const fetchMock = fakeServer([])
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Save inquiry' }))

    expect(screen.getByText('Customer name is required')).toBeInTheDocument()
    expect(screen.getByText('Contact is required')).toBeInTheDocument()
    expect(screen.getByText('Subject is required')).toBeInTheDocument()
    expect(screen.getByText('Description is required')).toBeInTheDocument()
    // Accessibility: the field is marked invalid and the cursor moves to the first problem.
    expect(screen.getByLabelText('Customer name')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Customer name')).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an invalid contact, and clears the error once it is fixed', async () => {
    fakeServer([])
    const user = userEvent.setup()
    renderForm()

    const contact = screen.getByLabelText(/Contact/)
    await user.type(contact, 'hello')
    await user.tab() // leaving the field triggers its check
    expect(screen.getByText('Enter a valid email address or phone number')).toBeInTheDocument()

    await user.clear(contact)
    await user.type(contact, '+94 77 123 4567')
    expect(screen.queryByText('Enter a valid email address or phone number')).not.toBeInTheDocument()
  })

  it('warns about a possible duplicate and only saves after "Save anyway"', async () => {
    const fetchMock = fakeServer([
      {
        method: 'POST',
        path: '/inquiries',
        status: 409,
        body: { error: { code: 'POSSIBLE_DUPLICATE', message: 'Possible duplicate', details: { existingId: 4 } } },
      },
      { method: 'POST', path: '/inquiries', status: 201, body: makeInquiry({ id: 9 }) },
    ])
    const user = userEvent.setup()
    renderForm()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Save inquiry' }))

    expect(await screen.findByText('This looks like a duplicate')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open #4' })).toHaveAttribute('href', '/inquiries/4')
    expect(sentBody(fetchMock, 0).confirmDuplicate).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Save anyway' }))

    expect(await screen.findByText('Detail page')).toBeInTheDocument() // navigated to the new inquiry
    expect(sentBody(fetchMock, 1).confirmDuplicate).toBe(true)
  })

  it('keeps what the user typed when saving fails', async () => {
    fakeServer([{ method: 'POST', path: '/inquiries', status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } } }])
    const user = userEvent.setup()
    renderForm()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Save inquiry' }))

    expect(await screen.findByText('Could not save the inquiry')).toBeInTheDocument()
    expect(screen.getByLabelText('Customer name')).toHaveValue('Ruwan Wijesinghe')
    expect(screen.getByRole('button', { name: 'Save inquiry' })).toBeEnabled() // can retry
  })
})

import { Link, useLocation, useParams } from 'react-router'
import { isApiError } from '../api/client'
import { useInquiry } from '../api/inquiries'
import { useCurrentUser } from '../auth/currentUser'
import { Alert } from '../components/Alert'
import { AssigneeControl } from '../components/AssigneeControl'
import { ErrorState, LoadingBlock } from '../components/States'
import { StatusActions } from '../components/StatusActions'
import { StatusBadge } from '../components/StatusBadge'
import { formatDateTime, timeAgo } from '../lib/format'

const BACK = <Link to="/inquiries">← Back to inquiries</Link>

export function InquiryDetailPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const justCreated = (location.state as { justCreated?: boolean } | null)?.justCreated
  const user = useCurrentUser()
  const { data: inquiry, isPending, isError, error, refetch, isFetching } = useInquiry(id)

  if (isPending) return <LoadingBlock label="Loading inquiry…" />

  if (isError) {
    // Predictable, understandable failures - each case explained in plain words.
    if (isApiError(error, 'NOT_FOUND'))
      return (
        <ErrorState title="Inquiry not found" message="It may have been removed, the link may be wrong, or you may not have access to it.">
          {BACK}
        </ErrorState>
      )
    if (isApiError(error, 'VALIDATION_ERROR'))
      return (
        <ErrorState title="This link is not valid" message={`"${id}" is not a valid inquiry number.`}>
          {BACK}
        </ErrorState>
      )
    return (
      <ErrorState title="Could not load this inquiry" message={error.message} onRetry={() => refetch()}>
        {BACK}
      </ErrorState>
    )
  }

  const isEmail = inquiry.contact.includes('@')

  return (
    <section className="narrow">
      <p>{BACK}</p>

      {justCreated && <Alert tone="success">Inquiry saved. It is assigned to {inquiry.assignedTo?.name ?? 'nobody yet'}.</Alert>}

      <div className="card">
        <div className="detail__header">
          <div>
            <p className="muted">
              Inquiry #{inquiry.id}
              {isFetching && ' · refreshing…'}
            </p>
            <h1>{inquiry.subject}</h1>
          </div>
          <StatusBadge status={inquiry.status} />
        </div>

        <dl className="detail__meta">
          <div>
            <dt>Customer</dt>
            <dd>{inquiry.customerName}</dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              <a href={isEmail ? `mailto:${inquiry.contact}` : `tel:${inquiry.contact.replace(/[^\d+]/g, '')}`}>{inquiry.contact}</a>
            </dd>
          </div>
          <div>
            <dt>Recorded by</dt>
            <dd>
              {inquiry.createdBy.name} · <time dateTime={inquiry.createdAt}>{formatDateTime(inquiry.createdAt)}</time>
            </dd>
          </div>
          <div>
            <dt>Last update</dt>
            <dd>
              <time dateTime={inquiry.updatedAt} title={formatDateTime(inquiry.updatedAt)}>
                {timeAgo(inquiry.updatedAt)}
              </time>
            </dd>
          </div>
          {user.role !== 'ADMIN' && (
            <div>
              <dt>Assigned to</dt>
              <dd>{inquiry.assignedTo?.name ?? 'Unassigned'}</dd>
            </div>
          )}
        </dl>

        <h2 className="section-title">Description</h2>
        <p className="description">{inquiry.description}</p>

        <h2 className="section-title">Status</h2>
        <StatusActions inquiry={inquiry} />

        {user.role === 'ADMIN' && (
          <>
            <h2 className="section-title">Ownership</h2>
            <AssigneeControl inquiry={inquiry} />
          </>
        )}
      </div>
    </section>
  )
}

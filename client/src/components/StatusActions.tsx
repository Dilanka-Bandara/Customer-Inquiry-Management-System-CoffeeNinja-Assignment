// Buttons for the next allowed statuses, with clear feedback for every outcome.
import { isApiError } from '../api/client'
import { useUpdateStatus } from '../api/inquiries'
import { STATUS_LABEL, type Inquiry, type InquiryStatus } from '../types'
import { Alert } from './Alert'

/** Action words read better than raw status names ("Reopen" instead of "In Progress"). */
function actionLabel(from: InquiryStatus, to: InquiryStatus) {
  if (to === 'RESOLVED') return 'Mark as resolved'
  if (to === 'IN_PROGRESS') return from === 'RESOLVED' ? 'Reopen' : 'Start working'
  return `Move to ${STATUS_LABEL[to]}`
}

export function StatusActions({ inquiry }: { inquiry: Inquiry }) {
  const update = useUpdateStatus(String(inquiry.id))

  function change(to: InquiryStatus) {
    // Send the version we are looking at. If someone changed it meanwhile, the server says 409.
    update.mutate({ status: to, version: inquiry.version })
  }

  return (
    <div className="status-actions">
      <div className="status-actions__buttons">
        {inquiry.allowedNextStatuses.map((to) => (
          <button
            key={to}
            type="button"
            className={`btn ${to === 'RESOLVED' ? 'btn--primary' : ''}`}
            disabled={update.isPending}
            onClick={() => change(to)}
          >
            {update.isPending && update.variables?.status === to ? 'Saving…' : actionLabel(inquiry.status, to)}
          </button>
        ))}
      </div>

      {update.isSuccess && <Alert tone="success">Status changed to {STATUS_LABEL[update.data.status]}.</Alert>}

      {isApiError(update.error, 'VERSION_CONFLICT') ? (
        <Alert tone="warning" title="This inquiry was changed in another tab or by someone else">
          It is now <strong>{STATUS_LABEL[inquiry.status]}</strong>. Your change was not saved. The page now shows the
          latest details - check them, then try again if needed.
        </Alert>
      ) : isApiError(update.error, 'INVALID_STATUS_TRANSITION') ? (
        <Alert tone="warning" title="That status change is not allowed">
          {update.error.message}
        </Alert>
      ) : update.error ? (
        <Alert tone="error" title="Could not change the status">
          {update.error.message}
        </Alert>
      ) : null}
    </div>
  )
}

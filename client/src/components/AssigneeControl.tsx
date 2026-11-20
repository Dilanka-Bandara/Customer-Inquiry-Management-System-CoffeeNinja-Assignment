// Admin only: choose who handles the inquiry. (The API also refuses this for staff - 403.)
import { useState } from 'react'
import { isApiError } from '../api/client'
import { useAssignableUsers, useUpdateAssignee } from '../api/inquiries'
import type { Inquiry } from '../types'
import { Alert } from './Alert'

export function AssigneeControl({ inquiry }: { inquiry: Inquiry }) {
  const users = useAssignableUsers(true)
  const update = useUpdateAssignee(String(inquiry.id))
  const current = inquiry.assignedTo?.id ?? null
  const [selected, setSelected] = useState<number | null>(current)

  // When the inquiry changes (saved here, or refreshed from another tab), reset the dropdown
  // to the real current value. (React's "adjust state when a prop changes" pattern.)
  const [seenVersion, setSeenVersion] = useState(inquiry.version)
  if (seenVersion !== inquiry.version) {
    setSeenVersion(inquiry.version)
    setSelected(current)
  }

  return (
    <div className="assignee">
      <label htmlFor="assignee">Assigned to</label>
      <div className="assignee__row">
        <select
          id="assignee"
          value={selected ?? ''}
          disabled={users.isPending || update.isPending}
          onChange={(e) => setSelected(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Unassigned</option>
          {/* Keep the current person visible even before the list has loaded */}
          {users.isPending && inquiry.assignedTo && <option value={inquiry.assignedTo.id}>{inquiry.assignedTo.name}</option>}
          {users.data?.items.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.role === 'ADMIN' ? ' (admin)' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          disabled={selected === current || update.isPending}
          onClick={() => update.mutate({ assignedToId: selected, version: inquiry.version })}
        >
          {update.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      {users.isError && <Alert tone="error">Could not load the staff list. {users.error.message}</Alert>}
      {update.isSuccess && <Alert tone="success">Now assigned to {update.data.assignedTo?.name ?? 'nobody'}.</Alert>}
      {update.error &&
        (isApiError(update.error, 'VERSION_CONFLICT') ? (
          <Alert tone="warning" title="This inquiry was updated by someone else">
            Your change was not saved. The latest details are shown - check them and try again.
          </Alert>
        ) : (
          <Alert tone="error" title="Could not change the assignee">
            {update.error.message}
          </Alert>
        ))}
    </div>
  )
}

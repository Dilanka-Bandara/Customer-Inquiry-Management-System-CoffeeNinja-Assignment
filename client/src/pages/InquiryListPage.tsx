import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useInquiryList, type ListFilters } from '../api/inquiries'
import { EmptyState, ErrorState, LoadingBlock } from '../components/States'
import { StatusBadge } from '../components/StatusBadge'
import { timeAgo } from '../lib/format'
import { ALL_STATUSES, STATUS_LABEL, type InquiryStatus } from '../types'

/** Reads the filters from the URL, ignoring anything invalid someone typed into it. */
function filtersFromUrl(params: URLSearchParams): ListFilters {
  const status = params.get('status') as InquiryStatus | null
  const page = Number(params.get('page'))
  return {
    status: status && ALL_STATUSES.includes(status) ? status : undefined,
    q: params.get('q')?.trim() || undefined,
    assigned: params.get('assigned') === 'me' ? 'me' : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  }
}

function toUrl(f: ListFilters): URLSearchParams {
  const p = new URLSearchParams()
  if (f.status) p.set('status', f.status)
  if (f.q) p.set('q', f.q)
  if (f.assigned) p.set('assigned', f.assigned)
  if (f.page > 1) p.set('page', String(f.page))
  return p
}

export function InquiryListPage() {
  const [params, setParams] = useSearchParams()
  const filters = filtersFromUrl(params)
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } = useInquiryList(filters)

  /** Change some filters; any filter change goes back to page 1 unless a page is given. */
  function updateFilters(change: Partial<ListFilters>) {
    // Build from the LATEST url (prev), not from `filters` captured at render time,
    // so a delayed search update can't undo a status click made in the meantime.
    setParams((prev) => toUrl({ ...filtersFromUrl(prev), page: 1, ...change }), { replace: true })
  }

  // Search box: type freely; the URL (and the API call) updates 300ms after typing stops.
  const [search, setSearch] = useState(filters.q ?? '')
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(searchTimer.current), []) // cancel a pending update on unmount

  function handleSearchChange(value: string) {
    setSearch(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => updateFilters({ q: value.trim() || undefined }), 300)
  }

  function clearFilters() {
    clearTimeout(searchTimer.current)
    setSearch('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const hasFilters = Boolean(filters.status || filters.q || filters.assigned)
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <section>
      <div className="page-header">
        <h1>Inquiries</h1>
        <Link to="/inquiries/new" className="btn btn--primary">
          + New inquiry
        </Link>
      </div>

      <div className="toolbar" role="search">
        <input
          type="search"
          className="toolbar__search"
          placeholder="Search name, contact, subject or #id"
          aria-label="Search inquiries"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        <div className="segmented" role="group" aria-label="Filter by status">
          {[undefined, ...ALL_STATUSES].map((s) => (
            <button
              key={s ?? 'all'}
              type="button"
              aria-pressed={filters.status === s}
              onClick={() => updateFilters({ status: s })}
            >
              {s ? STATUS_LABEL[s] : 'All'}
            </button>
          ))}
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={filters.assigned === 'me'}
            onChange={(e) => updateFilters({ assigned: e.target.checked ? 'me' : undefined })}
          />
          Assigned to me
        </label>
      </div>

      {isPending ? (
        <LoadingBlock label="Loading inquiries…" />
      ) : isError ? (
        <ErrorState title="Could not load inquiries" message={error.message} onRetry={() => refetch()} />
      ) : data.total === 0 ? (
        hasFilters ? (
          <EmptyState title="No matching inquiries" message="Nothing matches these filters. Try a different search or status.">
            <button type="button" className="btn" onClick={clearFilters}>
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <EmptyState title="No inquiries yet" message="When a customer gets in touch, record it here so the team can follow it up.">
            <Link to="/inquiries/new" className="btn btn--primary">
              Record the first inquiry
            </Link>
          </EmptyState>
        )
      ) : (
        <>
          <p className="muted result-count" aria-live="polite">
            {data.total} {data.total === 1 ? 'inquiry' : 'inquiries'}
            {isFetching && ' · updating…'}
          </p>
          <div className={`table-wrap${isPlaceholderData ? ' is-stale' : ''}`}>
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Customer</th>
                  <th scope="col">Status</th>
                  <th scope="col">Assigned to</th>
                  <th scope="col">Last update</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((inq) => (
                  <tr key={inq.id}>
                    <td data-label="#" className="muted">
                      {inq.id}
                    </td>
                    <td data-label="Subject">
                      <Link to={`/inquiries/${inq.id}`} className="row-link">
                        {inq.subject}
                      </Link>
                    </td>
                    <td data-label="Customer">{inq.customerName}</td>
                    <td data-label="Status">
                      <StatusBadge status={inq.status} />
                    </td>
                    <td data-label="Assigned to">{inq.assignedTo?.name ?? <span className="muted">Unassigned</span>}</td>
                    <td data-label="Last update" className="muted">
                      <time dateTime={inq.updatedAt}>{timeAgo(inq.updatedAt)}</time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Pages">
              <button type="button" className="btn" disabled={filters.page <= 1} onClick={() => updateFilters({ page: filters.page - 1 })}>
                ← Previous
              </button>
              <span>
                Page {filters.page} of {totalPages}
              </span>
              <button type="button" className="btn" disabled={filters.page >= totalPages} onClick={() => updateFilters({ page: filters.page + 1 })}>
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  )
}

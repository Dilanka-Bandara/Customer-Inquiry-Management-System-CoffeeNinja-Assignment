import { STATUS_LABEL, type InquiryStatus } from '../types'

/** Colour + text (never colour alone), so status is readable for everyone. */
export function StatusBadge({ status }: { status: InquiryStatus }) {
  return <span className={`badge badge--${status.toLowerCase()}`}>{STATUS_LABEL[status]}</span>
}

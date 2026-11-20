import { Link } from 'react-router'
import { ErrorState } from '../components/States'

export function NotFoundPage() {
  return (
    <ErrorState title="Page not found" message="There is no page at this address.">
      <Link to="/inquiries">Go to inquiries</Link>
    </ErrorState>
  )
}

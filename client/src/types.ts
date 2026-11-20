// Shapes of the data the API sends back (they mirror the server's responses).

export type Role = 'ADMIN' | 'STAFF'
export type InquiryStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED'

export interface User {
  id: number
  email: string
  name: string
  role: Role
}

export interface PersonRef {
  id: number
  name: string
}

export interface Inquiry {
  id: number
  customerName: string
  contact: string
  subject: string
  description: string
  status: InquiryStatus
  version: number
  createdAt: string
  updatedAt: string
  createdBy: PersonRef
  assignedTo: PersonRef | null
  /** Decided by the server's rules - the UI only shows these as buttons */
  allowedNextStatuses: InquiryStatus[]
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const STATUS_LABEL: Record<InquiryStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
}

export const ALL_STATUSES: InquiryStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED']

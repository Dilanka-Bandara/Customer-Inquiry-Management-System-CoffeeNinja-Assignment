// Server data for inquiries, as React hooks. Components never call fetch directly.
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Inquiry, InquiryStatus, Page, PersonRef, Role } from '../types'
import { api, isApiError } from './client'

export interface ListFilters {
  status?: InquiryStatus
  q?: string
  assigned?: 'me'
  page: number
}

export interface NewInquiry {
  customerName: string
  contact: string
  subject: string
  description: string
  confirmDuplicate?: boolean
}

// Cache keys. Lists and details live under "inquiries" so one call can refresh them all.
export const inquiryKeys = {
  all: ['inquiries'] as const,
  lists: () => [...inquiryKeys.all, 'list'] as const,
  list: (f: ListFilters) => [...inquiryKeys.lists(), f] as const,
  detail: (id: string) => [...inquiryKeys.all, 'detail', id] as const,
}

export function useInquiryList(filters: ListFilters) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.q) params.set('q', filters.q)
  if (filters.assigned) params.set('assigned', filters.assigned)
  params.set('page', String(filters.page))

  return useQuery({
    queryKey: inquiryKeys.list(filters),
    queryFn: ({ signal }) => api<Page<Inquiry>>(`/inquiries?${params}`, { signal }),
    // While a new filter loads, keep showing the old rows (dimmed) instead of a blank page.
    placeholderData: keepPreviousData,
  })
}

export function useInquiry(id: string) {
  return useQuery({
    queryKey: inquiryKeys.detail(id),
    queryFn: ({ signal }) => api<Inquiry>(`/inquiries/${encodeURIComponent(id)}`, { signal }),
  })
}

export function useCreateInquiry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: NewInquiry) => api<Inquiry>('/inquiries', { method: 'POST', body }),
    onSuccess: (created) => {
      qc.setQueryData(inquiryKeys.detail(String(created.id)), created)
      qc.invalidateQueries({ queryKey: inquiryKeys.lists() })
    },
  })
}

/**
 * Shared behaviour for updates that carry a version number:
 * - success: show the saved record immediately and refresh lists
 * - VERSION_CONFLICT: the server sent the latest record -> show it (so the user sees what changed)
 * - anything else: reload the record, since our copy may be out of date
 */
function useVersionedUpdate<TBody extends { version: number }>(id: string, path: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: TBody) => api<Inquiry>(`/inquiries/${encodeURIComponent(id)}/${path}`, { method: 'PATCH', body }),
    onSuccess: (updated) => {
      qc.setQueryData(inquiryKeys.detail(id), updated)
      qc.invalidateQueries({ queryKey: inquiryKeys.lists() })
    },
    onError: (err) => {
      const latest = isApiError(err, 'VERSION_CONFLICT') ? (err.details?.current as Inquiry | undefined) : undefined
      if (latest) qc.setQueryData(inquiryKeys.detail(id), latest)
      else qc.invalidateQueries({ queryKey: inquiryKeys.detail(id) })
      qc.invalidateQueries({ queryKey: inquiryKeys.lists() })
    },
  })
}

export const useUpdateStatus = (id: string) =>
  useVersionedUpdate<{ status: InquiryStatus; version: number }>(id, 'status')

export const useUpdateAssignee = (id: string) =>
  useVersionedUpdate<{ assignedToId: number | null; version: number }>(id, 'assignee')

/** People an admin can assign to (the API only allows admins to call this). */
export function useAssignableUsers(enabled: boolean) {
  return useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => api<{ items: (PersonRef & { role: Role })[] }>('/users', { signal }),
    enabled,
    staleTime: 5 * 60_000,
  })
}

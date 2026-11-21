import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { isApiError } from '../api/client'
import { useCreateInquiry } from '../api/inquiries'
import { Alert } from '../components/Alert'
import { FormField } from '../components/FormField'
import { DESCRIPTION_MAX, validateInquiryForm, type InquiryForm, type InquiryFormErrors } from '../lib/inquirySchema'

const EMPTY: InquiryForm = { customerName: '', contact: '', subject: '', description: '' }
const FIELD_ORDER: (keyof InquiryForm)[] = ['customerName', 'contact', 'subject', 'description']

export function NewInquiryPage() {
  const navigate = useNavigate()
  const create = useCreateInquiry()
  const formRef = useRef<HTMLFormElement>(null)

  const [values, setValues] = useState<InquiryForm>(EMPTY)
  const [errors, setErrors] = useState<InquiryFormErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof InquiryForm, boolean>>>({})

  function update(name: keyof InquiryForm, value: string) {
    const next = { ...values, [name]: value }
    setValues(next)
    // Once a field has been visited, re-check it as the user types so the error disappears when fixed.
    if (touched[name]) setErrors((e) => ({ ...e, [name]: validateInquiryForm(next)[name] }))
  }

  function blur(name: keyof InquiryForm) {
    setTouched((t) => ({ ...t, [name]: true }))
    setErrors((e) => ({ ...e, [name]: validateInquiryForm(values)[name] }))
  }

  function focusFirstError(errs: InquiryFormErrors) {
    const first = FIELD_ORDER.find((f) => errs[f])
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
  }

  function save(confirmDuplicate = false) {
    create.mutate(
      { ...values, confirmDuplicate },
      {
        onSuccess: (inquiry) => navigate(`/inquiries/${inquiry.id}`, { state: { justCreated: true } }),
        onError: (err) => {
          // The server rejected a field our form allowed (rules can drift) - show it on that field.
          if (isApiError(err, 'VALIDATION_ERROR') && err.fields) {
            setErrors(err.fields as InquiryFormErrors)
            focusFirstError(err.fields as InquiryFormErrors)
          }
        },
      },
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errs = validateInquiryForm(values)
    setErrors(errs)
    setTouched({ customerName: true, contact: true, subject: true, description: true })
    if (Object.keys(errs).length > 0) {
      focusFirstError(errs)
      return
    }
    save()
  }

  const duplicateId = isApiError(create.error, 'POSSIBLE_DUPLICATE') ? (create.error.details?.existingId as number) : null
  const otherError =
    create.error && !duplicateId && !isApiError(create.error, 'VALIDATION_ERROR') ? create.error.message : null
  const hasErrors = Object.values(errors).some(Boolean)

  return (
    <section className="narrow">
      <p>
        <Link to="/inquiries">← Back to inquiries</Link>
      </p>
      <h1>New inquiry</h1>

      <form ref={formRef} className="card form" onSubmit={handleSubmit} noValidate>
        {hasErrors && <Alert tone="error">Please fix the highlighted fields before saving.</Alert>}

        {otherError && (
          <Alert tone="error" title="Could not save the inquiry">
            {otherError} Your details are still here - you can try again.
          </Alert>
        )}

        {duplicateId && (
          <Alert tone="warning" title="This looks like a duplicate">
            An inquiry with the same contact and subject was saved a few minutes ago (
            <Link to={`/inquiries/${duplicateId}`}>#{duplicateId}</Link>).
            <div className="alert__actions">
              <button type="button" className="btn" onClick={() => save(true)} disabled={create.isPending}>
                Save anyway
              </button>
              <Link to={`/inquiries/${duplicateId}`} className="btn btn--ghost">
                Open #{duplicateId}
              </Link>
            </div>
          </Alert>
        )}

        <FormField
          label="Customer name"
          name="customerName"
          autoComplete="off"
          value={values.customerName}
          onChange={(e) => update('customerName', e.target.value)}
          onBlur={() => blur('customerName')}
          error={errors.customerName}
        />
        <FormField
          label="Contact (email or phone)"
          name="contact"
          autoComplete="off"
          hint="How the team can reach the customer"
          value={values.contact}
          onChange={(e) => update('contact', e.target.value)}
          onBlur={() => blur('contact')}
          error={errors.contact}
        />
        <FormField
          label="Subject"
          name="subject"
          value={values.subject}
          onChange={(e) => update('subject', e.target.value)}
          onBlur={() => blur('subject')}
          error={errors.subject}
        />
        <FormField
          multiline
          label="Description"
          name="description"
          rows={5}
          maxLength={DESCRIPTION_MAX}
          hint={`${values.description.length} / ${DESCRIPTION_MAX} characters`}
          value={values.description}
          onChange={(e) => update('description', e.target.value)}
          onBlur={() => blur('description')}
          error={errors.description}
        />

        <div className="form__actions">
          <Link to="/inquiries" className="btn btn--ghost">
            Cancel
          </Link>
          {/* Disabled while saving: stops accidental double submits. */}
          <button type="submit" className="btn btn--primary" disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Save inquiry'}
          </button>
        </div>
      </form>
    </section>
  )
}

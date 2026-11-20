// A labelled input with its error message wired up for screen readers (aria-describedby).
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface BaseProps {
  label: string
  name: string
  error?: string
  hint?: string
}

type InputProps = BaseProps & { multiline?: false } & InputHTMLAttributes<HTMLInputElement>
type TextareaProps = BaseProps & { multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>

export function FormField(props: InputProps | TextareaProps) {
  const { label, name, error, hint, multiline, ...rest } = props
  const id = `field-${name}`
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined
  const common = { id, name, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy }

  return (
    <div className={`field${error ? ' field--invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea {...common} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...common} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {hint && !error && (
        <small id={`${id}-hint`} className="field__hint">
          {hint}
        </small>
      )}
      {error && (
        <small id={`${id}-error`} className="field__error">
          {error}
        </small>
      )}
    </div>
  )
}

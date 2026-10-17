// Мелкие переиспользуемые компоненты.

import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { formatRub, orderTotal, parseAge, plural, priceOf, ticketFor, TICKET_LABELS, type Participant } from './domain'

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
}

export function Field({ label, onChange, error, className = '', ...input }: FieldProps) {
  const id = useId()
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        {...input}
      />
      {error && (
        <span id={`${id}-error`} className="field__note">
          {error}
        </span>
      )}
    </div>
  )
}

export function OrderSummary({ participants }: { participants: Participant[] }) {
  return (
    <div className="summary">
      <ul className="summary__lines">
        {participants.map((p, i) => {
          const age = parseAge(p.age)
          return (
            <li key={p.id}>
              <span className="summary__who">
                {p.name.trim() || `Участник ${i + 1}`}
                <small>
                  {age === null
                    ? 'возраст не указан'
                    : `${TICKET_LABELS[ticketFor(age)]} · ${plural(age, 'год', 'года', 'лет')}`}
                </small>
              </span>
              <span>{age === null ? '—' : formatRub(priceOf(p))}</span>
            </li>
          )
        })}
      </ul>
      <div className="summary__total">
        <span>Итого, {plural(participants.length, 'билет', 'билета', 'билетов')}</span>
        <strong>{formatRub(orderTotal(participants))}</strong>
      </div>
    </div>
  )
}

/** Итог и кнопки шага. На телефоне прилипает к низу экрана. */
export function StepFooter({ participants, children }: { participants: Participant[]; children: ReactNode }) {
  return (
    <footer className="step-footer">
      <div className="step-footer__total">
        <small>{plural(participants.length, 'билет', 'билета', 'билетов')}</small>
        <strong>{formatRub(orderTotal(participants))}</strong>
      </div>
      <div className="step-footer__actions">{children}</div>
    </footer>
  )
}

/** Показать первую ошибку формы: поле получает фокус, общая ошибка — прокрутку. */
export function scrollToFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    const target = form?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    if (target instanceof HTMLInputElement) target.focus({ preventScroll: true })
  })
}

// Шаги мастера. Ошибка поля появляется, когда пользователь ушёл из него,
// и дальше обновляется при вводе. «Далее» подсвечивает все поля сразу.

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { confirmOrder, fetchSeats, SoldOutError, type EventInfo, type OrderResult } from './api'
import {
  AGE,
  createParticipant,
  formatRub,
  isOrderValid,
  parseAge,
  PARTICIPANTS,
  plural,
  PRICES,
  ticketFor,
  TICKET_LABELS,
  validateComposition,
  validateEmail,
  validateParticipant,
  type Participant,
} from './domain'
import { Field, OrderSummary, scrollToFirstError, StepFooter } from './ui'

export type Step = 'participants' | 'contact' | 'review'

// ---------- 1. Участники ----------

interface ParticipantsStepProps {
  participants: Participant[]
  onChange: (participants: Participant[]) => void
  seatsLeft: number
  onSeatsChange: (seatsLeft: number) => void
  onNext: () => void
}

export function ParticipantsStep({ participants, onChange, seatsLeft, onSeatsChange, onNext }: ParticipantsStepProps) {
  const [touched, setTouched] = useState<Set<string>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [checkingSeats, setCheckingSeats] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const isShown = (key: string) => submitted || touched.has(key)
  const touch = (key: string) => setTouched((prev) => new Set(prev).add(key))

  // Ошибку состава показываем, как только заполнены возрасты всех участников.
  const allAgesEntered = participants.every((p) => parseAge(p.age) !== null)
  const compositionError = submitted || allAgesEntered ? validateComposition(participants) : undefined

  const update = (id: string, patch: Partial<Participant>) =>
    onChange(participants.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  const notEnoughSeats = participants.length > seatsLeft

  // Актуальный остаток мест — при открытии шага и при изменении числа участников.
  useEffect(() => {
    let cancelled = false
    fetchSeats().then((seats) => !cancelled && onSeatsChange(seats))
    return () => {
      cancelled = true
    }
  }, [participants.length, onSeatsChange])

  // Перед переходом дальше уточняем у сервера, хватает ли мест.
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (!isOrderValid(participants)) return scrollToFirstError(formRef.current)

    setCheckingSeats(true)
    const seats = await fetchSeats()
    setCheckingSeats(false)
    onSeatsChange(seats)
    if (participants.length <= seats) onNext()
    else scrollToFirstError(formRef.current)
  }

  return (
    <form ref={formRef} className="step" onSubmit={submit} noValidate>
      <header className="step__head">
        <h2>Кто пойдёт</h2>
        <p className="muted">
          {formatRub(PRICES.full)} — от {AGE.childUnder} лет, {formatRub(PRICES.child)} — младше{' '}
          {AGE.childUnder}. Дети — только вместе с участником от {AGE.guardianFrom} лет.
        </p>
      </header>

      <ol className="participants">
        {participants.map((p, i) => {
          const errors = validateParticipant(p)
          const age = parseAge(p.age)
          const ticket = age === null ? null : ticketFor(age)
          return (
            <li key={p.id} className="card participant">
              <div className="participant__head">
                <h3>Участник {i + 1}</h3>
                {ticket && (
                  <span className={`badge badge--${ticket}`}>
                    {TICKET_LABELS[ticket]} · {formatRub(PRICES[ticket])}
                  </span>
                )}
                {participants.length > PARTICIPANTS.min && (
                  <button
                    type="button"
                    className="link-btn participant__remove"
                    onClick={() => onChange(participants.filter((x) => x.id !== p.id))}
                    aria-label={`Убрать участника ${i + 1}`}
                  >
                    Убрать
                  </button>
                )}
              </div>
              <div className="participant__fields">
                <Field
                  label="Имя"
                  value={p.name}
                  onChange={(name) => update(p.id, { name })}
                  onBlur={() => touch(`${p.id}:name`)}
                  error={isShown(`${p.id}:name`) ? errors.name : undefined}
                  placeholder="Анна"
                />
                <Field
                  label="Возраст"
                  value={p.age}
                  onChange={(v) => update(p.id, { age: v.replace(/\D/g, '').slice(0, 3) })}
                  onBlur={() => touch(`${p.id}:age`)}
                  error={isShown(`${p.id}:age`) ? errors.age : undefined}
                  inputMode="numeric"
                  placeholder="лет"
                />
              </div>
            </li>
          )
        })}
      </ol>

      {participants.length < PARTICIPANTS.max ? (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          onClick={() => onChange([...participants, createParticipant()])}
        >
          + Добавить участника
        </button>
      ) : (
        <p className="muted center">В одном заказе — не больше {PARTICIPANTS.max} участников</p>
      )}

      {notEnoughSeats && (
        <div className="notice notice--error" role="alert">
          <p>
            {seatsLeft === 0 ? (
              <strong>Места закончились.</strong>
            ) : (
              <>
                <strong>Мест не хватает.</strong> Осталось {plural(seatsLeft, 'место', 'места', 'мест')}, а в заказе{' '}
                {participants.length} — уберите лишних участников.
              </>
            )}
          </p>
        </div>
      )}

      {compositionError && (
        <p className="notice notice--error" role="alert">
          {compositionError}
        </p>
      )}

      <StepFooter participants={participants}>
        <button type="submit" className="btn btn--primary" disabled={checkingSeats}>
          {checkingSeats ? 'Проверяем места…' : 'Далее'}
        </button>
      </StepFooter>
    </form>
  )
}

// ---------- 2. Контакты ----------

interface ContactStepProps {
  email: string
  onChange: (email: string) => void
  participants: Participant[]
  onBack: () => void
  onNext: () => void
}

export function ContactStep({ email, onChange, participants, onBack, onNext }: ContactStepProps) {
  const [touched, setTouched] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const error = validateEmail(email)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!error) onNext()
    else scrollToFirstError(formRef.current)
  }

  return (
    <form ref={formRef} className="step" onSubmit={submit} noValidate>
      <header className="step__head">
        <h2>Куда прислать билеты</h2>
        <p className="muted">Один email на весь заказ — на него придут билеты всех участников.</p>
      </header>

      <div className="card">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={(v) => onChange(v.trim())}
          onBlur={() => setTouched(true)}
          error={touched ? error : undefined}
          autoComplete="email"
          placeholder="name@example.com"
          autoFocus
        />
      </div>

      <StepFooter participants={participants}>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          Назад
        </button>
        <button type="submit" className="btn btn--primary">
          Далее
        </button>
      </StepFooter>
    </form>
  )
}

// ---------- 3. Проверка и подтверждение ----------

interface ReviewStepProps {
  event: EventInfo
  participants: Participant[]
  email: string
  onEdit: (step: Step) => void
  onSoldOut: (seatsLeft: number) => void
  onConfirmed: (result: OrderResult) => void
}

export function ReviewStep({ event, participants, email, onEdit, onSoldOut, onConfirmed }: ReviewStepProps) {
  const [submitting, setSubmitting] = useState(false)
  // null — ошибки нет; число — сколько мест осталось на сервере; 'failed' — прочий сбой.
  const [error, setError] = useState<number | 'failed' | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // На телефоне ошибка может оказаться под нижней панелью — прокручиваем к ней.
  useEffect(() => {
    if (error !== null) errorRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [error])

  const confirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      onConfirmed(await confirmOrder(email, participants))
    } catch (e) {
      if (e instanceof SoldOutError) {
        setError(e.seatsLeft)
        onSoldOut(e.seatsLeft)
      } else {
        setError('failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="step">
      <header className="step__head">
        <h2>Проверьте заказ</h2>
        <p className="muted">
          {event.title} · {event.date}
        </p>
      </header>

      <div className="card">
        <div className="card__head">
          <h3>Участники</h3>
          <button type="button" className="link-btn" onClick={() => onEdit('participants')} disabled={submitting}>
            Изменить
          </button>
        </div>
        <OrderSummary participants={participants} />
      </div>

      <div className="card">
        <div className="card__head">
          <h3>Билеты придут на</h3>
          <button type="button" className="link-btn" onClick={() => onEdit('contact')} disabled={submitting}>
            Изменить
          </button>
        </div>
        <p className="email">{email}</p>
      </div>

      {error !== null && (
        <div ref={errorRef} className="notice notice--error" role="alert">
          {error === 'failed' ? (
            <p>Не удалось оформить заказ. Попробуйте ещё раз.</p>
          ) : error === 0 ? (
            <p>
              <strong>Места закончились.</strong> Пока вы оформляли заказ, последние билеты купили. Заказ не
              оформлен.
            </p>
          ) : (
            <>
              <p>
                <strong>Мест не хватает.</strong> Пока вы оформляли заказ, часть билетов купили — осталось{' '}
                {plural(error, 'место', 'места', 'мест')}, а в заказе {participants.length}.
              </p>
              <button type="button" className="btn btn--ghost btn--small" onClick={() => onEdit('participants')}>
                Изменить состав
              </button>
            </>
          )}
        </div>
      )}

      <StepFooter participants={participants}>
        <button type="button" className="btn btn--ghost" onClick={() => onEdit('contact')} disabled={submitting}>
          Назад
        </button>
        <button type="button" className="btn btn--primary" onClick={confirm} disabled={submitting}>
          {submitting ? 'Оформляем…' : error !== null ? 'Повторить' : 'Подтвердить'}
        </button>
      </StepFooter>
    </section>
  )
}

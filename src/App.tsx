import { useEffect, useState, useSyncExternalStore } from 'react'
import { demoServer, fetchEvent, INITIAL_SEATS, type EventInfo, type OrderResult } from './api'
import { createParticipant, plural, type Participant } from './domain'
import { ContactStep, ParticipantsStep, ReviewStep, type Step } from './steps'
import { OrderSummary } from './ui'

const STEPS: { id: Step; label: string }[] = [
  { id: 'participants', label: 'Участники' },
  { id: 'contact', label: 'Контакты' },
  { id: 'review', label: 'Проверка' },
]

export default function App() {
  const [event, setEvent] = useState<EventInfo | null>(null)
  // Свободные места по последнему ответу сервера — может устареть.
  const [seatsLeft, setSeatsLeft] = useState(0)

  const [step, setStep] = useState<Step>('participants')
  const [participants, setParticipants] = useState<Participant[]>(() => [createParticipant()])
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<OrderResult | null>(null)

  const loadEvent = () => {
    fetchEvent().then((res) => {
      setEvent(res.event)
      setSeatsLeft(res.seatsLeft)
    })
  }

  useEffect(loadEvent, [])
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [step, result])

  const startNewOrder = () => {
    setParticipants([createParticipant()])
    setEmail('')
    setResult(null)
    setStep('participants')
    loadEvent()
  }

  return (
    <>
      <DemoPanel />
      <div className="page">
        {!event ? (
          <p className="muted center pad">Загружаем мероприятие…</p>
        ) : (
          <>
            <header className="event">
              <p className="event__kicker">Покупка билетов</p>
              <h1>{event.title}</h1>
              <p className="muted">
                {event.date} · {event.venue}
              </p>
            </header>

            {result ? (
              <main className="layout layout--single">
                <section className="step result" aria-live="polite">
                  <div className="result__icon" aria-hidden>
                    ✓
                  </div>
                  <h2>Заказ оформлен</h2>
                  <p className="muted">
                    Номер заказа <strong className="mono">{result.orderId}</strong>. Билеты отправили на{' '}
                    <strong>{email}</strong>.
                  </p>
                  <div className="card ticket">
                    <h3>{event.title}</h3>
                    <p className="muted">
                      {event.date}
                      <br />
                      {event.venue}
                    </p>
                    <OrderSummary participants={participants} />
                  </div>
                  <button type="button" className="btn btn--ghost btn--block" onClick={startNewOrder}>
                    Оформить новый заказ
                  </button>
                </section>
              </main>
            ) : (
              <main className={`layout ${step === 'review' ? 'layout--single' : ''}`}>
                <div>
                  <Stepper current={step} />
                  {step === 'participants' && (
                    <ParticipantsStep
                      participants={participants}
                      onChange={setParticipants}
                      seatsLeft={seatsLeft}
                      onSeatsChange={setSeatsLeft}
                      onNext={() => setStep('contact')}
                    />
                  )}
                  {step === 'contact' && (
                    <ContactStep
                      email={email}
                      onChange={setEmail}
                      participants={participants}
                      onBack={() => setStep('participants')}
                      onNext={() => setStep('review')}
                    />
                  )}
                  {step === 'review' && (
                    <ReviewStep
                      event={event}
                      participants={participants}
                      email={email}
                      onEdit={setStep}
                      onSoldOut={setSeatsLeft}
                      onConfirmed={setResult}
                    />
                  )}
                </div>
                {step !== 'review' && (
                  <aside className="layout__aside card" aria-label="Ваш заказ">
                    <h3>Ваш заказ</h3>
                    <OrderSummary participants={participants} />
                  </aside>
                )}
              </main>
            )}
          </>
        )}
      </div>
    </>
  )
}

function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current)
  return (
    <ol className="stepper">
      {STEPS.map((s, i) => (
        <li
          key={s.id}
          className={i === currentIndex ? 'is-current' : i < currentIndex ? 'is-done' : ''}
          aria-current={i === currentIndex ? 'step' : undefined}
        >
          <span className="stepper__num">{i < currentIndex ? '✓' : i + 1}</span>
          {s.label}
        </li>
      ))}
    </ol>
  )
}

/** Пульт «сервера» для демо: клиент узнаёт об изменениях только при подтверждении заказа. */
function DemoPanel() {
  const seats = useSyncExternalStore(demoServer.subscribe, demoServer.getSeats)
  const change = (delta: number) => demoServer.setSeats(demoServer.getSeats() + delta)

  return (
    <details className="demo" open>
      <summary>
        Демо-сервер · свободно <strong>{plural(seats, 'место', 'места', 'мест')}</strong>
      </summary>
      <div className="demo__body">
        <div className="demo__stepper">
          <button type="button" onClick={() => change(-1)} aria-label="Уменьшить">
            −
          </button>
          <span>{seats}</span>
          <button type="button" onClick={() => change(1)} aria-label="Увеличить">
            +
          </button>
        </div>
        <button type="button" onClick={() => demoServer.setSeats(INITIAL_SEATS)}>
          Сброс
        </button>
      </div>
    </details>
  )
}

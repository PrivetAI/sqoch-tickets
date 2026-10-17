// Мок бэкенда в памяти вкладки. Клиент знает о свободных местах только из ответов API,
// финальная проверка — на «сервере» в момент подтверждения.

import { isOrderValid, orderTotal, validateEmail, type Participant } from './domain'

export interface EventInfo {
  title: string
  date: string
  venue: string
}

export class SoldOutError extends Error {
  readonly seatsLeft: number
  constructor(seatsLeft: number) {
    super('Not enough seats')
    this.seatsLeft = seatsLeft
  }
}

const EVENT: EventInfo = {
  title: 'Ночь в планетарии: концерт под звёздами',
  date: '15 ноября 2026, 19:00',
  venue: 'Москва, Садовая-Кудринская, 5',
}

export const INITIAL_SEATS = 12
let seatsLeft = INITIAL_SEATS

const delay = () => new Promise((r) => setTimeout(r, 700))

export async function fetchEvent() {
  await delay()
  return { event: EVENT, seatsLeft }
}

export async function fetchSeats() {
  await delay()
  return seatsLeft
}

export async function confirmOrder(email: string, participants: Participant[]) {
  await delay()
  // Сервер не доверяет клиенту: перепроверяет правила и сам считает сумму.
  if (validateEmail(email) || !isOrderValid(participants)) throw new Error('Invalid order')
  if (participants.length > seatsLeft) throw new SoldOutError(seatsLeft)

  seatsLeft -= participants.length
  emit()
  return {
    orderId: `SQ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    total: orderTotal(participants),
  }
}

export type OrderResult = Awaited<ReturnType<typeof confirmOrder>>

// ---------- Пульт «сервера» для демо-панели — не часть клиентского API ----------

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const demoServer = {
  getSeats: () => seatsLeft,
  setSeats(n: number) {
    seatsLeft = Math.max(0, n)
    emit()
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

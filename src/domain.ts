// Бизнес-правила заказа: константы, валидация, расчёт. Без React.

export const PARTICIPANTS = { min: 1, max: 4 } as const
export const AGE = {
  childUnder: 14, // младше — детский билет
  guardianFrom: 18, // с этого возраста можно сопровождать ребёнка
  max: 120,
} as const
export const PRICES = { full: 2000, child: 1000 } as const

export type TicketType = keyof typeof PRICES
export const TICKET_LABELS: Record<TicketType, string> = { full: 'Полный', child: 'Детский' }

/** Участник в форме: возраст хранится строкой, как его ввёл пользователь. */
export interface Participant {
  id: string
  name: string
  age: string
}

let nextId = 1
export const createParticipant = (): Participant => ({ id: `p${nextId++}`, name: '', age: '' })

export function parseAge(raw: string): number | null {
  if (!/^\d{1,3}$/.test(raw)) return null
  const age = Number(raw)
  return age <= AGE.max ? age : null
}

export const ticketFor = (age: number): TicketType => (age < AGE.childUnder ? 'child' : 'full')

// ---------- Валидация ----------

export function validateParticipant(p: Participant): { name?: string; age?: string } {
  return {
    name: p.name.trim() ? undefined : 'Укажите имя',
    age: !p.age ? 'Укажите возраст' : parseAge(p.age) === null ? `Число от 0 до ${AGE.max}` : undefined,
  }
}

/** Ошибка состава заказа в целом, а не отдельного поля. */
export function validateComposition(participants: Participant[]): string | undefined {
  const ages = participants.map((p) => parseAge(p.age)).filter((a) => a !== null)
  const hasChild = ages.some((a) => a < AGE.childUnder)
  const hasGuardian = ages.some((a) => a >= AGE.guardianFrom)
  if (hasChild && !hasGuardian) {
    return `Участник младше ${AGE.childUnder} лет может пройти только вместе с участником от ${AGE.guardianFrom} лет в этом же заказе`
  }
}

export function validateEmail(email: string): string | undefined {
  if (!email) return 'Укажите email'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'Проверьте формат: name@example.com'
}

export const isOrderValid = (participants: Participant[]) =>
  participants.length >= PARTICIPANTS.min &&
  participants.length <= PARTICIPANTS.max &&
  participants.every((p) => {
    const e = validateParticipant(p)
    return !e.name && !e.age
  }) &&
  !validateComposition(participants)

// ---------- Расчёт ----------

export const priceOf = (p: Participant): number => {
  const age = parseAge(p.age)
  return age === null ? 0 : PRICES[ticketFor(age)]
}

export const orderTotal = (participants: Participant[]) => participants.reduce((sum, p) => sum + priceOf(p), 0)

// ---------- Форматирование ----------

const rub = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })
export const formatRub = (amount: number) => rub.format(amount)

/** plural(5, 'билет', 'билета', 'билетов') → '5 билетов' */
export function plural(n: number, one: string, few: string, many: string): string {
  const [m10, m100] = [n % 10, n % 100]
  const word = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many
  return `${n} ${word}`
}

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** Data de hoje no fuso do computador, no formato AAAA-MM-DD. */
export function hojeISO(): string {
  const d = new Date()
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

/** AAAA-MM-DD -> DD/MM/AAAA */
export function fmtData(v: string | null | undefined): string {
  if (!v) return '—'
  // data com hora (ex.: quando foi criado): mostra o dia no fuso do computador
  if (v.length > 10) {
    const dt = new Date(v)
    if (!Number.isNaN(dt.getTime())) v = iso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate())
  }
  const [y, m, d] = v.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** Soma meses mantendo o dia (ou o último dia do mês, se não existir). */
export function addMeses(v: string, n: number): string {
  const [y, m, d] = v.split('-').map(Number)
  const alvo = new Date(y, m - 1 + n, 1)
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  return iso(alvo.getFullYear(), alvo.getMonth() + 1, Math.min(d, ultimo))
}

export function addDias(v: string, n: number): string {
  const [y, m, d] = v.split('-').map(Number)
  const alvo = new Date(y, m - 1, d + n)
  return iso(alvo.getFullYear(), alvo.getMonth() + 1, alvo.getDate())
}

export type Periodo = 'mes' | 'mes_passado' | 'ano' | 'tudo'

/** Intervalo [de, ate] do período, ou null para "tudo". */
export function intervalo(p: Periodo, hoje = hojeISO()): [string, string] | null {
  if (p === 'tudo') return null
  const [y, m] = hoje.split('-').map(Number)
  if (p === 'ano') return [iso(y, 1, 1), iso(y, 12, 31)]
  const base = p === 'mes' ? new Date(y, m - 1, 1) : new Date(y, m - 2, 1)
  const by = base.getFullYear()
  const bm = base.getMonth() + 1
  return [iso(by, bm, 1), iso(by, bm, new Date(by, bm, 0).getDate())]
}

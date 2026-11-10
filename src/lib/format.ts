const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function moeda(v: number): string {
  return brl.format(v || 0)
}

export function arred(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100
}

/** Aceita "1.234,56", "1234,56", "1234.56" e "R$ 1.234,56". Devolve null se não for número. */
export function parseValor(txt: string): number | null {
  let s = txt.replace(/[R$\s]/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null
  return arred(Number(s))
}

/** Número para colocar em campo de digitação: 1234.5 -> "1234,50" */
export function valorCampo(v: number | null | undefined): string {
  if (v === null || v === undefined) return ''
  return v.toFixed(2).replace('.', ',')
}

/** Tira acentos e deixa minúsculo, para comparar e buscar nomes. */
export function normalizar(s: string | null | undefined): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

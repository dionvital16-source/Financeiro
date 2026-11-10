import { hojeISO } from './dates'
import { arred } from './format'
import type { Nota, Orcamento, Papel, Parcela } from './types'

export type SituacaoParcela = 'Recebida' | 'Atrasada' | 'A receber'
export type SituacaoOrcamento = 'Pago' | 'Parcial' | 'Em aberto'

export function situacaoParcela(p: Parcela, hoje = hojeISO()): SituacaoParcela {
  if (p.pago_em) return 'Recebida'
  return p.vencimento < hoje ? 'Atrasada' : 'A receber'
}

export interface Resumo {
  recebido: number
  /** lançado e ainda não recebido (inclui o atrasado) */
  previsto: number
  atrasado: number
  /** valor do orçamento que ainda não recebeu */
  falta: number
  /** valor do orçamento que ainda não tem parcela lançada */
  semLancar: number
  situacao: SituacaoOrcamento
  temAtraso: boolean
  temNota: boolean
  valorNotas: number
}

export function resumir(o: Orcamento, parcelas: Parcela[], notas: Nota[], hoje = hojeISO()): Resumo {
  let recebido = 0
  let previsto = 0
  let atrasado = 0
  for (const p of parcelas) {
    if (p.pago_em) recebido += p.valor
    else {
      previsto += p.valor
      if (p.vencimento < hoje) atrasado += p.valor
    }
  }
  recebido = arred(recebido)
  previsto = arred(previsto)
  atrasado = arred(atrasado)
  const situacao: SituacaoOrcamento =
    o.valor > 0 && recebido >= o.valor - 0.005 ? 'Pago' : recebido > 0 ? 'Parcial' : 'Em aberto'
  return {
    recebido,
    previsto,
    atrasado,
    falta: Math.max(0, arred(o.valor - recebido)),
    semLancar: Math.max(0, arred(o.valor - recebido - previsto)),
    situacao,
    temAtraso: atrasado > 0,
    temNota: notas.length > 0,
    valorNotas: arred(notas.reduce((s, n) => s + n.valor, 0)),
  }
}

export function agrupar<T extends { orcamento_id: string }>(lista: T[]): Map<string, T[]> {
  const m = new Map<string, T[]>()
  for (const x of lista) {
    const a = m.get(x.orcamento_id)
    if (a) a.push(x)
    else m.set(x.orcamento_id, [x])
  }
  return m
}

/* O banco confere tudo de novo; isto aqui só decide o que a tela mostra. */
export const pode = {
  gerirOrcamentos: (p: Papel) => p === 'Admin' || p === 'Financeiro',
  apagar: (p: Papel) => p === 'Admin',
  administrar: (p: Papel) => p === 'Admin',
}

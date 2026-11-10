import { useMemo } from 'react'
import { hojeISO } from '../lib/dates'
import { agrupar, resumir, type Resumo, type SituacaoParcela } from '../lib/regras'
import { useDados } from '../state/DataContext'
import { Selo } from './ui'

/** Resumo financeiro de cada orçamento visível, por id. */
export function useResumos(): Map<string, Resumo> {
  const { orcamentos, parcelas, notas } = useDados()
  return useMemo(() => {
    const pp = agrupar(parcelas)
    const nn = agrupar(notas)
    const hoje = hojeISO()
    const m = new Map<string, Resumo>()
    for (const o of orcamentos) m.set(o.id, resumir(o, pp.get(o.id) ?? [], nn.get(o.id) ?? [], hoje))
    return m
  }, [orcamentos, parcelas, notas])
}

export function SeloOrcamento({ r }: { r: Resumo }) {
  return (
    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <Selo tom={r.situacao === 'Pago' ? 'verde' : 'neutro'}>{r.situacao}</Selo>
      {r.temAtraso && <Selo tom="ink">Atrasado</Selo>}
    </span>
  )
}

export function SeloNota({ r }: { r: Resumo }) {
  return <Selo tom={r.temNota ? 'verde' : 'neutro'}>{r.temNota ? 'Com nota' : 'Sem nota'}</Selo>
}

export function SeloParcela({ s }: { s: SituacaoParcela }) {
  return <Selo tom={s === 'Recebida' ? 'verde' : s === 'Atrasada' ? 'ink' : 'neutro'}>{s}</Selo>
}

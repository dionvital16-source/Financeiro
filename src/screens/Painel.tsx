import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useResumos } from '../components/Selos'
import { Blueprint, Cabecalho, Chip, Stat, Vazio } from '../components/ui'
import { addDias, fmtData, hojeISO, intervalo, type Periodo } from '../lib/dates'
import { arred, moeda } from '../lib/format'
import type { Orcamento, Parcela } from '../lib/types'
import { useDados } from '../state/DataContext'

const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'mes_passado', rotulo: 'Mês passado' },
  { id: 'ano', rotulo: 'Este ano' },
  { id: 'tudo', rotulo: 'Tudo' },
]

export function Painel() {
  const { orcamentos, parcelas, formas } = useDados()
  const resumos = useResumos()
  const nav = useNavigate()
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const hoje = hojeISO()

  const doPeriodo = useMemo(() => {
    const faixa = intervalo(periodo, hoje)
    return faixa ? orcamentos.filter((o) => o.data_fechamento >= faixa[0] && o.data_fechamento <= faixa[1]) : orcamentos
  }, [orcamentos, periodo, hoje])

  const tot = useMemo(() => {
    let fechado = 0
    let recebido = 0
    let falta = 0
    let semNota = 0
    for (const o of doPeriodo) {
      const r = resumos.get(o.id)
      if (!r) continue
      fechado += o.valor
      recebido += r.recebido
      falta += r.falta
      if (!r.temNota) semNota++
    }
    return { fechado: arred(fechado), recebido: arred(recebido), falta: arred(falta), semNota }
  }, [doPeriodo, resumos])

  const porId = useMemo(() => new Map(orcamentos.map((o) => [o.id, o])), [orcamentos])
  const abertas = parcelas.filter((p) => !p.pago_em)
  const atrasadas = abertas.filter((p) => p.vencimento < hoje)
  const limite = addDias(hoje, 30)
  const proximas = abertas.filter((p) => p.vencimento >= hoje && p.vencimento <= limite)
  const totalAtrasado = arred(atrasadas.reduce((s, p) => s + p.valor, 0))
  const semNota = doPeriodo.filter((o) => !resumos.get(o.id)?.temNota)
  const nomeForma = (id: string) => formas.find((f) => f.id === id)?.nome ?? '—'

  const linhaParcela = (p: Parcela) => {
    const o: Orcamento | undefined = porId.get(p.orcamento_id)
    return (
      <div key={p.id} className="lista-row hover-row" style={{ cursor: 'pointer', padding: '0 6px' }} onClick={() => nav(`/orcamentos/${p.orcamento_id}`)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="ellipsis" style={{ fontWeight: 500 }}>
            {o?.cliente ?? '—'}
          </div>
          <div className="label-up ellipsis">
            {o?.codigo} · {p.descricao || 'Parcela'} · {nomeForma(p.forma_id)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 500 }}>{moeda(p.valor)}</div>
          <div className="label-up">{fmtData(p.vencimento)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <Cabecalho kicker="Visão geral" titulo="Painel" />
      <div className="row">
        {PERIODOS.map((p) => (
          <Chip key={p.id} on={periodo === p.id} onClick={() => setPeriodo(p.id)}>
            {p.rotulo}
          </Chip>
        ))}
        <span className="muted" style={{ fontSize: 13 }}>
          Pela data de fechamento do orçamento
        </span>
      </div>

      <div className="stats">
        <Stat rotulo="Fechado" valor={moeda(tot.fechado)} nota={`${doPeriodo.length} orçamento(s)`} />
        <Stat rotulo="Recebido" valor={moeda(tot.recebido)} tom="verde" />
        <Stat rotulo="Falta receber" valor={moeda(tot.falta)} />
        <Stat rotulo="Sem nota fiscal" valor={tot.semNota} nota="orçamento(s) no período" />
        <Stat
          rotulo="Atrasado hoje"
          valor={moeda(totalAtrasado)}
          nota={`${atrasadas.length} parcela(s), todos os períodos`}
          tom={totalAtrasado > 0 ? 'ink' : undefined}
        />
      </div>

      <div className="grid-2">
        <Blueprint className="card">
          <div className="card-head">
            <h3>Parcelas atrasadas</h3>
          </div>
          {atrasadas.length ? atrasadas.map(linhaParcela) : <Vazio>Nenhuma parcela atrasada.</Vazio>}
        </Blueprint>
        <Blueprint className="card">
          <div className="card-head">
            <h3>Vencem nos próximos 30 dias</h3>
          </div>
          {proximas.length ? proximas.map(linhaParcela) : <Vazio>Nenhuma parcela a vencer. Lance as parcelas dentro de cada orçamento.</Vazio>}
        </Blueprint>
      </div>

      <Blueprint className="card">
        <div className="card-head">
          <h3>Orçamentos sem nota fiscal no período</h3>
        </div>
        {semNota.length ? (
          semNota.map((o) => (
            <div key={o.id} className="lista-row hover-row" style={{ cursor: 'pointer', padding: '0 6px' }} onClick={() => nav(`/orcamentos/${o.id}`)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ellipsis" style={{ fontWeight: 500 }}>
                  {o.cliente}
                </div>
                <div className="label-up ellipsis">
                  {o.codigo} · {fmtData(o.data_fechamento)} · {o.vendedor_nome ?? 'sem vendedor'}
                </div>
              </div>
              <div style={{ fontWeight: 500 }}>{moeda(o.valor)}</div>
            </div>
          ))
        ) : (
          <Vazio>Todos os orçamentos do período têm nota fiscal lançada.</Vazio>
        )}
      </Blueprint>
    </div>
  )
}

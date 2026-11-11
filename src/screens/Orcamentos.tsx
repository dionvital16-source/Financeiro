import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileUp, Plus } from 'lucide-react'
import { OrcamentoForm } from '../components/OrcamentoForm'
import { SeloNota, SeloOrcamento, useResumos } from '../components/Selos'
import { Blueprint, Cabecalho, Chip, Vazio } from '../components/ui'
import { fmtData } from '../lib/dates'
import { arred, moeda, normalizar } from '../lib/format'
import { pode } from '../lib/regras'
import { useAuth } from '../state/AuthContext'
import { useDados } from '../state/DataContext'

type FSit = 'todos' | 'Em aberto' | 'Parcial' | 'Pago' | 'atrasado'
type FNota = 'todas' | 'com' | 'sem'

export function Orcamentos() {
  const { orcamentos } = useDados()
  const { perfil } = useAuth()
  const resumos = useResumos()
  const nav = useNavigate()
  const [sit, setSit] = useState<FSit>('todos')
  const [nota, setNota] = useState<FNota>('todas')
  const [busca, setBusca] = useState('')
  const [vendedor, setVendedor] = useState('')
  const [novo, setNovo] = useState(false)
  const gestor = perfil ? pode.gerirOrcamentos(perfil.papel) : false

  const vendedores = useMemo(
    () => [...new Set(orcamentos.map((o) => o.vendedor_nome).filter((v): v is string => Boolean(v)))].sort(),
    [orcamentos],
  )

  const conta = useMemo(() => {
    const c = { todos: orcamentos.length, 'Em aberto': 0, Parcial: 0, Pago: 0, atrasado: 0 }
    for (const o of orcamentos) {
      const r = resumos.get(o.id)
      if (!r) continue
      c[r.situacao]++
      if (r.temAtraso) c.atrasado++
    }
    return c
  }, [orcamentos, resumos])

  const lista = useMemo(() => {
    const q = normalizar(busca)
    return orcamentos.filter((o) => {
      const r = resumos.get(o.id)
      if (!r) return false
      if (sit === 'atrasado' ? !r.temAtraso : sit !== 'todos' && r.situacao !== sit) return false
      if (nota === 'com' && !r.temNota) return false
      if (nota === 'sem' && r.temNota) return false
      if (vendedor && o.vendedor_nome !== vendedor) return false
      if (q && !normalizar(`${o.cliente} ${o.codigo} ${o.obra ?? ''}`).includes(q)) return false
      return true
    })
  }, [orcamentos, resumos, sit, nota, busca, vendedor])

  const total = arred(lista.reduce((s, o) => s + o.valor, 0))
  const recebido = arred(lista.reduce((s, o) => s + (resumos.get(o.id)?.recebido ?? 0), 0))

  const SITS: { id: FSit; rotulo: string }[] = [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'Em aberto', rotulo: 'Em aberto' },
    { id: 'Parcial', rotulo: 'Parcial' },
    { id: 'Pago', rotulo: 'Pago' },
    { id: 'atrasado', rotulo: 'Com atraso' },
  ]

  return (
    <div className="page">
      <Cabecalho kicker="Vendas fechadas" titulo="Clientes">
        {gestor && (
          <>
            <Link to="/importar" className="btn btn-secondary">
              <FileUp size={17} strokeWidth={1.5} />
              Importar XML
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setNovo(true)}>
              <Plus size={17} strokeWidth={1.5} />
              Novo orçamento
            </button>
          </>
        )}
      </Cabecalho>

      <div className="col" style={{ gap: 10 }}>
        <div className="row">
          {SITS.map((s) => (
            <Chip key={s.id} on={sit === s.id} n={conta[s.id]} onClick={() => setSit(s.id)}>
              {s.rotulo}
            </Chip>
          ))}
        </div>
        <div className="row">
          <Chip on={nota === 'todas'} onClick={() => setNota('todas')}>
            Todas
          </Chip>
          <Chip on={nota === 'com'} onClick={() => setNota('com')}>
            Com nota
          </Chip>
          <Chip on={nota === 'sem'} onClick={() => setNota('sem')}>
            Sem nota
          </Chip>
          <input
            className="input"
            style={{ flex: '1 1 220px', maxWidth: 340, minHeight: 36 }}
            placeholder="Buscar cliente, código ou obra"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          {gestor && vendedores.length > 1 && (
            <select className="input" style={{ width: 'auto', minHeight: 36 }} value={vendedor} onChange={(e) => setVendedor(e.target.value)} aria-label="Vendedor">
              <option value="">Todos os vendedores</option>
              {vendedores.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {lista.length === 0 ? (
        <Vazio>
          {orcamentos.length === 0
            ? gestor
              ? 'Nenhum orçamento ainda. Importe o XML de vendas do CEM ou clique em "Novo orçamento".'
              : 'Nenhum orçamento seu por aqui ainda. Eles aparecem quando o financeiro importar as vendas.'
            : 'Nenhum orçamento com esses filtros.'}
        </Vazio>
      ) : (
        <Blueprint className="card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Fechado em</th>
                  <th>Vendedor</th>
                  <th className="num">Valor</th>
                  <th className="num">Recebido</th>
                  <th>Pagamento</th>
                  <th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((o) => {
                  const r = resumos.get(o.id)!
                  return (
                    <tr key={o.id} className="hover-row clicavel" onClick={() => nav(`/orcamentos/${o.id}`)}>
                      <td className="nowrap">
                        <Link to={`/orcamentos/${o.id}`} onClick={(e) => e.stopPropagation()}>
                          {o.codigo}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{o.cliente}</div>
                        {o.obra && <div className="label-up">{o.obra}</div>}
                      </td>
                      <td className="nowrap">{fmtData(o.data_fechamento)}</td>
                      <td>{o.vendedor_nome ?? '—'}</td>
                      <td className="num">{moeda(o.valor)}</td>
                      <td className="num">{moeda(r.recebido)}</td>
                      <td>
                        <SeloOrcamento r={r} />
                      </td>
                      <td>
                        <SeloNota r={r} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 24, marginTop: 14, fontSize: 14 }}>
            <span>
              <span className="label-up">Clientes </span>
              <b>{lista.length}</b>
            </span>
            <span>
              <span className="label-up">Valor </span>
              <b>{moeda(total)}</b>
            </span>
            <span>
              <span className="label-up">Recebido </span>
              <b>{moeda(recebido)}</b>
            </span>
          </div>
        </Blueprint>
      )}

      {novo && <OrcamentoForm onFechar={() => setNovo(false)} onSalvo={(o) => nav(`/orcamentos/${o.id}`)} />}
    </div>
  )
}

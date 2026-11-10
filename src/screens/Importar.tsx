import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp } from 'lucide-react'
import { Blueprint, Cabecalho, Selo, Vazio } from '../components/ui'
import { lerArquivoCem, type OrcamentoCem } from '../lib/cemXml'
import { hojeISO } from '../lib/dates'
import { moeda } from '../lib/format'
import { mensagemErro } from '../lib/supabase'
import { acharVendedor, useDados } from '../state/DataContext'
import { useToast } from '../state/ToastContext'

interface Linha {
  arquivo: string
  dados?: OrcamentoCem
  erro?: string
  existe: boolean
  vendedor_id: string
  data: string
}

export function Importar() {
  const { orcamentos, perfis, gravar } = useDados()
  const { avisar } = useToast()
  const nav = useNavigate()
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [ocupado, setOcupado] = useState(false)
  const ativos = perfis.filter((p) => p.ativo)

  async function escolher(arquivos: FileList | null) {
    if (!arquivos?.length) return
    const existentes = new Set(orcamentos.map((o) => o.codigo.toUpperCase()))
    const vistos = new Set<string>()
    const novas: Linha[] = []
    for (const a of Array.from(arquivos)) {
      try {
        const dados = await lerArquivoCem(a)
        const cod = dados.codigo.toUpperCase()
        const existe = existentes.has(cod) || vistos.has(cod)
        vistos.add(cod)
        novas.push({ arquivo: a.name, dados, existe, vendedor_id: acharVendedor(ativos, dados.vendedor_nome) ?? '', data: hojeISO() })
      } catch (e) {
        novas.push({ arquivo: a.name, erro: mensagemErro(e), existe: false, vendedor_id: '', data: hojeISO() })
      }
    }
    setLinhas(novas)
  }

  const mudar = (i: number, m: Partial<Linha>) => setLinhas((ls) => ls.map((l, n) => (n === i ? { ...l, ...m } : l)))
  const prontas = linhas.filter((l) => l.dados && !l.existe)

  async function importar() {
    setOcupado(true)
    let ok = 0
    const resto: Linha[] = []
    for (const l of linhas) {
      if (!l.dados || l.existe) {
        resto.push(l)
        continue
      }
      try {
        const vendedor = perfis.find((p) => p.id === l.vendedor_id)
        await gravar('orcamentos', {
          ...l.dados,
          vendedor_id: vendedor?.id ?? null,
          vendedor_nome: vendedor?.nome ?? l.dados.vendedor_nome,
          data_fechamento: l.data,
          origem: 'cem',
        })
        ok++
      } catch (e) {
        resto.push({ ...l, dados: undefined, erro: mensagemErro(e) })
      }
    }
    setOcupado(false)
    const falhas = resto.filter((l) => l.erro).length
    if (ok) avisar(`${ok} orçamento(s) importado(s).${falhas ? ` ${falhas} com erro.` : ''}`)
    if (ok && !falhas) nav('/orcamentos')
    else setLinhas(resto)
  }

  return (
    <div className="page">
      <Cabecalho kicker="Sistema CEM" titulo="Importar XML de vendas" />
      <Blueprint className="card col">
        <p>
          Escolha um ou mais arquivos XML de venda exportados do CEM. O site lê o código da obra, o cliente, o vendedor e soma o valor dos itens. Nada é
          gravado antes de você conferir e clicar em importar.
        </p>
        <label className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          <FileUp size={17} strokeWidth={1.5} />
          Escolher arquivos XML
          <input
            type="file"
            accept=".xml,text/xml,application/xml"
            multiple
            hidden
            onChange={(e) => {
              void escolher(e.target.files)
              e.target.value = ''
            }}
          />
        </label>
      </Blueprint>

      {linhas.length === 0 ? (
        <Vazio>Nenhum arquivo escolhido ainda.</Vazio>
      ) : (
        <Blueprint className="card">
          <div className="card-head">
            <h3>Conferência</h3>
            <div className="row">
              <button type="button" className="btn btn-secondary" onClick={() => setLinhas([])}>
                Limpar
              </button>
              <button type="button" className="btn btn-primary" disabled={ocupado || prontas.length === 0} onClick={() => void importar()}>
                {ocupado ? 'Importando…' : `Importar ${prontas.length} orçamento(s)`}
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Fechado em</th>
                  <th className="num">Itens</th>
                  <th className="num">Valor</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l, i) =>
                  l.dados ? (
                    <tr key={i}>
                      <td className="nowrap">{l.dados.codigo}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{l.dados.cliente}</div>
                        <div className="label-up">{[l.dados.obra, l.dados.cidade].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td>
                        <select className="input" style={{ minHeight: 36, minWidth: 160 }} disabled={l.existe} value={l.vendedor_id} onChange={(e) => mudar(i, { vendedor_id: e.target.value })}>
                          <option value="">{l.dados.vendedor_nome ? `${l.dados.vendedor_nome} (sem login)` : 'Sem vendedor'}</option>
                          {ativos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input className="input" style={{ minHeight: 36 }} type="date" required disabled={l.existe} value={l.data} onChange={(e) => mudar(i, { data: e.target.value || hojeISO() })} />
                      </td>
                      <td className="num">{l.dados.itens.length}</td>
                      <td className="num">{moeda(l.dados.valor)}</td>
                      <td>{l.existe ? <Selo tom="ink">Já existe</Selo> : <Selo tom="verde">Novo</Selo>}</td>
                    </tr>
                  ) : (
                    <tr key={i}>
                      <td colSpan={6}>
                        <div style={{ fontWeight: 500 }}>{l.arquivo}</div>
                        <div className="erro-txt">{l.erro}</div>
                      </td>
                      <td>
                        <Selo tom="ink">Erro</Selo>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            O XML do CEM não traz a data da venda: confira a data de fechamento de cada linha. Orçamento com código que já existe não é importado de novo.
            O vendedor escolhido é quem vai enxergar o orçamento; "sem login" guarda só o nome.
          </p>
        </Blueprint>
      )}
    </div>
  )
}

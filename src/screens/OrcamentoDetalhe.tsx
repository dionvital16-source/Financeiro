import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Download, Paperclip, Pencil, Plus, Trash2 } from 'lucide-react'
import { OrcamentoForm } from '../components/OrcamentoForm'
import { SeloNota, SeloOrcamento, SeloParcela, useResumos } from '../components/Selos'
import { Blueprint, Cabecalho, Campo, Confirmar, Modal, Stat, Vazio } from '../components/ui'
import { addMeses, fmtData, hojeISO } from '../lib/dates'
import { arred, moeda, parseValor, valorCampo } from '../lib/format'
import { pode, situacaoParcela } from '../lib/regras'
import type { Nota, Orcamento, Parcela } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useDados } from '../state/DataContext'
import { useToast } from '../state/ToastContext'

/* ---------- parcela ---------- */

function ParcelaForm({ orcamento, atual, sugestao, onFechar }: { orcamento: Orcamento; atual?: Parcela; sugestao: number; onFechar: () => void }) {
  const { formas, gravar } = useDados()
  const { avisar, avisarErro } = useToast()
  const opcoes = formas.filter((x) => x.ativo || x.id === atual?.forma_id)
  const [f, setF] = useState({
    descricao: atual?.descricao ?? '',
    forma_id: atual?.forma_id ?? opcoes[0]?.id ?? '',
    valor: valorCampo(atual?.valor ?? (sugestao > 0 ? sugestao : null)),
    vencimento: atual?.vencimento ?? hojeISO(),
    qtd: '1',
    pago: Boolean(atual?.pago_em),
    pago_em: atual?.pago_em ?? hojeISO(),
    observacao: atual?.observacao ?? '',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }))
  const qtd = Math.min(60, Math.max(1, Math.floor(Number(f.qtd)) || 1))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const valor = parseValor(f.valor)
    if (valor === null || valor <= 0) return setErro('Informe o valor, por exemplo 1.500,00.')
    if (!f.forma_id) return setErro('Escolha a forma de pagamento.')
    setErro(null)
    setOcupado(true)
    try {
      const base = {
        orcamento_id: orcamento.id,
        forma_id: f.forma_id,
        valor,
        observacao: f.observacao.trim() || null,
      }
      if (atual) {
        await gravar('parcelas', {
          id: atual.id,
          forma_id: base.forma_id,
          valor,
          observacao: base.observacao,
          descricao: f.descricao.trim() || null,
          vencimento: f.vencimento,
          pago_em: f.pago ? f.pago_em : null,
        })
        avisar('Parcela alterada.')
      } else {
        for (let i = 0; i < qtd; i++) {
          const nome = f.descricao.trim()
          await gravar('parcelas', {
            ...base,
            descricao: qtd > 1 ? `${nome ? nome + ' ' : ''}${i + 1}/${qtd}` : nome || null,
            vencimento: addMeses(f.vencimento, i),
            pago_em: f.pago && i === 0 ? f.pago_em : null,
          })
        }
        avisar(qtd > 1 ? `${qtd} parcelas lançadas.` : 'Parcela lançada.')
      }
      onFechar()
    } catch (err) {
      avisarErro(err)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal titulo={atual ? 'Alterar parcela' : 'Lançar pagamento'} onFechar={onFechar}>
      {opcoes.length === 0 ? (
        <Vazio>Nenhuma forma de pagamento cadastrada. Peça ao administrador para cadastrar em "Formas de pagamento".</Vazio>
      ) : (
        <form className="col" onSubmit={salvar}>
          <div className="form-grid">
            <Campo rotulo="Descrição (ex.: Entrada)">
              <input className="input" maxLength={80} value={f.descricao} onChange={(e) => set('descricao', e.target.value)} />
            </Campo>
            <Campo rotulo="Forma de pagamento">
              <select className="input" value={f.forma_id} onChange={(e) => set('forma_id', e.target.value)}>
                {opcoes.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.nome}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo={qtd > 1 ? 'Valor de cada parcela (R$)' : 'Valor (R$)'} erro={erro}>
              <input className={`input ${erro ? 'erro' : ''}`} inputMode="decimal" required value={f.valor} onChange={(e) => set('valor', e.target.value)} />
            </Campo>
            <Campo rotulo={qtd > 1 ? 'Vencimento da primeira' : 'Vencimento'}>
              <input className="input" type="date" required value={f.vencimento} onChange={(e) => set('vencimento', e.target.value)} />
            </Campo>
            {!atual && (
              <Campo rotulo="Quantas parcelas (uma por mês)">
                <input className="input" type="number" min={1} max={60} value={f.qtd} onChange={(e) => set('qtd', e.target.value)} />
              </Campo>
            )}
            <Campo rotulo="Observação (opcional)" className={atual ? 'span-2' : ''}>
              <input className="input" maxLength={300} value={f.observacao} onChange={(e) => set('observacao', e.target.value)} />
            </Campo>
          </div>
          <label className="row" style={{ gap: 8 }}>
            <input type="checkbox" checked={f.pago} onChange={(e) => set('pago', e.target.checked)} />
            {qtd > 1 ? 'A primeira já foi recebida' : 'Já foi recebida'}
          </label>
          {f.pago && (
            <Campo rotulo="Recebida em">
              <input className="input" type="date" required max={hojeISO()} value={f.pago_em} onChange={(e) => set('pago_em', e.target.value)} />
            </Campo>
          )}
          {!atual && qtd > 1 && parseValor(f.valor) !== null && (
            <p className="muted" style={{ fontSize: 13 }}>
              Serão lançadas {qtd} parcelas de {moeda(parseValor(f.valor) ?? 0)}, total de {moeda(arred((parseValor(f.valor) ?? 0) * qtd))}.
            </p>
          )}
          <div className="modal-foot">
            <button type="button" className="btn btn-secondary" onClick={onFechar}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={ocupado}>
              Salvar
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

/* ---------- nota fiscal ---------- */

function NotaForm({ orcamento, atual, sugestao, onFechar }: { orcamento: Orcamento; atual?: Nota; sugestao: number; onFechar: () => void }) {
  const { gravar, anexarPdf } = useDados()
  const { avisar, avisarErro } = useToast()
  const [f, setF] = useState({
    numero: atual?.numero ?? '',
    data_emissao: atual?.data_emissao ?? hojeISO(),
    valor: valorCampo(atual?.valor ?? (sugestao > 0 ? sugestao : null)),
  })
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const valor = parseValor(f.valor)
    if (valor === null || valor <= 0) return setErro('Informe o valor da nota.')
    if (arquivo && arquivo.type !== 'application/pdf') return avisarErro(new Error('Só é aceito arquivo PDF.'))
    setErro(null)
    setOcupado(true)
    try {
      const nota = await gravar('notas', {
        ...(atual ? { id: atual.id } : { orcamento_id: orcamento.id }),
        numero: f.numero.trim(),
        data_emissao: f.data_emissao,
        valor,
      })
      if (arquivo) await anexarPdf(nota, arquivo)
      avisar(atual ? 'Nota alterada.' : 'Nota fiscal lançada.')
      onFechar()
    } catch (err) {
      avisarErro(err)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal titulo={atual ? 'Alterar nota fiscal' : 'Lançar nota fiscal'} onFechar={onFechar}>
      <form className="col" onSubmit={salvar}>
        <div className="form-grid">
          <Campo rotulo="Número da nota">
            <input className="input" required maxLength={40} value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} />
          </Campo>
          <Campo rotulo="Data de emissão">
            <input className="input" type="date" required value={f.data_emissao} onChange={(e) => setF({ ...f, data_emissao: e.target.value })} />
          </Campo>
          <Campo rotulo="Valor da nota (R$)" erro={erro}>
            <input className={`input ${erro ? 'erro' : ''}`} inputMode="decimal" required value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
          </Campo>
          <Campo rotulo={atual?.arquivo_path ? 'Trocar o PDF (opcional)' : 'PDF da nota (opcional, até 25 MB)'} className="span-2">
            <input className="input" type="file" accept="application/pdf,.pdf" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </Campo>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={ocupado}>
            {ocupado ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ---------- tela ---------- */

type Aberto =
  | { tipo: 'orcamento' }
  | { tipo: 'parcela'; atual?: Parcela }
  | { tipo: 'nota'; atual?: Nota }
  | { tipo: 'apagar'; alvo: 'orcamentos' | 'parcelas' | 'notas'; id: string; texto: string }
  | null

export function OrcamentoDetalhe() {
  const { id } = useParams()
  const nav = useNavigate()
  const { perfil, demo } = useAuth()
  const { orcamentos, parcelas, notas, formas, gravar, apagar, linkPdf } = useDados()
  const { avisar, avisarErro } = useToast()
  const resumos = useResumos()
  const [aberto, setAberto] = useState<Aberto>(null)
  const [ocupado, setOcupado] = useState(false)

  const o = orcamentos.find((x) => x.id === id)
  const r = o ? resumos.get(o.id) : undefined
  if (!o || !r || !perfil) {
    return (
      <div className="page">
        <Cabecalho kicker="Orçamento" titulo="Não encontrado" />
        <Vazio>
          Este orçamento não existe ou você não tem acesso a ele. <Link to="/orcamentos">Voltar para a lista</Link>
        </Vazio>
      </div>
    )
  }

  const gestor = pode.gerirOrcamentos(perfil.papel)
  const podeApagar = pode.apagar(perfil.papel)
  const minhas = parcelas.filter((p) => p.orcamento_id === o.id)
  const minhasNotas = notas.filter((n) => n.orcamento_id === o.id)
  const nomeForma = (fid: string) => formas.find((x) => x.id === fid)?.nome ?? '—'
  const hoje = hojeISO()

  async function receber(p: Parcela) {
    try {
      await gravar('parcelas', { id: p.id, pago_em: hoje })
      avisar('Parcela marcada como recebida hoje.')
    } catch (e) {
      avisarErro(e)
    }
  }

  async function baixar(n: Nota) {
    if (demo) return avisar('No modo demonstração o PDF não é guardado.')
    try {
      const url = await linkPdf(n)
      if (!url) return
      const a = document.createElement('a')
      a.href = url
      a.rel = 'noreferrer'
      a.click()
    } catch (e) {
      avisarErro(e)
    }
  }

  async function confirmarApagar() {
    if (aberto?.tipo !== 'apagar') return
    setOcupado(true)
    try {
      await apagar(aberto.alvo, aberto.id)
      avisar('Apagado.')
      const eraOrcamento = aberto.alvo === 'orcamentos'
      setAberto(null)
      if (eraOrcamento) nav('/orcamentos')
    } catch (e) {
      avisarErro(e)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="page">
      <Link to="/orcamentos" className="btn-link">
        <ArrowLeft size={15} strokeWidth={1.5} />
        Orçamentos
      </Link>
      <Cabecalho kicker={o.codigo} titulo={o.cliente}>
        {gestor && (
          <button type="button" className="btn btn-secondary" onClick={() => setAberto({ tipo: 'orcamento' })}>
            <Pencil size={16} strokeWidth={1.5} />
            Alterar
          </button>
        )}
        {podeApagar && (
          <button
            type="button"
            className="btn btn-ink"
            onClick={() =>
              setAberto({ tipo: 'apagar', alvo: 'orcamentos', id: o.id, texto: `Apagar o orçamento ${o.codigo}, com todas as parcelas e notas dele? Não dá para desfazer.` })
            }
          >
            <Trash2 size={16} strokeWidth={1.5} />
            Apagar
          </button>
        )}
      </Cabecalho>

      <div className="row" style={{ gap: 18, fontSize: 14 }}>
        <SeloOrcamento r={r} />
        <SeloNota r={r} />
        <span>
          <span className="label-up">Fechado em </span>
          {fmtData(o.data_fechamento)}
        </span>
        <span>
          <span className="label-up">Vendedor </span>
          {o.vendedor_nome ?? '—'}
        </span>
        {o.obra && (
          <span>
            <span className="label-up">Obra </span>
            {o.obra}
          </span>
        )}
        {o.cidade && (
          <span>
            <span className="label-up">Cidade </span>
            {o.cidade}
            {o.uf ? `/${o.uf}` : ''}
          </span>
        )}
        {o.cliente_doc && (
          <span>
            <span className="label-up">CPF/CNPJ </span>
            {o.cliente_doc}
          </span>
        )}
      </div>
      {o.observacao && <p className="muted">{o.observacao}</p>}

      <div className="stats">
        <Stat rotulo="Valor fechado" valor={moeda(o.valor)} />
        <Stat rotulo="Recebido" valor={moeda(r.recebido)} tom="verde" />
        <Stat rotulo="A receber (lançado)" valor={moeda(r.previsto)} nota={r.atrasado > 0 ? `${moeda(r.atrasado)} em atraso` : undefined} tom={r.atrasado > 0 ? 'ink' : undefined} />
        <Stat rotulo="Falta lançar" valor={moeda(r.semLancar)} nota="valor ainda sem parcela" />
      </div>

      <Blueprint className="card">
        <div className="card-head">
          <h3>Pagamentos</h3>
          <button type="button" className="btn btn-primary" onClick={() => setAberto({ tipo: 'parcela' })}>
            <Plus size={17} strokeWidth={1.5} />
            Lançar pagamento
          </button>
        </div>
        {minhas.length === 0 ? (
          <Vazio>Nenhum pagamento lançado. Clique em "Lançar pagamento" para registrar a entrada e as parcelas.</Vazio>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Forma</th>
                  <th>Vencimento</th>
                  <th>Recebida em</th>
                  <th className="num">Valor</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {minhas.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.descricao || 'Parcela'}
                      {p.observacao && <div className="label-up">{p.observacao}</div>}
                    </td>
                    <td>{nomeForma(p.forma_id)}</td>
                    <td className="nowrap">{fmtData(p.vencimento)}</td>
                    <td className="nowrap">{fmtData(p.pago_em)}</td>
                    <td className="num">{moeda(p.valor)}</td>
                    <td>
                      <SeloParcela s={situacaoParcela(p, hoje)} />
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                        {!p.pago_em && (
                          <button type="button" className="btn btn-sm btn-secondary" onClick={() => void receber(p)}>
                            <Check size={14} strokeWidth={1.5} />
                            Receber
                          </button>
                        )}
                        <button type="button" className="btn btn-icon" aria-label="Alterar parcela" onClick={() => setAberto({ tipo: 'parcela', atual: p })}>
                          <Pencil size={15} strokeWidth={1.5} />
                        </button>
                        {podeApagar && (
                          <button
                            type="button"
                            className="btn btn-icon"
                            aria-label="Apagar parcela"
                            onClick={() => setAberto({ tipo: 'apagar', alvo: 'parcelas', id: p.id, texto: `Apagar a parcela de ${moeda(p.valor)}?` })}
                          >
                            <Trash2 size={15} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Blueprint>

      <Blueprint className="card">
        <div className="card-head">
          <h3>Notas fiscais</h3>
          <button type="button" className="btn btn-primary" onClick={() => setAberto({ tipo: 'nota' })}>
            <Plus size={17} strokeWidth={1.5} />
            Lançar nota
          </button>
        </div>
        {minhasNotas.length === 0 ? (
          <Vazio>Este orçamento ainda não tem nota fiscal. Clique em "Lançar nota" quando ela for emitida.</Vazio>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Emissão</th>
                  <th className="num">Valor</th>
                  <th>PDF</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {minhasNotas.map((n) => (
                  <tr key={n.id}>
                    <td>{n.numero}</td>
                    <td className="nowrap">{fmtData(n.data_emissao)}</td>
                    <td className="num">{moeda(n.valor)}</td>
                    <td>
                      {n.arquivo_path ? (
                        <button type="button" className="btn-link" onClick={() => void baixar(n)}>
                          <Download size={14} strokeWidth={1.5} />
                          Baixar
                        </button>
                      ) : (
                        <button type="button" className="btn-link" onClick={() => setAberto({ tipo: 'nota', atual: n })}>
                          <Paperclip size={14} strokeWidth={1.5} />
                          Anexar
                        </button>
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6, flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-icon" aria-label="Alterar nota" onClick={() => setAberto({ tipo: 'nota', atual: n })}>
                          <Pencil size={15} strokeWidth={1.5} />
                        </button>
                        {podeApagar && (
                          <button
                            type="button"
                            className="btn btn-icon"
                            aria-label="Apagar nota"
                            onClick={() => setAberto({ tipo: 'apagar', alvo: 'notas', id: n.id, texto: `Apagar a nota ${n.numero}?` })}
                          >
                            <Trash2 size={15} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {minhasNotas.length > 0 && (
              <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>
                Total em notas: {moeda(r.valorNotas)} de {moeda(o.valor)}
              </p>
            )}
          </div>
        )}
      </Blueprint>

      {aberto?.tipo === 'orcamento' && <OrcamentoForm atual={o} onFechar={() => setAberto(null)} />}
      {aberto?.tipo === 'parcela' && <ParcelaForm orcamento={o} atual={aberto.atual} sugestao={r.semLancar} onFechar={() => setAberto(null)} />}
      {aberto?.tipo === 'nota' && (
        <NotaForm orcamento={o} atual={aberto.atual} sugestao={Math.max(0, arred(o.valor - r.valorNotas))} onFechar={() => setAberto(null)} />
      )}
      {aberto?.tipo === 'apagar' && (
        <Confirmar titulo="Confirmar exclusão" texto={aberto.texto} acao="Apagar" ocupado={ocupado} onConfirmar={() => void confirmarApagar()} onCancelar={() => setAberto(null)} />
      )}
    </div>
  )
}

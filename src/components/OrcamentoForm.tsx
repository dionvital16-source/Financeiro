import { useState, type FormEvent } from 'react'
import { hojeISO } from '../lib/dates'
import { parseValor, valorCampo } from '../lib/format'
import type { Orcamento } from '../lib/types'
import { useDados } from '../state/DataContext'
import { useToast } from '../state/ToastContext'
import { Campo, Modal } from './ui'

/** Criar ou alterar um orçamento à mão (Admin e Financeiro). */
export function OrcamentoForm({ atual, onFechar, onSalvo }: { atual?: Orcamento; onFechar: () => void; onSalvo?: (o: Orcamento) => void }) {
  const { perfis, gravar } = useDados()
  const { avisar, avisarErro } = useToast()
  const [f, setF] = useState({
    codigo: atual?.codigo ?? '',
    cliente: atual?.cliente ?? '',
    cliente_doc: atual?.cliente_doc ?? '',
    obra: atual?.obra ?? '',
    cidade: atual?.cidade ?? '',
    uf: atual?.uf ?? '',
    valor: valorCampo(atual?.valor),
    data_fechamento: atual?.data_fechamento ?? hojeISO(),
    vendedor_id: atual?.vendedor_id ?? '',
    observacao: atual?.observacao ?? '',
  })
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })),
  })
  const vendedores = perfis.filter((p) => p.ativo || p.id === atual?.vendedor_id)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const valor = parseValor(f.valor)
    if (valor === null || valor < 0) return setErro('Informe o valor, por exemplo 12.500,00.')
    setErro(null)
    setOcupado(true)
    try {
      const vendedor = perfis.find((p) => p.id === f.vendedor_id)
      const o = await gravar('orcamentos', {
        ...(atual ? { id: atual.id } : {}),
        codigo: f.codigo.trim(),
        cliente: f.cliente.trim(),
        cliente_doc: f.cliente_doc.trim() || null,
        obra: f.obra.trim() || null,
        cidade: f.cidade.trim() || null,
        uf: f.uf.trim().toUpperCase() || null,
        valor,
        data_fechamento: f.data_fechamento,
        vendedor_id: vendedor?.id ?? null,
        vendedor_nome: vendedor?.nome ?? (f.vendedor_id ? null : atual?.vendedor_id ? null : atual?.vendedor_nome ?? null),
        observacao: f.observacao.trim() || null,
      })
      avisar(atual ? 'Orçamento alterado.' : 'Orçamento criado.')
      onSalvo?.(o)
      onFechar()
    } catch (err) {
      avisarErro(err)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Modal titulo={atual ? 'Alterar orçamento' : 'Novo orçamento'} onFechar={onFechar} largo>
      <form className="col" onSubmit={salvar}>
        <div className="form-grid">
          <Campo rotulo="Número / código">
            <input className="input" required maxLength={60} {...campo('codigo')} />
          </Campo>
          <Campo rotulo="Data do fechamento">
            <input className="input" type="date" required {...campo('data_fechamento')} />
          </Campo>
          <Campo rotulo="Cliente" className="span-2">
            <input className="input" required maxLength={160} {...campo('cliente')} />
          </Campo>
          <Campo rotulo="CPF / CNPJ (opcional)">
            <input className="input" maxLength={20} {...campo('cliente_doc')} />
          </Campo>
          <Campo rotulo="Obra (opcional)">
            <input className="input" maxLength={160} {...campo('obra')} />
          </Campo>
          <Campo rotulo="Cidade (opcional)">
            <input className="input" maxLength={80} {...campo('cidade')} />
          </Campo>
          <Campo rotulo="UF">
            <input className="input" maxLength={2} {...campo('uf')} />
          </Campo>
          <Campo rotulo="Valor fechado (R$)" erro={erro}>
            <input className={`input ${erro ? 'erro' : ''}`} inputMode="decimal" required placeholder="0,00" {...campo('valor')} />
          </Campo>
          <Campo rotulo="Vendedor">
            <select className="input" {...campo('vendedor_id')}>
              <option value="">{atual?.vendedor_nome && !atual.vendedor_id ? `${atual.vendedor_nome} (sem login)` : 'Sem vendedor'}</option>
              {vendedores.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Observação (opcional)" className="span-2">
            <textarea className="input" maxLength={1000} {...campo('observacao')} />
          </Campo>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onFechar}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={ocupado}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}

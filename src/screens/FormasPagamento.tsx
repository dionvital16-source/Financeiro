import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Blueprint, Cabecalho, Campo, Confirmar, Modal, Selo, Vazio } from '../components/ui'
import type { Forma } from '../lib/types'
import { useDados } from '../state/DataContext'
import { useToast } from '../state/ToastContext'

export function FormasPagamento() {
  const { formas, gravar, apagar } = useDados()
  const { avisar, avisarErro } = useToast()
  const [edit, setEdit] = useState<Forma | 'nova' | null>(null)
  const [nome, setNome] = useState('')
  const [excluir, setExcluir] = useState<Forma | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const abrir = (f: Forma | 'nova') => {
    setNome(f === 'nova' ? '' : f.nome)
    setEdit(f)
  }

  async function executar(acao: () => Promise<unknown>, msg: string) {
    setOcupado(true)
    try {
      await acao()
      avisar(msg)
      setEdit(null)
      setExcluir(null)
    } catch (e) {
      avisarErro(e)
    } finally {
      setOcupado(false)
    }
  }

  function salvar(e: FormEvent) {
    e.preventDefault()
    const dados = edit === 'nova' ? { nome: nome.trim(), ordem: formas.length + 1 } : { id: (edit as Forma).id, nome: nome.trim() }
    void executar(() => gravar('formas', dados), 'Forma de pagamento salva.')
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <Cabecalho kicker="Cadastro" titulo="Formas de pagamento">
        <button type="button" className="btn btn-primary" onClick={() => abrir('nova')}>
          <Plus size={17} strokeWidth={1.5} />
          Nova forma
        </button>
      </Cabecalho>
      {formas.length === 0 ? (
        <Vazio>Nenhuma forma cadastrada. Cadastre Pix, dinheiro, cartão, boleto e as outras que você usa.</Vazio>
      ) : (
        <Blueprint className="card">
          {formas.map((f) => (
            <div key={f.id} className="lista-row">
              <div style={{ flex: 1, fontWeight: 500 }}>{f.nome}</div>
              <Selo tom={f.ativo ? 'verde' : 'neutro'}>{f.ativo ? 'Ativa' : 'Desativada'}</Selo>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={ocupado}
                onClick={() => void executar(() => gravar('formas', { id: f.id, ativo: !f.ativo }), f.ativo ? 'Forma desativada.' : 'Forma ativada.')}
              >
                {f.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button type="button" className="btn btn-icon" aria-label="Alterar" onClick={() => abrir(f)}>
                <Pencil size={15} strokeWidth={1.5} />
              </button>
              <button type="button" className="btn btn-icon" aria-label="Apagar" onClick={() => setExcluir(f)}>
                <Trash2 size={15} strokeWidth={1.5} />
              </button>
            </div>
          ))}
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            Forma já usada em algum pagamento não pode ser apagada; nesse caso, desative.
          </p>
        </Blueprint>
      )}

      {edit && (
        <Modal titulo={edit === 'nova' ? 'Nova forma de pagamento' : 'Alterar forma'} onFechar={() => setEdit(null)}>
          <form className="col" onSubmit={salvar}>
            <Campo rotulo="Nome">
              <input className="input" required maxLength={60} autoFocus value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>
            <div className="modal-foot">
              <button type="button" className="btn btn-secondary" onClick={() => setEdit(null)}>
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={ocupado}>
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
      {excluir && (
        <Confirmar
          titulo="Confirmar exclusão"
          texto={`Apagar a forma "${excluir.nome}"?`}
          acao="Apagar"
          ocupado={ocupado}
          onConfirmar={() => void executar(() => apagar('formas', excluir.id), 'Forma apagada.')}
          onCancelar={() => setExcluir(null)}
        />
      )}
    </div>
  )
}

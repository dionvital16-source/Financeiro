import { useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Blueprint, Cabecalho, Campo, Chip, Confirmar, Modal, Selo, Vazio } from '../components/ui'
import { PAPEIS, type Papel, type Perfil } from '../lib/types'
import { useAuth } from '../state/AuthContext'
import { useDados } from '../state/DataContext'
import { useToast } from '../state/ToastContext'

export function Usuarios() {
  const { perfis, gravar, apagar } = useDados()
  const { perfil: eu } = useAuth()
  const { avisar, avisarErro } = useToast()
  const [edit, setEdit] = useState<Perfil | 'novo' | null>(null)
  const [f, setF] = useState({ nome: '', email: '', papel: 'Vendedor' as Papel })
  const [excluir, setExcluir] = useState<Perfil | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const abrir = (p: Perfil | 'novo') => {
    setF(p === 'novo' ? { nome: '', email: '', papel: 'Vendedor' } : { nome: p.nome, email: p.email, papel: p.papel })
    setEdit(p)
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
    if (edit === 'novo') {
      void executar(
        () => gravar('perfis', { nome: f.nome.trim(), email: f.email.trim().toLowerCase(), papel: f.papel }),
        'Usuário criado. Peça para a pessoa abrir o site e clicar em "Primeiro acesso".',
      )
    } else if (edit) {
      const mesmo = edit.id === eu?.id
      void executar(() => gravar('perfis', { id: edit.id, nome: f.nome.trim(), ...(mesmo ? {} : { papel: f.papel }) }), 'Usuário alterado.')
    }
  }

  const editandoEu = edit !== 'novo' && edit?.id === eu?.id

  return (
    <div className="page" style={{ maxWidth: 900 }}>
      <Cabecalho kicker="Acesso" titulo="Usuários">
        <button type="button" className="btn btn-primary" onClick={() => abrir('novo')}>
          <Plus size={17} strokeWidth={1.5} />
          Novo usuário
        </button>
      </Cabecalho>
      <p className="muted">
        Só entra no site quem estiver nesta lista. Depois de criar o usuário, a pessoa define a própria senha em "Primeiro acesso" na tela de entrada.
      </p>
      {perfis.length === 0 ? (
        <Vazio>Nenhum usuário.</Vazio>
      ) : (
        <Blueprint className="card">
          {perfis.map((p) => (
            <div key={p.id} className="lista-row" style={{ flexWrap: 'wrap', padding: '8px 0' }}>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div className="ellipsis" style={{ fontWeight: 500 }}>
                  {p.nome} {p.id === eu?.id && <span className="muted">(você)</span>}
                </div>
                <div className="label-up ellipsis" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 12.5 }}>
                  {p.email}
                </div>
              </div>
              <Selo tom={p.papel === 'Admin' ? 'ink' : 'neutro'}>{p.papel}</Selo>
              <Selo tom={!p.ativo ? 'ink' : p.user_id ? 'verde' : 'neutro'}>{!p.ativo ? 'Suspenso' : p.user_id ? 'Ativo' : 'Aguardando 1º acesso'}</Selo>
              {p.id !== eu?.id && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  disabled={ocupado}
                  onClick={() => void executar(() => gravar('perfis', { id: p.id, ativo: !p.ativo }), p.ativo ? 'Acesso suspenso.' : 'Acesso liberado.')}
                >
                  {p.ativo ? 'Suspender' : 'Reativar'}
                </button>
              )}
              <button type="button" className="btn btn-icon" aria-label="Alterar" onClick={() => abrir(p)}>
                <Pencil size={15} strokeWidth={1.5} />
              </button>
              {p.id !== eu?.id && (
                <button type="button" className="btn btn-icon" aria-label="Apagar" onClick={() => setExcluir(p)}>
                  <Trash2 size={15} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
        </Blueprint>
      )}

      {edit && (
        <Modal titulo={edit === 'novo' ? 'Novo usuário' : 'Alterar usuário'} onFechar={() => setEdit(null)}>
          <form className="col" onSubmit={salvar}>
            <Campo rotulo="Nome (igual ao nome do vendedor no CEM, para a importação reconhecer)">
              <input className="input" required maxLength={120} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
            </Campo>
            <Campo rotulo="E-mail">
              <input className="input" type="email" required maxLength={160} disabled={edit !== 'novo'} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </Campo>
            <div>
              <span className="form-label">Papel</span>
              <div className="row">
                {PAPEIS.map((p) => (
                  <Chip key={p} on={f.papel === p} onClick={() => !editandoEu && setF({ ...f, papel: p })}>
                    {p}
                  </Chip>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
                {editandoEu
                  ? 'Você não pode alterar o próprio papel.'
                  : 'Admin faz tudo. Financeiro vê e lança tudo, mas não apaga. Vendedor só vê e lança nos orçamentos dele.'}
              </p>
            </div>
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
          texto={`Apagar o usuário ${excluir.nome}? Os orçamentos dele continuam no sistema, só ficam sem vendedor com login. Para tirar o acesso sem apagar, use "Suspender".`}
          acao="Apagar"
          ocupado={ocupado}
          onConfirmar={() => void executar(() => apagar('perfis', excluir.id), 'Usuário apagado.')}
          onCancelar={() => setExcluir(null)}
        />
      )}
    </div>
  )
}

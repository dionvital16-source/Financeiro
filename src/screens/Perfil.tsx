import { useState, type FormEvent } from 'react'
import { Blueprint, Cabecalho, Campo } from '../components/ui'
import { useAuth } from '../state/AuthContext'
import { useDados } from '../state/DataContext'
import { useToast } from '../state/ToastContext'

export function Perfil() {
  const { perfil, definirPerfil, trocarSenha, demo } = useAuth()
  const { gravar } = useDados()
  const { avisar, avisarErro } = useToast()
  const [nome, setNome] = useState(perfil?.nome ?? '')
  const [senha, setSenha] = useState('')
  const [senha2, setSenha2] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  if (!perfil) return null

  async function salvarNome(e: FormEvent) {
    e.preventDefault()
    setOcupado(true)
    try {
      definirPerfil(await gravar('perfis', { id: perfil!.id, nome: nome.trim() }))
      avisar('Nome alterado.')
    } catch (err) {
      avisarErro(err)
    } finally {
      setOcupado(false)
    }
  }

  async function salvarSenha(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 8) return setErro('A senha precisa ter no mínimo 8 caracteres.')
    if (senha !== senha2) return setErro('As duas senhas não são iguais.')
    setErro(null)
    setOcupado(true)
    try {
      await trocarSenha(senha)
      setSenha('')
      setSenha2('')
      avisar(demo ? 'No modo demonstração a senha não muda.' : 'Senha alterada.')
    } catch (err) {
      avisarErro(err)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 620 }}>
      <Cabecalho kicker={perfil.papel} titulo="Meu perfil" />
      <Blueprint className="card">
        <form className="col" onSubmit={salvarNome}>
          <h3>Dados</h3>
          <Campo rotulo="E-mail">
            <input className="input" disabled value={perfil.email} />
          </Campo>
          <Campo rotulo="Nome">
            <input className="input" required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} />
          </Campo>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={ocupado || nome.trim() === perfil.nome}>
            Salvar nome
          </button>
        </form>
      </Blueprint>
      <Blueprint className="card">
        <form className="col" onSubmit={salvarSenha}>
          <h3>Trocar senha</h3>
          <Campo rotulo="Nova senha (mínimo 8 caracteres)">
            <input className="input" type="password" autoComplete="new-password" required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} />
          </Campo>
          <Campo rotulo="Repita a nova senha" erro={erro}>
            <input className="input" type="password" autoComplete="new-password" required minLength={8} value={senha2} onChange={(e) => setSenha2(e.target.value)} />
          </Campo>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={ocupado}>
            Trocar senha
          </button>
        </form>
      </Blueprint>
    </div>
  )
}

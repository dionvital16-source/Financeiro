import { useState, type FormEvent } from 'react'
import { Blueprint, Campo } from '../components/ui'
import { mensagemErro } from '../lib/supabase'
import { useAuth } from '../state/AuthContext'

type Modo = 'entrar' | 'primeiro' | 'esqueci'

const TITULO: Record<Modo, string> = { entrar: 'Entrar', primeiro: 'Primeiro acesso', esqueci: 'Esqueci a senha' }

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <Blueprint className="auth-card">
        <div className="brand" style={{ padding: 0 }}>
          <b>
            Vital <span>Financeiro</span>
          </b>
          <span className="label-up">Orçamentos fechados, pagamentos e notas</span>
        </div>
        {children}
      </Blueprint>
    </div>
  )
}

export function Login() {
  const { entrar, primeiroAcesso, esqueciSenha } = useAuth()
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const trocar = (m: Modo) => {
    setModo(m)
    setErro(null)
    setAviso(null)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    if (modo !== 'esqueci' && senha.length < 8) return setErro('A senha precisa ter no mínimo 8 caracteres.')
    setOcupado(true)
    try {
      if (modo === 'entrar') await entrar(email, senha)
      else if (modo === 'primeiro') {
        const entrou = await primeiroAcesso(email, senha)
        if (!entrou) {
          setAviso('Quase lá: enviamos um e-mail de confirmação. Abra o link e depois volte para entrar.')
          setModo('entrar')
        }
      } else {
        await esqueciSenha(email)
        setAviso('Se o e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.')
      }
    } catch (err) {
      setErro(mensagemErro(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Moldura>
      <div>
        <div className="kicker">Acesso restrito</div>
        <h2>{TITULO[modo]}</h2>
      </div>
      {modo === 'primeiro' && (
        <p className="muted" style={{ fontSize: 13.5 }}>
          Use o e-mail que o administrador cadastrou para você e escolha uma senha.
        </p>
      )}
      <form className="col" onSubmit={enviar}>
        <Campo rotulo="E-mail">
          <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        {modo !== 'esqueci' && (
          <Campo rotulo={modo === 'primeiro' ? 'Crie uma senha (mínimo 8 caracteres)' : 'Senha'}>
            <input
              className="input"
              type="password"
              autoComplete={modo === 'primeiro' ? 'new-password' : 'current-password'}
              required
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </Campo>
        )}
        {erro && <div className="erro-txt" role="alert">{erro}</div>}
        {aviso && <div style={{ fontSize: 13.5, color: 'var(--color-accent-800)' }}>{aviso}</div>}
        <button className="btn btn-primary" disabled={ocupado}>
          {modo === 'entrar' ? 'Entrar' : modo === 'primeiro' ? 'Criar minha senha' : 'Enviar link'}
        </button>
      </form>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        {modo === 'entrar' ? (
          <>
            <button type="button" className="btn-link" onClick={() => trocar('primeiro')}>
              Primeiro acesso
            </button>
            <button type="button" className="btn-link" onClick={() => trocar('esqueci')}>
              Esqueci a senha
            </button>
          </>
        ) : (
          <button type="button" className="btn-link" onClick={() => trocar('entrar')}>
            Voltar para entrar
          </button>
        )}
      </div>
    </Moldura>
  )
}

/** Tela que aparece quando a pessoa chega pelo link de "esqueci a senha". */
export function NovaSenha() {
  const { trocarSenha, sair } = useAuth()
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 8) return setErro('A senha precisa ter no mínimo 8 caracteres.')
    setOcupado(true)
    try {
      await trocarSenha(senha)
    } catch (err) {
      setErro(mensagemErro(err))
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Moldura>
      <div>
        <div className="kicker">Recuperação</div>
        <h2>Nova senha</h2>
      </div>
      <form className="col" onSubmit={enviar}>
        <Campo rotulo="Nova senha (mínimo 8 caracteres)" erro={erro}>
          <input className="input" type="password" autoComplete="new-password" required minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Campo>
        <button className="btn btn-primary" disabled={ocupado}>
          Salvar nova senha
        </button>
      </form>
      <button type="button" className="btn-link" onClick={() => void sair()}>
        Sair
      </button>
    </Moldura>
  )
}

/** Mensagens de tela cheia: site sem configuração, conta suspensa etc. */
export function Aviso({ titulo, children, comSair }: { titulo: string; children: React.ReactNode; comSair?: boolean }) {
  const { sair } = useAuth()
  return (
    <Moldura>
      <h2>{titulo}</h2>
      <p className="muted">{children}</p>
      {comSair && (
        <button type="button" className="btn btn-secondary" onClick={() => void sair()}>
          Sair
        </button>
      )}
    </Moldura>
  )
}

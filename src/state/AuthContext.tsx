import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { DEMO, banco, supabase } from '../lib/supabase'
import type { Papel, Perfil } from '../lib/types'
import { PERFIS_DEMO } from './demo'

interface Auth {
  demo: boolean
  carregando: boolean
  /** tem login válido (mesmo que o perfil esteja suspenso) */
  logado: boolean
  perfil: Perfil | null
  /** chegou pelo link de "esqueci a senha" e precisa definir a nova */
  recuperando: boolean
  entrar: (email: string, senha: string) => Promise<void>
  /** devolve true se já entrou direto; false se falta confirmar o e-mail */
  primeiroAcesso: (email: string, senha: string) => Promise<boolean>
  esqueciSenha: (email: string) => Promise<void>
  trocarSenha: (nova: string) => Promise<void>
  sair: () => Promise<void>
  definirPerfil: (p: Perfil) => void
  trocarPapelDemo: (papel: Papel) => void
}

const Ctx = createContext<Auth | null>(null)

/** Sai sozinho depois deste tempo sem mexer no site (computador compartilhado, aba esquecida). */
const LIMITE_INATIVIDADE_MS = 60 * 60 * 1000
const CHAVE_ATIVIDADE = 'vf.ultima-atividade'

function lerAtividade(): number {
  try {
    return Number(localStorage.getItem(CHAVE_ATIVIDADE)) || 0
  } catch {
    return 0
  }
}
function marcarAtividade(): void {
  try {
    localStorage.setItem(CHAVE_ATIVIDADE, String(Date.now()))
  } catch {
    /* sem armazenamento */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(DEMO ? PERFIS_DEMO[0] : null)
  const [carregando, setCarregando] = useState(!DEMO && Boolean(supabase))
  const [recuperando, setRecuperando] = useState(false)

  // Acompanha o login. Nada de consulta ao banco dentro deste aviso (evita travar o Supabase).
  useEffect(() => {
    if (!supabase) return
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      const id = sessao?.user.id ?? null
      setUserId(id)
      if (!id) {
        setPerfil(null)
        setCarregando(false)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Busca o perfil do usuário logado. Perfil suspenso não aparece (o banco esconde).
  useEffect(() => {
    if (!supabase || !userId) return
    let vivo = true
    setCarregando(true)
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!vivo) return
        setPerfil((data as Perfil | null) ?? null)
        setCarregando(false)
      })
    return () => {
      vivo = false
    }
  }, [userId])

  // Saída automática por inatividade. Vale para todas as abas abertas do site.
  useEffect(() => {
    if (!supabase || !userId) return
    const cliente = supabase
    const ultima = lerAtividade()
    if (ultima && Date.now() - ultima > LIMITE_INATIVIDADE_MS) {
      void cliente.auth.signOut()
      return
    }
    marcarAtividade()
    let anterior = Date.now()
    const mexeu = () => {
      // grava no máximo a cada 30 s, para não pesar
      if (Date.now() - anterior > 30_000) {
        anterior = Date.now()
        marcarAtividade()
      }
    }
    const eventos = ['pointerdown', 'keydown', 'scroll', 'visibilitychange'] as const
    eventos.forEach((e) => window.addEventListener(e, mexeu, { passive: true }))
    const relogio = window.setInterval(() => {
      if (Date.now() - lerAtividade() > LIMITE_INATIVIDADE_MS) void cliente.auth.signOut()
    }, 60_000)
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, mexeu))
      window.clearInterval(relogio)
    }
  }, [userId])

  const entrar = useCallback(async (email: string, senha: string) => {
    marcarAtividade()
    const { error } = await banco().auth.signInWithPassword({ email: email.trim().toLowerCase(), password: senha })
    if (error) throw error
  }, [])

  const primeiroAcesso = useCallback(async (email: string, senha: string) => {
    const { data, error } = await banco().auth.signUp({
      email: email.trim().toLowerCase(),
      password: senha,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
    return Boolean(data.session)
  }, [])

  const esqueciSenha = useCallback(async (email: string) => {
    const { error } = await banco().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }, [])

  const trocarSenha = useCallback(async (nova: string) => {
    if (DEMO) return
    const { error } = await banco().auth.updateUser({ password: nova })
    if (error) throw error
    setRecuperando(false)
  }, [])

  const sair = useCallback(async () => {
    if (DEMO) {
      try {
        sessionStorage.removeItem('demo')
      } catch {
        /* sem armazenamento */
      }
      window.location.href = '/'
      return
    }
    setRecuperando(false)
    await banco().auth.signOut()
  }, [])

  const trocarPapelDemo = useCallback((papel: Papel) => {
    if (DEMO) setPerfil(PERFIS_DEMO.find((p) => p.papel === papel) ?? PERFIS_DEMO[0])
  }, [])

  return (
    <Ctx.Provider
      value={{
        demo: DEMO,
        carregando,
        logado: DEMO || Boolean(userId),
        perfil,
        recuperando,
        entrar,
        primeiroAcesso,
        esqueciSenha,
        trocarSenha,
        sair,
        definirPerfil: setPerfil,
        trocarPapelDemo,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): Auth {
  const c = useContext(Ctx)
  if (!c) throw new Error('AuthProvider ausente')
  return c
}

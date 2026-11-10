import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { mensagemErro } from '../lib/supabase'

interface Toast {
  avisar: (texto: string) => void
  avisarErro: (e: unknown) => void
}

const Ctx = createContext<Toast | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const avisar = useCallback((t: string) => {
    setTexto(t)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setTexto(null), 4500)
  }, [])
  const avisarErro = useCallback((e: unknown) => avisar(mensagemErro(e)), [avisar])

  return (
    <Ctx.Provider value={{ avisar, avisarErro }}>
      {children}
      {texto && (
        <div className="toast" role="status">
          {texto}
        </div>
      )}
    </Ctx.Provider>
  )
}

export function useToast(): Toast {
  const c = useContext(Ctx)
  if (!c) throw new Error('ToastProvider ausente')
  return c
}

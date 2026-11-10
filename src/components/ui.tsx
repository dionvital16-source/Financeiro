import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Cartão com moldura de projeto (borda fina + 4 marcas "+"). */
export function Blueprint({
  children,
  className = '',
  style,
  onClick,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}) {
  return (
    <div className={`blueprint ${onClick ? 'clicavel' : ''} ${className}`} style={style} onClick={onClick}>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      {children}
    </div>
  )
}

export function Chip({
  on,
  onClick,
  children,
  n,
  verde,
}: {
  on?: boolean
  onClick?: () => void
  children: ReactNode
  n?: number
  verde?: boolean
}) {
  return (
    <button type="button" className={`chip ${on ? 'on' : ''} ${verde ? 'verde' : ''}`} aria-pressed={on} onClick={onClick}>
      {children}
      {n !== undefined && <span className="n">{n}</span>}
    </button>
  )
}

export type Tom = 'verde' | 'ink' | 'neutro'

const TONS: Record<Tom, CSSProperties> = {
  verde: { color: 'var(--color-accent-800)', borderColor: 'var(--color-accent-400)', background: 'var(--color-accent-100)' },
  ink: { color: 'var(--paper)', borderColor: 'var(--ink)', background: 'var(--ink)' },
  neutro: { color: 'rgba(29,31,32,.7)', borderColor: 'var(--hair)' },
}

/** Selo de situação. Alerta e atraso são pretos (nunca vermelho). */
export function Selo({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return (
    <span className="badge" style={TONS[tom]}>
      {children}
    </span>
  )
}

export function Campo({
  rotulo,
  erro,
  children,
  className = '',
}: {
  rotulo: string
  erro?: string | null
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`field ${className}`} style={{ display: 'block' }}>
      <span className="form-label">{rotulo}</span>
      {children}
      {erro && <div className="erro-txt">{erro}</div>}
    </label>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="dashed vazio">{children}</div>
}

export function Carregando() {
  return (
    <div className="center-screen" aria-label="Carregando">
      <div className="spinner" />
    </div>
  )
}

export function Modal({
  titulo,
  onFechar,
  children,
  largo,
}: {
  titulo: string
  onFechar: () => void
  children: ReactNode
  largo?: boolean
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [onFechar])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={`modal ${largo ? 'largo' : ''}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="between" style={{ alignItems: 'center' }}>
          <h3>{titulo}</h3>
          <button type="button" className="btn btn-icon" onClick={onFechar} aria-label="Fechar">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirmar({
  titulo,
  texto,
  acao,
  ocupado,
  onConfirmar,
  onCancelar,
}: {
  titulo: string
  texto: ReactNode
  acao: string
  ocupado?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}) {
  return (
    <Modal titulo={titulo} onFechar={onCancelar}>
      <p>{texto}</p>
      <div className="modal-foot">
        <button type="button" className="btn btn-secondary" onClick={onCancelar}>
          Cancelar
        </button>
        <button type="button" className="btn btn-ink" disabled={ocupado} onClick={onConfirmar}>
          {acao}
        </button>
      </div>
    </Modal>
  )
}

export function Cabecalho({ kicker, titulo, children }: { kicker: string; titulo: ReactNode; children?: ReactNode }) {
  return (
    <div className="between">
      <div>
        <div className="kicker">{kicker}</div>
        <h1>{titulo}</h1>
      </div>
      {children && <div className="row">{children}</div>}
    </div>
  )
}

export function Stat({ rotulo, valor, nota, tom }: { rotulo: string; valor: ReactNode; nota?: ReactNode; tom?: 'verde' | 'ink' }) {
  const estilo: CSSProperties | undefined =
    tom === 'ink'
      ? { background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }
      : undefined
  return (
    <Blueprint className="stat" style={estilo}>
      <span className="label-up" style={tom === 'ink' ? { color: 'rgba(242,242,243,.65)' } : undefined}>
        {rotulo}
      </span>
      <span className="v" style={tom === 'verde' ? { color: 'var(--color-accent-700)' } : undefined}>
        {valor}
      </span>
      {nota && (
        <span style={{ fontSize: 12.5, opacity: 0.7 }}>{nota}</span>
      )}
    </Blueprint>
  )
}

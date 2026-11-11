import { useCallback, useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react'
import { Check, Eraser, FileText } from 'lucide-react'
import { Blueprint, Campo } from '../components/ui'
import { chamarAssinatura, type PedidoParaAssinar } from '../lib/assinatura'
import { fmtData } from '../lib/dates'
import { docValido } from '../lib/documento'

/* Página pública: o cliente abre pelo link recebido no WhatsApp, sem login.
   Ela só conversa com a função de servidor da assinatura, usando o código do link. */

const LARGURA = 900
const ALTURA = 300

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-wrap">
      <Blueprint className="auth-card assinar-card">
        <div className="brand" style={{ padding: 0 }}>
          <img src="/logo-vital-cor.png" alt="Vital Esquadrias e Vidros" width={200} height={61} />
          <span className="produto">Assinatura do pedido</span>
        </div>
        {children}
      </Blueprint>
    </div>
  )
}

/** Quadro onde o cliente desenha a assinatura com o dedo ou o mouse. */
function Quadro({ onMudar }: { onMudar: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const desenhando = useRef(false)
  const ultimo = useRef({ x: 0, y: 0 })
  const percurso = useRef(0)

  const ponto = (e: PointerEvent<HTMLCanvasElement>) => {
    const c = ref.current!
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * LARGURA, y: ((e.clientY - r.top) / r.height) * ALTURA }
  }

  function comecar(e: PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    ref.current!.setPointerCapture(e.pointerId)
    desenhando.current = true
    ultimo.current = ponto(e)
  }

  function mover(e: PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return
    const ctx = ref.current!.getContext('2d')!
    const p = ponto(e)
    ctx.strokeStyle = '#1d1f20'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(ultimo.current.x, ultimo.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    percurso.current += Math.hypot(p.x - ultimo.current.x, p.y - ultimo.current.y)
    ultimo.current = p
  }

  function terminar() {
    if (!desenhando.current) return
    desenhando.current = false
    // um ponto ou risquinho não vale como assinatura
    onMudar(percurso.current > 220 ? ref.current!.toDataURL('image/png') : null)
  }

  function limpar() {
    ref.current!.getContext('2d')!.clearRect(0, 0, LARGURA, ALTURA)
    percurso.current = 0
    onMudar(null)
  }

  return (
    <div>
      <canvas
        ref={ref}
        width={LARGURA}
        height={ALTURA}
        className="quadro-assinatura"
        aria-label="Quadro para desenhar a assinatura"
        onPointerDown={comecar}
        onPointerMove={mover}
        onPointerUp={terminar}
        onPointerLeave={terminar}
        onPointerCancel={terminar}
      />
      <button type="button" className="btn-link" style={{ marginTop: 8 }} onClick={limpar}>
        <Eraser size={14} strokeWidth={1.5} />
        Limpar e desenhar de novo
      </button>
    </div>
  )
}

export function Assinar({ token }: { token: string }) {
  const [dados, setDados] = useState<PedidoParaAssinar | null>(null)
  const [erroLink, setErroLink] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [doc, setDoc] = useState('')
  const [png, setPng] = useState<string | null>(null)
  const [abriu, setAbriu] = useState(false)
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const carregar = useCallback(async () => {
    try {
      setDados(await chamarAssinatura({ acao: 'ver', token }))
    } catch (e) {
      setErroLink((e as Error).message)
    }
  }, [token])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // o endereço do PDF vale poucos minutos: renova enquanto a página está aberta
  useEffect(() => {
    if (dados?.situacao !== 'aguardando') return
    const t = window.setInterval(() => void carregar(), 8 * 60_000)
    return () => window.clearInterval(t)
  }, [dados?.situacao, carregar])

  async function assinar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (nome.trim().length < 5 || !nome.trim().includes(' ')) return setErro('Informe o seu nome completo.')
    if (!docValido(doc)) return setErro('CPF ou CNPJ inválido. Confira os números.')
    if (!png) return setErro('Desenhe a sua assinatura no quadro.')
    if (!aceite) return setErro('Marque que você leu e concorda com o pedido.')
    setOcupado(true)
    try {
      setDados({ ...(await chamarAssinatura({ acao: 'assinar', token, nome: nome.trim(), doc, assinatura: png, aceite: true })), cliente: dados?.cliente ?? '', codigo: dados?.codigo ?? '' })
    } catch (err) {
      setErro((err as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  if (erroLink)
    return (
      <Moldura>
        <h2>Link indisponível</h2>
        <p className="muted">{erroLink}</p>
      </Moldura>
    )

  if (!dados)
    return (
      <Moldura>
        <div className="row">
          <div className="spinner" />
          <span className="muted">Abrindo o pedido…</span>
        </div>
      </Moldura>
    )

  if (dados.situacao === 'assinado')
    return (
      <Moldura>
        <div>
          <div className="kicker">Pedido {dados.codigo}</div>
          <h2>Pedido assinado</h2>
        </div>
        <p>
          Obrigado{dados.cliente ? `, ${dados.cliente.split(' ')[0]}` : ''}. A sua assinatura foi registrada em {fmtData(dados.assinado_em)} e o pedido já
          está arquivado na Vital Esquadrias e Vidros.
        </p>
        {dados.verificacao && (
          <div className="codigo-verificacao">
            <span className="label-up">Código de verificação</span>
            <b>{dados.verificacao}</b>
          </div>
        )}
        {dados.url && (
          <a className="btn btn-primary" href={dados.url} rel="noreferrer">
            <FileText size={17} strokeWidth={1.5} />
            Baixar a minha via assinada
          </a>
        )}
        <p className="muted" style={{ fontSize: 13 }}>
          Pode fechar esta página. Em caso de dúvida, fale com o seu vendedor.
        </p>
      </Moldura>
    )

  return (
    <Moldura>
      <div>
        <div className="kicker">Pedido {dados.codigo}</div>
        <h2>Confira e assine</h2>
      </div>
      <p>
        Olá{dados.cliente ? `, ${dados.cliente.split(' ')[0]}` : ''}. A <b>Vital Esquadrias e Vidros</b> enviou este pedido para a sua assinatura
        {dados.enviado_por ? `, por ${dados.enviado_por}` : ''}. A Vital já assinou; falta só você.
      </p>

      <div className="passo">
        <span className="passo-n">1</span>
        <div className="col" style={{ gap: 10, flex: 1 }}>
          <b>Leia o pedido</b>
          {dados.url ? (
            <a className="btn btn-secondary" href={dados.url} target="_blank" rel="noreferrer" onClick={() => setAbriu(true)}>
              <FileText size={17} strokeWidth={1.5} />
              Abrir o pedido (PDF)
            </a>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => setAbriu(true)}>
              <FileText size={17} strokeWidth={1.5} />
              Abrir o pedido (PDF)
            </button>
          )}
          {abriu && (
            <span className="muted" style={{ fontSize: 13 }}>
              <Check size={13} strokeWidth={2} /> Pedido aberto. Depois de ler, volte para esta página.
            </span>
          )}
        </div>
      </div>

      <form className="col" onSubmit={assinar}>
        <div className="passo">
          <span className="passo-n">2</span>
          <div className="col" style={{ gap: 12, flex: 1 }}>
            <b>Identifique-se</b>
            <Campo rotulo="Nome completo">
              <input className="input" required maxLength={120} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} />
            </Campo>
            <Campo rotulo="CPF ou CNPJ">
              <input className="input" required maxLength={20} inputMode="text" value={doc} onChange={(e) => setDoc(e.target.value)} />
            </Campo>
          </div>
        </div>

        <div className="passo">
          <span className="passo-n">3</span>
          <div className="col" style={{ gap: 10, flex: 1, minWidth: 0 }}>
            <b>Desenhe a sua assinatura</b>
            <Quadro
              onMudar={(v) => {
                setPng(v)
                if (v) setErro(null)
              }}
            />
          </div>
        </div>

        <label className="row" style={{ gap: 10, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} style={{ marginTop: 4 }} />
          <span>Li o pedido e concordo com ele. Entendo que esta assinatura eletrônica vale como a minha assinatura.</span>
        </label>

        {erro && (
          <div className="erro-txt" role="alert" style={{ fontSize: 14 }}>
            {erro}
          </div>
        )}
        {!abriu && <span className="muted" style={{ fontSize: 13 }}>Abra o pedido (passo 1) para liberar a assinatura.</span>}
        <button className="btn btn-primary" disabled={ocupado || !abriu}>
          {ocupado ? 'Registrando a assinatura…' : 'Assinar o pedido'}
        </button>
      </form>

      <p className="muted" style={{ fontSize: 12.5 }}>
        Este link é pessoal e vale até {fmtData(dados.expira_em)}. Ao assinar, ficam registrados o seu nome, CPF/CNPJ, a data, a hora e o endereço de
        internet do aparelho.
      </p>
    </Moldura>
  )
}

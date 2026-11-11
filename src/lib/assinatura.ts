import { DEMO } from './supabase'

/** Código secreto do link: 32 bytes aleatórios. O banco guarda só o hash dele. */
export function novoToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256Hex(dados: ArrayBuffer | string): Promise<string> {
  const bytes = typeof dados === 'string' ? new TextEncoder().encode(dados) : dados
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(h, (x) => x.toString(16).padStart(2, '0')).join('')
}

export function linkAssinatura(token: string): string {
  return `${window.location.origin}/assinar/${token}`
}

/** Abre o WhatsApp de quem está usando, já com o número do cliente e a mensagem. */
export function linkWhatsapp(fone: string | null, texto: string): string {
  let n = (fone ?? '').replace(/\D/g, '')
  if (n.length === 10 || n.length === 11) n = '55' + n
  else if (!(n.startsWith('55') && (n.length === 12 || n.length === 13))) n = ''
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`
}

export interface PedidoParaAssinar {
  situacao: 'aguardando' | 'assinado'
  cliente: string
  codigo: string
  arquivo?: string
  enviado_por?: string
  expira_em?: string
  url?: string | null
  assinado_em?: string
  verificacao?: string
}

/** Chama a função de servidor da assinatura. Quem chama é o cliente, sem login. */
export async function chamarAssinatura(corpo: Record<string, unknown>): Promise<PedidoParaAssinar> {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 500))
    if (corpo.acao === 'assinar') return { situacao: 'assinado', cliente: 'Márcia Conceição', codigo: 'VITAL-26-11-0031', verificacao: 'VF-7K2M-9QXD', assinado_em: new Date().toISOString(), url: null }
    return {
      situacao: 'aguardando', cliente: 'Márcia Conceição', codigo: 'VITAL-26-11-0031', arquivo: 'pedido-marcia.pdf', enviado_por: 'Carlos Vendedor',
      expira_em: new Date(Date.now() + 7 * 86_400_000).toISOString(), url: null,
    }
  }
  const base = import.meta.env.VITE_SUPABASE_URL as string
  const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  let resp: Response
  try {
    resp = await fetch(`${base}/functions/v1/assinatura`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: chave },
      body: JSON.stringify(corpo),
    })
  } catch {
    throw new Error('Sem conexão. Verifique a internet e tente de novo.')
  }
  const dados = (await resp.json().catch(() => ({}))) as PedidoParaAssinar & { erro?: string }
  if (!resp.ok) throw new Error(dados.erro || 'Não foi possível concluir. Tente de novo em instantes.')
  return dados
}

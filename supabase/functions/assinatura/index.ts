// Função de servidor: assinatura eletrônica do pedido pelo cliente (página pública, sem login).
//
// Quem chama não tem login. A autorização é o código secreto do link:
//  - o banco guarda só o hash (SHA-256) do código; o código em si nunca fica gravado;
//  - o link vale 7 dias e serve para uma única assinatura;
//  - há limite de tentativas por aparelho.
// A chave de serviço usada aqui vem do ambiente da função e nunca vai para o site.
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as pdfLib from 'npm:pdf-lib@1.17.1'
import { limpo, montarPdf } from './termo.ts'
import { docValido, formatarDoc, soDoc } from './valida.ts'

const SITE = Deno.env.get('SITE_URL') ?? 'https://vitalfinanceiro.netlify.app'
const BUCKET = 'pedidos'
const MAX_CORPO = 700_000
const MAX_ASSINATURA = 400_000
const MAX_TENTATIVAS_DOC = 5
const LIMITE_POR_IP = 40 // chamadas a cada 10 minutos
const INVALIDO = 'Link inválido ou expirado. Peça um novo link ao seu vendedor.'

const banco = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})

function cabecalhos(req: Request): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Vary': 'Origin',
  }
  // só o site oficial pode chamar pelo navegador
  if (req.headers.get('origin') === SITE) {
    h['Access-Control-Allow-Origin'] = SITE
    h['Access-Control-Allow-Headers'] = 'authorization, apikey, content-type, x-client-info'
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    h['Access-Control-Max-Age'] = '600'
  }
  return h
}

const b64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

// O logotipo vem do próprio site (arquivo público) e fica guardado na memória da função.
let logoGuardado: Uint8Array | null = null
async function logo(): Promise<Uint8Array | null> {
  if (logoGuardado) return logoGuardado
  try {
    const r = await fetch(`${SITE}/logo-vital-cor.png`, { signal: AbortSignal.timeout(6000) })
    const bytes = new Uint8Array(await r.arrayBuffer())
    if (r.ok && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes.length < 200_000) logoGuardado = bytes
  } catch {
    // sem logo o termo sai com o nome da empresa em texto
  }
  return logoGuardado
}

async function sha256(dados: Uint8Array | string): Promise<string> {
  const bytes = typeof dados === 'string' ? new TextEncoder().encode(dados) : dados
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(h, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Comparação em tempo constante. */
function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let dif = 0
  for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return dif === 0
}

function dataHora(d: Date): string {
  const p = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  return `${v('day')}/${v('month')}/${v('year')} às ${v('hour')}:${v('minute')}`
}

function codigoVerificacao(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem 0/O e 1/I, para ditar por telefone
  const r = crypto.getRandomValues(new Uint8Array(8))
  const c = Array.from(r, (b) => letras[b % letras.length]).join('')
  return `VF-${c.slice(0, 4)}-${c.slice(4)}`
}

class Erro extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem)
  }
}

async function freio(ip: string): Promise<void> {
  await banco.from('assinatura_tentativas').insert({ ip })
  const desde = new Date(Date.now() - 10 * 60_000).toISOString()
  const { count } = await banco.from('assinatura_tentativas').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('quando', desde)
  if ((count ?? 0) > LIMITE_POR_IP) throw new Erro(429, 'Muitas tentativas. Aguarde alguns minutos e tente de novo.')
  // limpeza ocasional do que já tem mais de um dia
  if (Math.random() < 0.02) {
    await banco.from('assinatura_tentativas').delete().lt('quando', new Date(Date.now() - 86_400_000).toISOString())
  }
}

// deno-lint-ignore no-explicit-any
async function buscar(token: unknown): Promise<any> {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Erro(404, INVALIDO)
  const hash = await sha256(token)
  const { data } = await banco
    .from('assinaturas')
    .select('*, orcamentos(codigo, cliente, cliente_doc)')
    .eq('token_hash', hash)
    .maybeSingle()
  if (!data || !igual(data.token_hash, hash)) throw new Erro(404, INVALIDO)
  return data
}

// deno-lint-ignore no-explicit-any
async function ver(a: any) {
  if (a.status === 'assinado') {
    return { situacao: 'assinado', cliente: a.orcamentos?.cliente ?? '', codigo: a.orcamentos?.codigo ?? '', assinado_em: a.assinado_em, verificacao: a.codigo_verificacao }
  }
  if (a.status !== 'aguardando' || new Date(a.expira_em).getTime() < Date.now()) throw new Erro(404, INVALIDO)
  const { data, error } = await banco.storage.from(BUCKET).createSignedUrl(a.original_path, 900)
  if (error || !data) throw new Erro(500, 'Não foi possível abrir o pedido agora. Tente de novo em instantes.')
  return {
    situacao: 'aguardando',
    cliente: a.orcamentos?.cliente ?? '',
    codigo: a.orcamentos?.codigo ?? '',
    arquivo: a.arquivo_nome,
    enviado_por: a.enviado_por_nome ?? 'Vital Esquadrias e Vidros',
    expira_em: a.expira_em,
    url: data.signedUrl,
  }
}

// deno-lint-ignore no-explicit-any
async function assinar(a: any, corpo: any, ip: string, agente: string) {
  if (a.status === 'assinado') throw new Erro(409, 'Este pedido já foi assinado.')
  if (a.status !== 'aguardando' || new Date(a.expira_em).getTime() < Date.now()) throw new Erro(404, INVALIDO)

  // ---- validação das entradas
  const nome = limpo(String(corpo.nome ?? ''), 120)
  const doc = soDoc(String(corpo.doc ?? ''))
  const img = String(corpo.assinatura ?? '')
  if (corpo.aceite !== true) throw new Erro(400, 'Marque que leu e concorda com o pedido.')
  if (nome.length < 5 || !nome.includes(' ')) throw new Erro(400, 'Informe o nome completo.')
  if (!docValido(doc)) throw new Erro(400, 'CPF ou CNPJ inválido. Confira os números.')
  const prefixo = 'data:image/png;base64,'
  if (!img.startsWith(prefixo) || img.length > MAX_ASSINATURA || img.length < 600) throw new Erro(400, 'Desenhe a sua assinatura no quadro.')
  let rubrica: Uint8Array
  try {
    rubrica = b64(img.slice(prefixo.length))
  } catch {
    throw new Erro(400, 'Desenhe a sua assinatura no quadro.')
  }
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!PNG.every((b, i) => rubrica[i] === b)) throw new Erro(400, 'Desenhe a sua assinatura no quadro.')

  // ---- o CPF/CNPJ precisa bater com o cadastro, quando o cadastro tem
  const cadastro = soDoc(a.orcamentos?.cliente_doc ?? '')
  if (cadastro && !igual(cadastro, doc)) {
    const tentativas = (a.tentativas ?? 0) + 1
    const bloquear = tentativas >= MAX_TENTATIVAS_DOC
    await banco.from('assinaturas').update({ tentativas, ...(bloquear ? { status: 'cancelado' } : {}) }).eq('id', a.id).eq('status', 'aguardando')
    throw new Erro(bloquear ? 404 : 400, bloquear ? 'Link bloqueado por excesso de tentativas. Peça um novo link ao seu vendedor.' : 'O CPF/CNPJ não confere com o cadastro do pedido.')
  }

  // ---- reserva: só uma chamada consegue passar de aguardando para assinado
  const agora = new Date()
  const verificacao = codigoVerificacao()
  const { data: reservado } = await banco
    .from('assinaturas')
    .update({
      status: 'assinado', assinante_nome: nome, assinante_doc: doc, assinante_ip: ip.slice(0, 60),
      assinante_agente: agente.slice(0, 300), assinado_em: agora.toISOString(), codigo_verificacao: verificacao,
    })
    .eq('id', a.id).eq('status', 'aguardando').gt('expira_em', agora.toISOString())
    .select('id')
  if (!reservado?.length) throw new Erro(409, 'Este pedido já foi assinado ou o link expirou.')

  const desfazer = () =>
    banco.from('assinaturas').update({
      status: 'aguardando', assinante_nome: null, assinante_doc: null, assinante_ip: null,
      assinante_agente: null, assinado_em: null, codigo_verificacao: null,
    }).eq('id', a.id)

  try {
    const { data: arq, error: e1 } = await banco.storage.from(BUCKET).download(a.original_path)
    if (e1 || !arq) throw new Error('download')
    const original = new Uint8Array(await arq.arrayBuffer())
    const hash = await sha256(original)
    // o arquivo guardado tem de ser exatamente o que o vendedor enviou
    if (!igual(hash, a.original_sha256)) throw new Error('hash')

    const { bytes } = await montarPdf(pdfLib, original, {
      codigo: a.orcamentos?.codigo ?? '', cliente: a.orcamentos?.cliente ?? '', arquivoNome: a.arquivo_nome,
      hashOriginal: hash, verificacao,
      vitalPor: a.enviado_por_nome ?? 'Vital Esquadrias e Vidros', vitalEm: dataHora(new Date(a.criado_em)),
      assinanteNome: nome, assinanteDoc: formatarDoc(doc), assinadoEm: dataHora(agora), ip,
      logoPng: await logo(), assinaturaPng: rubrica,
    })

    const caminho = `${a.orcamento_id}/${crypto.randomUUID()}.pdf`
    const { error: e2 } = await banco.storage.from(BUCKET).upload(caminho, bytes, { contentType: 'application/pdf' })
    if (e2) throw new Error('upload')
    const nomeFinal = limpo(`Pedido assinado - ${a.orcamentos?.codigo ?? ''}`, 110) + '.pdf'
    const { data: pedido, error: e3 } = await banco
      .from('pedidos_assinados')
      .insert({ orcamento_id: a.orcamento_id, arquivo_path: caminho, arquivo_nome: nomeFinal, criado_por: a.enviado_por })
      .select('id').single()
    if (e3 || !pedido) {
      await banco.storage.from(BUCKET).remove([caminho])
      throw new Error('registro')
    }
    await banco.from('assinaturas').update({ pedido_id: pedido.id }).eq('id', a.id)

    const { data: link } = await banco.storage.from(BUCKET).createSignedUrl(caminho, 900, { download: nomeFinal })
    return { situacao: 'assinado', verificacao, assinado_em: agora.toISOString(), url: link?.signedUrl ?? null }
  } catch (e) {
    await desfazer()
    console.error('assinatura falhou:', (e as Error).message)
    throw new Erro(500, 'Não foi possível concluir a assinatura agora. Tente de novo em instantes.')
  }
}

Deno.serve(async (req) => {
  const h = cabecalhos(req)
  const responder = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status, headers: h })
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h })
  if (req.method !== 'POST') return responder(405, { erro: 'Método não permitido.' })

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'desconhecido'
  try {
    const texto = await req.text()
    if (texto.length > MAX_CORPO) throw new Erro(413, 'Envio grande demais.')
    // deno-lint-ignore no-explicit-any
    let corpo: any
    try {
      corpo = JSON.parse(texto)
    } catch {
      throw new Erro(400, 'Pedido inválido.')
    }
    if (!corpo || typeof corpo !== 'object') throw new Erro(400, 'Pedido inválido.')
    await freio(ip)
    const registro = await buscar(corpo.token)
    if (corpo.acao === 'ver') return responder(200, await ver(registro))
    if (corpo.acao === 'assinar') return responder(200, await assinar(registro, corpo, ip, req.headers.get('user-agent') ?? ''))
    throw new Erro(400, 'Pedido inválido.')
  } catch (e) {
    // nunca devolve detalhe interno
    if (e instanceof Erro) return responder(e.status, { erro: e.message })
    console.error('erro inesperado:', (e as Error).message)
    return responder(500, { erro: 'Não foi possível concluir. Tente de novo em instantes.' })
  }
})

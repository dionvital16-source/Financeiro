import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Modo demonstração: abrir o site com ?demo. Vale até fechar a aba. */
function detectarDemo(): boolean {
  try {
    if (new URLSearchParams(window.location.search).has('demo')) sessionStorage.setItem('demo', '1')
    return sessionStorage.getItem('demo') === '1'
  } catch {
    return new URLSearchParams(window.location.search).has('demo')
  }
}

// VITE_DEMO=1 liga a demonstração direto na construção: usado só em prévias, nunca no site publicado.
export const DEMO = import.meta.env.VITE_DEMO === '1' || detectarDemo()
export const CONFIGURADO = Boolean(url && chave)

/** Só a chave pública entra aqui. No modo demonstração o banco nem é criado. */
export const supabase: SupabaseClient | null = !DEMO && url && chave ? createClient(url, chave) : null

export function banco(): SupabaseClient {
  if (!supabase) throw new Error('Banco não configurado.')
  return supabase
}

export const BUCKET_NOTAS = 'notas'
export const BUCKET_PEDIDOS = 'pedidos'
export const TAMANHO_MAX_ARQUIVO = 25 * 1024 * 1024

/** Traduz os erros do Supabase para português simples. */
export function mensagemErro(e: unknown): string {
  const err = (e ?? {}) as { message?: string; code?: string; status?: number }
  const msg = err.message ?? ''
  const m = msg.toLowerCase()
  if (m.includes('cadastro não autorizado'))
    return 'Este e-mail não está liberado. Peça ao administrador para criar o seu acesso.'
  if (err.code === 'P0001' && msg) return msg
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail (veja a caixa de entrada) antes de entrar.'
  if (m.includes('database error saving new user'))
    return 'Este e-mail não está liberado. Peça ao administrador para criar o seu acesso.'
  if (m.includes('already registered')) return 'Este e-mail já tem conta. Use "Entrar".'
  if (m.includes('password should be at least')) return 'A senha precisa ter no mínimo 8 caracteres.'
  if (m.includes('weak') || m.includes('pwned') || m.includes('leaked'))
    return 'Senha fraca ou que já apareceu em vazamentos. Escolha outra.'
  if (m.includes('should be different from the old password')) return 'A nova senha precisa ser diferente da atual.'
  if (m.includes('rate limit') || err.status === 429) return 'Muitas tentativas. Aguarde um pouco e tente de novo.'
  if (err.code === '42501' || m.includes('row-level security') || m.includes('permission denied'))
    return 'Você não tem permissão para fazer isso.'
  if (err.code === 'PGRST116') return 'Registro não encontrado ou sem permissão para alterar.'
  if (err.code === '23505') return 'Já existe um registro com esse mesmo dado.'
  if (err.code === '23503') return 'Não dá para apagar: existem lançamentos ligados a este registro.'
  if (err.code === '23514' || err.code === '23502') return 'Algum campo está vazio ou com valor inválido.'
  if (m.includes('exceeded the maximum allowed size')) return 'Arquivo grande demais (máximo 25 MB).'
  if (m.includes('mime type')) return 'Só é aceito arquivo PDF.'
  if (m.includes('failed to fetch') || m.includes('networkerror')) return 'Sem conexão com o servidor. Verifique a internet.'
  if (e instanceof Error && !err.code && !err.status && msg && !/[{}<>]/.test(msg) && e.name === 'Error') return msg
  return 'Não foi possível concluir. Tente de novo.'
}

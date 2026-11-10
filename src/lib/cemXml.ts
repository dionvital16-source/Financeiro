import { arred } from './format'

/** Orçamento lido de um XML de vendas do CEM. */
export interface OrcamentoCem {
  codigo: string
  cliente: string
  cliente_doc: string | null
  obra: string | null
  cidade: string | null
  uf: string | null
  vendedor_nome: string | null
  /** soma de quantidade x preço dos itens; os itens em si não são guardados */
  valor: number
}

const TAMANHO_MAX = 5 * 1024 * 1024

function filho(pai: Element | null | undefined, tag: string): Element | null {
  if (!pai) return null
  for (const el of Array.from(pai.children)) if (el.tagName === tag) return el
  return null
}

function texto(pai: Element | null | undefined, tag: string): string {
  return (filho(pai, tag)?.textContent ?? '').trim()
}

function numero(pai: Element, tag: string): number {
  const n = Number(texto(pai, tag).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** O CEM grava em WINDOWS-1252; lê a codificação declarada na primeira linha. */
function decodificar(buf: ArrayBuffer): string {
  const inicio = new TextDecoder('latin1').decode(buf.slice(0, 200))
  const enc = /encoding\s*=\s*["']([\w-]+)["']/i.exec(inicio)?.[1] ?? 'utf-8'
  try {
    return new TextDecoder(enc).decode(buf)
  } catch {
    return new TextDecoder('windows-1252').decode(buf)
  }
}

export function lerXmlCem(xml: string): OrcamentoCem {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('O arquivo não é um XML válido.')
  const raiz = doc.documentElement
  if (raiz.tagName !== 'OBRA') throw new Error('Este XML não é uma venda do CEM (falta a seção OBRA).')

  const obra = filho(raiz, 'DADOS_OBRA')
  const cli = filho(raiz, 'DADOS_CLIENTE')
  const end = filho(obra, 'ENDERECO_OBRA')
  const codigo = texto(obra, 'CODIGO')
  if (!codigo) throw new Error('O XML não tem o código da obra.')

  // O XML não traz o total: somamos quantidade x preço de cada item.
  let total = 0
  for (const t of Array.from(filho(raiz, 'TIPOLOGIAS')?.children ?? [])) {
    if (t.tagName === 'TIPOLOGIA') total += numero(t, 'QTDE') * numero(t, 'PRECO_UNIT')
  }

  return {
    codigo,
    cliente: texto(cli, 'NOME') || 'Cliente não informado',
    cliente_doc: texto(cli, 'CNPJ_CPF') || null,
    obra: texto(obra, 'NOME') || null,
    cidade: texto(end, 'END_CIDADE') || texto(cli, 'END_CIDADE') || null,
    uf: texto(end, 'END_UF') || texto(cli, 'END_UF') || null,
    vendedor_nome: texto(obra, 'VENDEDOR') || null,
    valor: arred(total),
  }
}

export async function lerArquivoCem(arquivo: File): Promise<OrcamentoCem> {
  if (arquivo.size > TAMANHO_MAX) throw new Error('Arquivo grande demais (máximo 5 MB).')
  return lerXmlCem(decodificar(await arquivo.arrayBuffer()))
}

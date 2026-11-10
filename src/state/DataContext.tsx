import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { normalizar } from '../lib/format'
import { BUCKET_NOTAS, DEMO, TAMANHO_MAX_ARQUIVO, banco } from '../lib/supabase'
import { NOME_TABELA, type Chave, type Dados, type Nota, type Tabelas } from '../lib/types'
import { useAuth } from './AuthContext'
import { dadosDemo } from './demo'

type Novo<K extends Chave> = Partial<Tabelas[K]>

interface DataCtx extends Dados {
  carregando: boolean
  erro: unknown
  recarregar: () => Promise<void>
  /** Cria (sem id) ou altera (com id) um registro e devolve como ficou no banco. */
  gravar: <K extends Chave>(k: K, reg: Novo<K>) => Promise<Tabelas[K]>
  apagar: (k: Chave, id: string) => Promise<void>
  /** Envia o PDF da nota para a área privada e grava o caminho na nota. */
  anexarPdf: (nota: Nota, arquivo: File) => Promise<void>
  /** Link assinado de 1 hora, sempre forçando download. */
  linkPdf: (nota: Nota) => Promise<string | null>
}

const VAZIO: Dados = { perfis: [], formas: [], orcamentos: [], parcelas: [], notas: [] }
const Ctx = createContext<DataCtx | null>(null)

const PADRAO: { [K in Chave]: Novo<K> } = {
  perfis: { user_id: null, ativo: true },
  formas: { ativo: true, ordem: 99 },
  orcamentos: { itens: [], origem: 'manual', cliente_doc: null, obra: null, cidade: null, uf: null, observacao: null },
  parcelas: { pago_em: null, descricao: null, observacao: null },
  notas: { arquivo_path: null, arquivo_nome: null },
}

function ordenar(d: Dados): Dados {
  return {
    perfis: [...d.perfis].sort((a, b) => a.nome.localeCompare(b.nome)),
    formas: [...d.formas].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)),
    orcamentos: [...d.orcamentos].sort(
      (a, b) => b.data_fechamento.localeCompare(a.data_fechamento) || b.codigo.localeCompare(a.codigo),
    ),
    parcelas: [...d.parcelas].sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    notas: [...d.notas].sort((a, b) => a.data_emissao.localeCompare(b.data_emissao)),
  }
}

/** O banco devolve valores em dinheiro como número, mas garantimos aqui. */
function numeros(d: Dados): Dados {
  return {
    ...d,
    orcamentos: d.orcamentos.map((o) => ({ ...o, valor: Number(o.valor), itens: o.itens ?? [] })),
    parcelas: d.parcelas.map((p) => ({ ...p, valor: Number(p.valor) })),
    notas: d.notas.map((n) => ({ ...n, valor: Number(n.valor) })),
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { perfil } = useAuth()
  const [dados, setDados] = useState<Dados>(DEMO ? ordenar(dadosDemo()) : VAZIO)
  const [carregando, setCarregando] = useState(!DEMO)
  const [erro, setErro] = useState<unknown>(null)
  const perfilId = perfil?.id ?? null
  const atuais = useRef(dados)
  atuais.current = dados

  const recarregar = useCallback(async () => {
    if (DEMO) return
    setCarregando(true)
    setErro(null)
    try {
      const chaves = Object.keys(NOME_TABELA) as Chave[]
      const res = await Promise.all(chaves.map((k) => banco().from(NOME_TABELA[k]).select('*')))
      const novo = { ...VAZIO } as Record<Chave, unknown[]>
      res.forEach((r, i) => {
        if (r.error) throw r.error
        novo[chaves[i]] = r.data ?? []
      })
      setDados(ordenar(numeros(novo as Dados)))
    } catch (e) {
      setErro(e)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (DEMO) return
    if (perfilId) void recarregar()
    else setDados(VAZIO)
  }, [perfilId, recarregar])

  const gravar = useCallback(async <K extends Chave>(k: K, reg: Novo<K>): Promise<Tabelas[K]> => {
    let linha: Tabelas[K]
    if (DEMO) {
      const atual = reg.id ? (atuais.current[k] as Tabelas[K][]).find((x) => x.id === reg.id) : undefined
      linha = (
        atual
          ? { ...atual, ...reg }
          : { ...PADRAO[k], criado_por: perfilId, ...reg, id: crypto.randomUUID(), criado_em: new Date().toISOString() }
      ) as Tabelas[K]
    } else {
      const { id, ...campos } = reg as { id?: string } & Record<string, unknown>
      const t = banco().from(NOME_TABELA[k])
      const { data, error } = await (id ? t.update(campos).eq('id', id) : t.insert(campos)).select().single()
      if (error) throw error
      linha = data as Tabelas[K]
    }
    setDados((d) => {
      const lista = d[k] as Tabelas[K][]
      const existe = lista.some((x) => x.id === linha.id)
      const nova = existe ? lista.map((x) => (x.id === linha.id ? linha : x)) : [...lista, linha]
      return ordenar(numeros({ ...d, [k]: nova }))
    })
    return linha
  }, [perfilId])

  const apagar = useCallback(async (k: Chave, id: string) => {
    if (!DEMO) {
      const { data, error } = await banco().from(NOME_TABELA[k]).delete().eq('id', id).select('id')
      if (error) throw error
      if (!data?.length) throw { code: '42501' }
    }
    setDados((d) => {
      const novo = { ...d, [k]: (d[k] as { id: string }[]).filter((x) => x.id !== id) } as Dados
      if (k === 'orcamentos') {
        // no banco, parcelas e notas do orçamento são apagadas junto
        novo.parcelas = novo.parcelas.filter((p) => p.orcamento_id !== id)
        novo.notas = novo.notas.filter((n) => n.orcamento_id !== id)
      }
      return novo
    })
  }, [])

  const anexarPdf = useCallback(
    async (nota: Nota, arquivo: File) => {
      if (arquivo.type !== 'application/pdf') throw new Error('Só é aceito arquivo PDF.')
      if (arquivo.size > TAMANHO_MAX_ARQUIVO) throw new Error('Arquivo grande demais (máximo 25 MB).')
      // o caminho começa com o id do orçamento dono; o banco confere a permissão por ele
      const caminho = `${nota.orcamento_id}/${crypto.randomUUID()}.pdf`
      if (!DEMO) {
        const { error } = await banco().storage.from(BUCKET_NOTAS).upload(caminho, arquivo, { contentType: 'application/pdf' })
        if (error) throw error
      }
      await gravar('notas', { id: nota.id, arquivo_path: caminho, arquivo_nome: arquivo.name.slice(0, 120) })
    },
    [gravar],
  )

  const linkPdf = useCallback(async (nota: Nota) => {
    if (!nota.arquivo_path || DEMO) return null
    const nome = `NF-${nota.numero.replace(/[^\w.-]+/g, '_')}.pdf`
    const { data, error } = await banco().storage.from(BUCKET_NOTAS).createSignedUrl(nota.arquivo_path, 3600, { download: nome })
    if (error) throw error
    return data.signedUrl
  }, [])

  // No modo demonstração não há banco para filtrar: imitamos aqui a regra do vendedor (só vê os dele).
  const visiveis = useMemo<Dados>(() => {
    if (!DEMO || !perfil || perfil.papel !== 'Vendedor') return dados
    const meus = new Set(dados.orcamentos.filter((o) => o.vendedor_id === perfil.id).map((o) => o.id))
    return {
      ...dados,
      perfis: dados.perfis.filter((p) => p.id === perfil.id),
      orcamentos: dados.orcamentos.filter((o) => meus.has(o.id)),
      parcelas: dados.parcelas.filter((p) => meus.has(p.orcamento_id)),
      notas: dados.notas.filter((n) => meus.has(n.orcamento_id)),
    }
  }, [dados, perfil])

  return (
    <Ctx.Provider value={{ ...visiveis, carregando, erro, recarregar, gravar, apagar, anexarPdf, linkPdf }}>
      {children}
    </Ctx.Provider>
  )
}

export function useDados(): DataCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('DataProvider ausente')
  return c
}

/** Acha o perfil cujo nome bate com o nome do vendedor que veio no XML. */
export function acharVendedor(perfis: Tabelas['perfis'][], nome: string | null): string | null {
  const alvo = normalizar(nome)
  if (!alvo) return null
  return perfis.find((p) => normalizar(p.nome) === alvo)?.id ?? null
}

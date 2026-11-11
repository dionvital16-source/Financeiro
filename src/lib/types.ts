export type Papel = 'Admin' | 'Financeiro' | 'Vendedor'
export const PAPEIS: Papel[] = ['Admin', 'Financeiro', 'Vendedor']

export interface Perfil {
  id: string
  user_id: string | null
  email: string
  nome: string
  papel: Papel
  ativo: boolean
  criado_em: string
}

export interface Forma {
  id: string
  nome: string
  ativo: boolean
  ordem: number
}

export interface ItemOrcamento {
  tipo: string
  descricao: string
  vidro: string
  qtde: number
  largura: number
  altura: number
  preco_unit: number
}

export interface Orcamento {
  id: string
  codigo: string
  cliente: string
  cliente_doc: string | null
  cliente_endereco: string | null
  cliente_fone: string | null
  cliente_email: string | null
  obra: string | null
  cidade: string | null
  uf: string | null
  valor: number
  data_fechamento: string
  vendedor_id: string | null
  vendedor_nome: string | null
  observacao: string | null
  itens: ItemOrcamento[]
  origem: 'manual' | 'cem'
  criado_por: string | null
  criado_em: string
}

export interface Parcela {
  id: string
  orcamento_id: string
  descricao: string | null
  forma_id: string
  valor: number
  vencimento: string
  pago_em: string | null
  observacao: string | null
  criado_por: string | null
  criado_em: string
}

export interface Nota {
  id: string
  orcamento_id: string
  numero: string
  data_emissao: string
  valor: number
  arquivo_path: string | null
  arquivo_nome: string | null
  criado_por: string | null
  criado_em: string
}

export interface Pedido {
  id: string
  orcamento_id: string
  arquivo_path: string
  arquivo_nome: string
  criado_por: string | null
  criado_em: string
}

export interface Assinatura {
  id: string
  orcamento_id: string
  original_path: string
  arquivo_nome: string
  original_sha256: string
  token_hash: string
  status: 'aguardando' | 'assinado' | 'cancelado'
  expira_em: string
  tentativas: number
  enviado_por: string | null
  enviado_por_nome: string | null
  criado_em: string
  assinante_nome: string | null
  assinante_doc: string | null
  assinado_em: string | null
  codigo_verificacao: string | null
  pedido_id: string | null
}

export interface Tabelas {
  perfis: Perfil
  formas: Forma
  orcamentos: Orcamento
  parcelas: Parcela
  notas: Nota
  pedidos: Pedido
  assinaturas: Assinatura
}
export type Chave = keyof Tabelas
export type Dados = { [K in Chave]: Tabelas[K][] }

export const NOME_TABELA: Record<Chave, string> = {
  perfis: 'profiles',
  formas: 'formas_pagamento',
  orcamentos: 'orcamentos',
  parcelas: 'parcelas',
  notas: 'notas_fiscais',
  pedidos: 'pedidos_assinados',
  assinaturas: 'assinaturas',
}

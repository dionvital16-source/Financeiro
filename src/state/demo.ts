import { addDias, addMeses, hojeISO } from '../lib/dates'
import type { Dados, Forma, Nota, Orcamento, Parcela, Perfil } from '../lib/types'

/* Dados de exemplo do modo demonstração (?demo). Ficam só na memória do navegador. */

const agora = new Date().toISOString()
const hoje = hojeISO()

const perfil = (id: string, nome: string, email: string, papel: Perfil['papel']): Perfil => ({
  id,
  user_id: id,
  email,
  nome,
  papel,
  ativo: true,
  criado_em: agora,
})

export const PERFIS_DEMO: Perfil[] = [
  perfil('p-admin', 'Dion Vital', 'admin@exemplo.com', 'Admin'),
  perfil('p-fin', 'Paula Financeiro', 'financeiro@exemplo.com', 'Financeiro'),
  perfil('p-v1', 'Carlos Vendedor', 'carlos@exemplo.com', 'Vendedor'),
  perfil('p-v2', 'Ana Vendedora', 'ana@exemplo.com', 'Vendedor'),
]

const formas: Forma[] = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Cheque', 'Transferência'].map(
  (nome, i) => ({ id: `f-${i + 1}`, nome, ativo: true, ordem: i + 1 }),
)

const orc = (
  id: string,
  codigo: string,
  cliente: string,
  obra: string,
  valor: number,
  fechadoHaDias: number,
  vendedor: Perfil,
): Orcamento => ({
  id,
  codigo,
  cliente,
  cliente_doc: null,
  obra,
  cidade: 'Camacan',
  uf: 'BA',
  valor,
  data_fechamento: addDias(hoje, -fechadoHaDias),
  vendedor_id: vendedor.id,
  vendedor_nome: vendedor.nome,
  observacao: null,
  itens: [],
  origem: 'manual',
  criado_por: 'p-fin',
  criado_em: agora,
})

const [admin, , v1, v2] = PERFIS_DEMO

const orcamentos: Orcamento[] = [
  orc('o-1', 'VITAL-DEMO-0001', 'João Pereira', 'Residencial', 18500, 3, v1),
  orc('o-2', 'VITAL-DEMO-0002', 'Construtora Horizonte', 'Edifício Aurora', 64200, 12, v2),
  orc('o-3', 'VITAL-DEMO-0003', 'Maria Souza', 'Loja Centro', 9800, 20, v1),
  orc('o-4', 'VITAL-DEMO-0004', 'Pedro Lima', 'Casa de praia', 27300, 45, admin),
  orc('o-5', 'VITAL-DEMO-0005', 'Clínica Bem Estar', 'Reforma fachada', 12400, 70, v2),
]

let seq = 0
const parc = (o: string, descricao: string, forma: string, valor: number, vencimento: string, pago: string | null): Parcela => ({
  id: `pa-${++seq}`,
  orcamento_id: o,
  descricao,
  forma_id: forma,
  valor,
  vencimento,
  pago_em: pago,
  observacao: null,
  criado_por: 'p-fin',
  criado_em: agora,
})

const parcelas: Parcela[] = [
  parc('o-1', 'Entrada', 'f-1', 9250, addDias(hoje, -3), addDias(hoje, -3)),
  parc('o-1', 'Na entrega', 'f-1', 9250, addDias(hoje, 25), null),
  parc('o-2', 'Entrada', 'f-7', 21400, addDias(hoje, -12), addDias(hoje, -12)),
  parc('o-2', '1/2', 'f-5', 21400, addDias(hoje, -2), null),
  parc('o-2', '2/2', 'f-5', 21400, addMeses(addDias(hoje, -2), 1), null),
  parc('o-3', 'À vista', 'f-2', 9800, addDias(hoje, -20), addDias(hoje, -19)),
  parc('o-4', 'Entrada', 'f-1', 10000, addDias(hoje, -45), addDias(hoje, -45)),
  parc('o-4', '1/3', 'f-3', 5766.67, addDias(hoje, -15), addDias(hoje, -15)),
  parc('o-4', '2/3', 'f-3', 5766.67, addDias(hoje, 15), null),
  parc('o-4', '3/3', 'f-3', 5766.66, addDias(hoje, 45), null),
]

const nota = (id: string, o: string, numero: string, valor: number, dias: number): Nota => ({
  id,
  orcamento_id: o,
  numero,
  data_emissao: addDias(hoje, -dias),
  valor,
  arquivo_path: null,
  arquivo_nome: null,
  criado_por: 'p-fin',
  criado_em: agora,
})

const notas: Nota[] = [nota('n-1', 'o-3', '000451', 9800, 19), nota('n-2', 'o-2', '000460', 21400, 11)]

export function dadosDemo(): Dados {
  return { perfis: [...PERFIS_DEMO], formas, orcamentos, parcelas, notas }
}

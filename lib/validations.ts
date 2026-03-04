import { z } from 'zod'

export const registerSchema = z.object({
  empresa_nome: z.string().min(2, 'Nome da empresa obrigatório'),
  cnpj: z.string().optional(),
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
})

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export const motoristaSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().optional(),
  cnh_numero: z.string().optional(),
  cnh_categoria: z.string().optional(),
  cnh_validade: z.string().optional(),
  telefone: z.string().optional(),
  status: z.enum(['ativo', 'inativo', 'ferias', 'afastado']).default('ativo'),
})

export const veiculoSchema = z.object({
  placa: z.string().min(7, 'Placa inválida').max(8),
  tipo: z.enum(['caminhao_truck', 'carreta', 'van', 'utilitario', 'moto']),
  modelo: z.string().optional(),
  marca: z.string().optional(),
  ano: z.coerce.number().min(1950).max(new Date().getFullYear() + 1).optional(),
  km_atual: z.coerce.number().min(0).default(0),
  km_proxima_revisao: z.coerce.number().optional(),
  combustivel: z.enum(['diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'gnv', 'eletrico']).optional(),
  antt: z.string().optional(),
  antt_vencimento: z.string().optional(),
  seguro_apolice: z.string().optional(),
  seguro_vencimento: z.string().optional(),
  seguro_seguradora: z.string().optional(),
  crlv_vencimento: z.string().optional(),
})

export const viagemSchema = z.object({
  origem: z.string().min(2, 'Origem obrigatória'),
  destino: z.string().min(2, 'Destino obrigatório'),
  veiculo_id: z.string().uuid('Veículo obrigatório'),
  km_inicio: z.coerce.number().min(0).optional(),
  observacoes: z.string().optional(),
})

export const checkpointSchema = z.object({
  tipo: z.enum(['saida', 'carregamento', 'em_rota', 'parada_tecnica', 'entrega_realizada', 'ocorrencia', 'chegada']),
  descricao: z.string().optional(),
  km_atual: z.coerce.number().min(0).optional(),
})

export const gastoSchema = z.object({
  categoria: z.enum(['combustivel', 'pedagio', 'manutencao_rota', 'alimentacao', 'hospedagem', 'lavagem', 'multa', 'outros']),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  descricao: z.string().optional(),
  litros: z.coerce.number().positive().optional(),
  preco_litro: z.coerce.number().positive().optional(),
  posto_cidade: z.string().optional(),
  viagem_id: z.string().uuid().optional(),
})

export const receitaSchema = z.object({
  tipo: z.enum(['pagamento_entrega', 'coleta_valor', 'reembolso', 'outros']),
  valor: z.coerce.number().positive('Valor deve ser positivo'),
  descricao: z.string().optional(),
  forma_pagamento: z.enum(['dinheiro', 'pix', 'ted', 'cheque']).default('pix'),
  nome_pagador: z.string().optional(),
  viagem_id: z.string().uuid().optional(),
})

export const manutencaoSchema = z.object({
  veiculo_id: z.string().uuid('Veículo obrigatório'),
  tipo: z.enum(['preventiva', 'corretiva', 'emergencial']),
  descricao: z.string().min(5, 'Descrição obrigatória'),
  custo: z.coerce.number().min(0).default(0),
  km_na_manutencao: z.coerce.number().min(0).optional(),
  data: z.string(),
  oficina: z.string().optional(),
  status: z.enum(['agendada', 'em_andamento', 'concluida']).default('concluida'),
})

export const atribuicaoSchema = z.object({
  motorista_id: z.string().uuid(),
  veiculo_id: z.string().uuid(),
  data_inicio: z.string(),
  data_fim: z.string().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type MotoristaInput = z.infer<typeof motoristaSchema>
export type VeiculoInput = z.infer<typeof veiculoSchema>
export type ViagemInput = z.infer<typeof viagemSchema>
export type CheckpointInput = z.infer<typeof checkpointSchema>
export type GastoInput = z.infer<typeof gastoSchema>
export type ReceitaInput = z.infer<typeof receitaSchema>
export type ManutencaoInput = z.infer<typeof manutencaoSchema>
export type AtribuicaoInput = z.infer<typeof atribuicaoSchema>

export const PLANOS = {
  starter: {
    nome: 'Starter',
    preco: 149,
    motoristas: 5,
    veiculos: 8,
    retencao: '6 meses',
    descricao: 'Para pequenas transportadoras',
  },
  growth: {
    nome: 'Growth',
    preco: 349,
    motoristas: 20,
    veiculos: 30,
    retencao: '12 meses',
    descricao: 'Para frotas em crescimento',
  },
  pro: {
    nome: 'Pro',
    preco: 749,
    motoristas: 50,
    veiculos: Infinity,
    retencao: '24 meses',
    descricao: 'Para transportadoras consolidadas',
  },
} as const

export const CATEGORIAS_GASTO = [
  { value: 'combustivel', label: 'Combustível', icon: '⛽' },
  { value: 'pedagio', label: 'Pedágio', icon: '🛣️' },
  { value: 'manutencao_rota', label: 'Manutenção', icon: '🔧' },
  { value: 'alimentacao', label: 'Alimentação', icon: '🍽️' },
  { value: 'hospedagem', label: 'Hospedagem', icon: '🏨' },
  { value: 'lavagem', label: 'Lavagem', icon: '🚿' },
  { value: 'multa', label: 'Multa', icon: '📋' },
  { value: 'outros', label: 'Outros', icon: '📦' },
] as const

export const TIPOS_CHECKPOINT = [
  { value: 'saida', label: 'Saída', icon: '🚀' },
  { value: 'carregamento', label: 'Carregamento', icon: '📦' },
  { value: 'em_rota', label: 'Em Rota', icon: '🗺️' },
  { value: 'parada_tecnica', label: 'Parada Técnica', icon: '⛽' },
  { value: 'entrega_realizada', label: 'Entrega Realizada', icon: '✅' },
  { value: 'ocorrencia', label: 'Ocorrência', icon: '⚠️' },
  { value: 'chegada', label: 'Chegada', icon: '🏁' },
] as const

export const TIPOS_VEICULO = [
  { value: 'caminhao_truck', label: 'Caminhão Truck' },
  { value: 'carreta', label: 'Carreta' },
  { value: 'van', label: 'Van' },
  { value: 'utilitario', label: 'Utilitário' },
  { value: 'moto', label: 'Moto' },
] as const

export const COMBUSTIVEIS = [
  { value: 'diesel_s10', label: 'Diesel S10' },
  { value: 'diesel_s500', label: 'Diesel S500' },
  { value: 'gasolina', label: 'Gasolina' },
  { value: 'etanol', label: 'Etanol' },
  { value: 'gnv', label: 'GNV' },
  { value: 'eletrico', label: 'Elétrico' },
] as const

export const STATUS_VEICULO_LABELS: Record<string, string> = {
  disponivel: 'Disponível',
  em_rota: 'Em Rota',
  manutencao: 'Manutenção',
  inativo: 'Inativo',
}

export const STATUS_GASTO_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
}

export const TIPOS_RECEITA = [
  { value: 'pagamento_entrega', label: 'Pagamento na Entrega' },
  { value: 'coleta_valor', label: 'Coleta de Valor' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'outros', label: 'Outros' },
] as const

export const FORMAS_PAGAMENTO = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'pix', label: 'PIX' },
  { value: 'ted', label: 'TED' },
  { value: 'cheque', label: 'Cheque' },
] as const

export const TIPOS_MANUTENCAO = [
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'corretiva', label: 'Corretiva' },
  { value: 'emergencial', label: 'Emergencial' },
] as const

export const STATUS_MANUTENCAO_LABELS: Record<string, string> = {
  agendada: 'Agendada',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
}

export const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']

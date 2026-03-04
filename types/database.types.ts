export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          nome: string
          cnpj: string | null
          plano: 'starter' | 'growth' | 'pro'
          trial_expires_at: string
          ativo: boolean
          aprovacao_gastos: boolean
          limite_aprovacao: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          cnpj?: string | null
          plano?: 'starter' | 'growth' | 'pro'
          trial_expires_at?: string
          ativo?: boolean
          aprovacao_gastos?: boolean
          limite_aprovacao?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          cnpj?: string | null
          plano?: 'starter' | 'growth' | 'pro'
          trial_expires_at?: string
          ativo?: boolean
          aprovacao_gastos?: boolean
          limite_aprovacao?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          tenant_id: string
          nome: string
          email: string
          role: 'admin' | 'supervisor' | 'motorista'
          cpf: string | null
          cnh_numero: string | null
          cnh_categoria: string | null
          cnh_validade: string | null
          telefone: string | null
          foto_url: string | null
          status: 'ativo' | 'inativo' | 'ferias' | 'afastado'
          ativo: boolean
          km_revisao_alerta: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id: string
          nome: string
          email: string
          role?: 'admin' | 'supervisor' | 'motorista'
          cpf?: string | null
          cnh_numero?: string | null
          cnh_categoria?: string | null
          cnh_validade?: string | null
          telefone?: string | null
          foto_url?: string | null
          status?: 'ativo' | 'inativo' | 'ferias' | 'afastado'
          ativo?: boolean
          km_revisao_alerta?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          nome?: string
          email?: string
          role?: 'admin' | 'supervisor' | 'motorista'
          cpf?: string | null
          cnh_numero?: string | null
          cnh_categoria?: string | null
          cnh_validade?: string | null
          telefone?: string | null
          foto_url?: string | null
          status?: 'ativo' | 'inativo' | 'ferias' | 'afastado'
          ativo?: boolean
          km_revisao_alerta?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_tenant_id_fkey'
            columns: ['tenant_id']
            isOneToOne: false
            referencedRelation: 'tenants'
            referencedColumns: ['id']
          }
        ]
      }
      veiculos: {
        Row: {
          id: string
          tenant_id: string
          placa: string
          tipo: 'caminhao_truck' | 'carreta' | 'van' | 'utilitario' | 'moto'
          modelo: string | null
          marca: string | null
          ano: number | null
          km_atual: number
          km_proxima_revisao: number | null
          capacidade_carga: number | null
          combustivel: 'diesel_s10' | 'diesel_s500' | 'gasolina' | 'etanol' | 'gnv' | 'eletrico' | null
          antt: string | null
          antt_vencimento: string | null
          seguro_apolice: string | null
          seguro_vencimento: string | null
          seguro_seguradora: string | null
          crlv_vencimento: string | null
          status: 'disponivel' | 'em_rota' | 'manutencao' | 'inativo'
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          placa: string
          tipo?: 'caminhao_truck' | 'carreta' | 'van' | 'utilitario' | 'moto'
          modelo?: string | null
          marca?: string | null
          ano?: number | null
          km_atual?: number
          km_proxima_revisao?: number | null
          capacidade_carga?: number | null
          combustivel?: 'diesel_s10' | 'diesel_s500' | 'gasolina' | 'etanol' | 'gnv' | 'eletrico' | null
          antt?: string | null
          antt_vencimento?: string | null
          seguro_apolice?: string | null
          seguro_vencimento?: string | null
          seguro_seguradora?: string | null
          crlv_vencimento?: string | null
          status?: 'disponivel' | 'em_rota' | 'manutencao' | 'inativo'
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          placa?: string
          tipo?: 'caminhao_truck' | 'carreta' | 'van' | 'utilitario' | 'moto'
          modelo?: string | null
          marca?: string | null
          ano?: number | null
          km_atual?: number
          km_proxima_revisao?: number | null
          capacidade_carga?: number | null
          combustivel?: 'diesel_s10' | 'diesel_s500' | 'gasolina' | 'etanol' | 'gnv' | 'eletrico' | null
          antt?: string | null
          antt_vencimento?: string | null
          seguro_apolice?: string | null
          seguro_vencimento?: string | null
          seguro_seguradora?: string | null
          crlv_vencimento?: string | null
          status?: 'disponivel' | 'em_rota' | 'manutencao' | 'inativo'
          ativo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      motorista_veiculo: {
        Row: {
          id: string
          motorista_id: string
          veiculo_id: string
          data_inicio: string
          data_fim: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          motorista_id: string
          veiculo_id: string
          data_inicio?: string
          data_fim?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          motorista_id?: string
          veiculo_id?: string
          data_inicio?: string
          data_fim?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      viagens: {
        Row: {
          id: string
          tenant_id: string
          motorista_id: string
          veiculo_id: string
          origem: string
          destino: string
          status: 'ativa' | 'encerrada' | 'cancelada'
          km_inicio: number | null
          km_fim: number | null
          observacoes: string | null
          created_at: string
          encerrado_em: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          motorista_id: string
          veiculo_id: string
          origem: string
          destino: string
          status?: 'ativa' | 'encerrada' | 'cancelada'
          km_inicio?: number | null
          km_fim?: number | null
          observacoes?: string | null
          created_at?: string
          encerrado_em?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          motorista_id?: string
          veiculo_id?: string
          origem?: string
          destino?: string
          status?: 'ativa' | 'encerrada' | 'cancelada'
          km_inicio?: number | null
          km_fim?: number | null
          observacoes?: string | null
          created_at?: string
          encerrado_em?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checkpoints: {
        Row: {
          id: string
          viagem_id: string
          tipo: 'saida' | 'carregamento' | 'em_rota' | 'parada_tecnica' | 'entrega_realizada' | 'ocorrencia' | 'chegada'
          descricao: string | null
          km_atual: number | null
          foto_url: string | null
          latitude: number | null
          longitude: number | null
          created_at: string
        }
        Insert: {
          id?: string
          viagem_id: string
          tipo: 'saida' | 'carregamento' | 'em_rota' | 'parada_tecnica' | 'entrega_realizada' | 'ocorrencia' | 'chegada'
          descricao?: string | null
          km_atual?: number | null
          foto_url?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          viagem_id?: string
          tipo?: 'saida' | 'carregamento' | 'em_rota' | 'parada_tecnica' | 'entrega_realizada' | 'ocorrencia' | 'chegada'
          descricao?: string | null
          km_atual?: number | null
          foto_url?: string | null
          latitude?: number | null
          longitude?: number | null
          created_at?: string
        }
        Relationships: []
      }
      gastos: {
        Row: {
          id: string
          tenant_id: string
          viagem_id: string | null
          veiculo_id: string | null
          motorista_id: string
          categoria: 'combustivel' | 'pedagio' | 'manutencao_rota' | 'alimentacao' | 'hospedagem' | 'lavagem' | 'multa' | 'outros'
          valor: number
          descricao: string | null
          litros: number | null
          preco_litro: number | null
          posto_cidade: string | null
          comprovante_url: string | null
          status: 'pendente' | 'aprovado' | 'rejeitado'
          motivo_rejeicao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          viagem_id?: string | null
          veiculo_id?: string | null
          motorista_id: string
          categoria: 'combustivel' | 'pedagio' | 'manutencao_rota' | 'alimentacao' | 'hospedagem' | 'lavagem' | 'multa' | 'outros'
          valor: number
          descricao?: string | null
          litros?: number | null
          preco_litro?: number | null
          posto_cidade?: string | null
          comprovante_url?: string | null
          status?: 'pendente' | 'aprovado' | 'rejeitado'
          motivo_rejeicao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          viagem_id?: string | null
          veiculo_id?: string | null
          motorista_id?: string
          categoria?: 'combustivel' | 'pedagio' | 'manutencao_rota' | 'alimentacao' | 'hospedagem' | 'lavagem' | 'multa' | 'outros'
          valor?: number
          descricao?: string | null
          litros?: number | null
          preco_litro?: number | null
          posto_cidade?: string | null
          comprovante_url?: string | null
          status?: 'pendente' | 'aprovado' | 'rejeitado'
          motivo_rejeicao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      receitas: {
        Row: {
          id: string
          tenant_id: string
          viagem_id: string | null
          tipo: 'pagamento_entrega' | 'coleta_valor' | 'reembolso' | 'outros'
          valor: number
          descricao: string | null
          forma_pagamento: 'dinheiro' | 'pix' | 'ted' | 'cheque' | null
          nome_pagador: string | null
          comprovante_url: string | null
          registrado_por: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          viagem_id?: string | null
          tipo?: 'pagamento_entrega' | 'coleta_valor' | 'reembolso' | 'outros'
          valor: number
          descricao?: string | null
          forma_pagamento?: 'dinheiro' | 'pix' | 'ted' | 'cheque' | null
          nome_pagador?: string | null
          comprovante_url?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          viagem_id?: string | null
          tipo?: 'pagamento_entrega' | 'coleta_valor' | 'reembolso' | 'outros'
          valor?: number
          descricao?: string | null
          forma_pagamento?: 'dinheiro' | 'pix' | 'ted' | 'cheque' | null
          nome_pagador?: string | null
          comprovante_url?: string | null
          registrado_por?: string | null
          created_at?: string
        }
        Relationships: []
      }
      manutencoes: {
        Row: {
          id: string
          tenant_id: string
          veiculo_id: string
          motorista_id: string | null
          tipo: 'preventiva' | 'corretiva' | 'emergencial'
          descricao: string
          custo: number
          km_na_manutencao: number | null
          data: string
          oficina: string | null
          cnpj_oficina: string | null
          nota_url: string | null
          status: 'agendada' | 'em_andamento' | 'concluida'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          veiculo_id: string
          motorista_id?: string | null
          tipo?: 'preventiva' | 'corretiva' | 'emergencial'
          descricao: string
          custo?: number
          km_na_manutencao?: number | null
          data?: string
          oficina?: string | null
          cnpj_oficina?: string | null
          nota_url?: string | null
          status?: 'agendada' | 'em_andamento' | 'concluida'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          veiculo_id?: string
          motorista_id?: string | null
          tipo?: 'preventiva' | 'corretiva' | 'emergencial'
          descricao?: string
          custo?: number
          km_na_manutencao?: number | null
          data?: string
          oficina?: string | null
          cnpj_oficina?: string | null
          nota_url?: string | null
          status?: 'agendada' | 'em_andamento' | 'concluida'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          id: string
          tenant_id: string
          user_id: string | null
          tipo: string
          titulo: string
          mensagem: string
          lida: boolean
          link: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id?: string | null
          tipo: string
          titulo: string
          mensagem: string
          lida?: boolean
          link?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string | null
          tipo?: string
          titulo?: string
          mensagem?: string
          lida?: boolean
          link?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      criar_tenant_e_admin: {
        Args: {
          p_tenant_nome: string
          p_tenant_cnpj: string
          p_user_id: string
          p_user_nome: string
          p_user_email: string
        }
        Returns: string
      }
      adicionar_motorista: {
        Args: {
          p_user_id: string
          p_tenant_id: string
          p_nome: string
          p_email: string
        }
        Returns: undefined
      }
      calcular_dre: {
        Args: { p_tenant_id: string; p_inicio: string; p_fim: string }
        Returns: {
          receita_fretes: number
          outras_receitas: number
          receita_total: number
          custo_combustivel: number
          custo_pedagio: number
          custo_manutencao: number
          custo_alimentacao: number
          custo_hospedagem: number
          outros_custos: number
          total_despesas: number
          resultado_operacional: number
        }[]
      }
      dashboard_kpis: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      gastos_por_categoria: {
        Args: { p_tenant_id: string; p_meses?: number }
        Returns: { categoria: string; total: number }[]
      }
      historico_financeiro: {
        Args: { p_tenant_id: string }
        Returns: { mes: string; receitas: number; despesas: number }[]
      }
      verificar_limite_plano: {
        Args: { p_tenant_id: string }
        Returns: Json
      }
      get_tenant_id: { Args: Record<PropertyKey, never>; Returns: string }
      get_user_role: { Args: Record<PropertyKey, never>; Returns: string }
      is_admin_or_supervisor: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: {
      plano_tipo: 'starter' | 'growth' | 'pro'
      user_role: 'admin' | 'supervisor' | 'motorista'
      user_status: 'ativo' | 'inativo' | 'ferias' | 'afastado'
      veiculo_tipo: 'caminhao_truck' | 'carreta' | 'van' | 'utilitario' | 'moto'
      veiculo_status: 'disponivel' | 'em_rota' | 'manutencao' | 'inativo'
      viagem_status: 'ativa' | 'encerrada' | 'cancelada'
      checkpoint_tipo: 'saida' | 'carregamento' | 'em_rota' | 'parada_tecnica' | 'entrega_realizada' | 'ocorrencia' | 'chegada'
      gasto_categoria: 'combustivel' | 'pedagio' | 'manutencao_rota' | 'alimentacao' | 'hospedagem' | 'lavagem' | 'multa' | 'outros'
      gasto_status: 'pendente' | 'aprovado' | 'rejeitado'
      manutencao_tipo: 'preventiva' | 'corretiva' | 'emergencial'
      manutencao_status: 'agendada' | 'em_andamento' | 'concluida'
    }
    CompositeTypes: Record<never, never>
  }
}

// Convenience type helpers
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

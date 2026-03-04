-- ============================================================
-- FreteLog — Schema Inicial
-- Migration: 20260301000001_initial_schema
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE plano_tipo AS ENUM ('starter', 'growth', 'pro');
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'motorista');
CREATE TYPE user_status AS ENUM ('ativo', 'inativo', 'ferias', 'afastado');
CREATE TYPE veiculo_tipo AS ENUM ('caminhao_truck', 'carreta', 'van', 'utilitario', 'moto');
CREATE TYPE veiculo_status AS ENUM ('disponivel', 'em_rota', 'manutencao', 'inativo');
CREATE TYPE combustivel_tipo AS ENUM ('diesel_s10', 'diesel_s500', 'gasolina', 'etanol', 'gnv', 'eletrico');
CREATE TYPE viagem_status AS ENUM ('ativa', 'encerrada', 'cancelada');
CREATE TYPE checkpoint_tipo AS ENUM ('saida', 'carregamento', 'em_rota', 'parada_tecnica', 'entrega_realizada', 'ocorrencia', 'chegada');
CREATE TYPE gasto_categoria AS ENUM ('combustivel', 'pedagio', 'manutencao_rota', 'alimentacao', 'hospedagem', 'lavagem', 'multa', 'outros');
CREATE TYPE gasto_status AS ENUM ('pendente', 'aprovado', 'rejeitado');
CREATE TYPE receita_tipo AS ENUM ('pagamento_entrega', 'coleta_valor', 'reembolso', 'outros');
CREATE TYPE forma_pagamento AS ENUM ('dinheiro', 'pix', 'ted', 'cheque');
CREATE TYPE manutencao_tipo AS ENUM ('preventiva', 'corretiva', 'emergencial');
CREATE TYPE manutencao_status AS ENUM ('agendada', 'em_andamento', 'concluida');
CREATE TYPE notificacao_tipo AS ENUM (
  'gasto_aguarda_aprovacao', 'gasto_aprovado', 'gasto_rejeitado',
  'manutencao_emergencial', 'vencimento_crlv', 'vencimento_seguro',
  'vencimento_antt', 'vencimento_cnh', 'km_revisao_atingido',
  'motorista_atribuido', 'viagem_iniciada', 'viagem_encerrada',
  'trial_expirando'
);

-- ============================================================
-- TABELA: tenants
-- ============================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpj TEXT UNIQUE,
  plano plano_tipo NOT NULL DEFAULT 'starter',
  trial_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  aprovacao_gastos BOOLEAN NOT NULL DEFAULT FALSE,
  limite_aprovacao NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABELA: users (perfil estendido — complementa auth.users)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'motorista',
  cpf TEXT,
  cnh_numero TEXT,
  cnh_categoria TEXT,
  cnh_validade DATE,
  telefone TEXT,
  foto_url TEXT,
  status user_status NOT NULL DEFAULT 'ativo',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  km_revisao_alerta INTEGER DEFAULT 10000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- TABELA: veiculos
-- ============================================================
CREATE TABLE veiculos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  tipo veiculo_tipo NOT NULL DEFAULT 'caminhao_truck',
  modelo TEXT,
  marca TEXT,
  ano INTEGER,
  km_atual INTEGER DEFAULT 0,
  km_proxima_revisao INTEGER,
  capacidade_carga NUMERIC(8, 2),
  combustivel combustivel_tipo DEFAULT 'diesel_s10',
  antt TEXT,
  antt_vencimento DATE,
  seguro_apolice TEXT,
  seguro_vencimento DATE,
  seguro_seguradora TEXT,
  crlv_vencimento DATE,
  status veiculo_status NOT NULL DEFAULT 'disponivel',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, placa)
);

CREATE INDEX idx_veiculos_tenant_id ON veiculos(tenant_id);
CREATE INDEX idx_veiculos_status ON veiculos(status);

-- ============================================================
-- TABELA: motorista_veiculo (atribuição)
-- ============================================================
CREATE TABLE motorista_veiculo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  motorista_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_motorista_veiculo_motorista ON motorista_veiculo(motorista_id);
CREATE INDEX idx_motorista_veiculo_veiculo ON motorista_veiculo(veiculo_id);

-- ============================================================
-- TABELA: viagens
-- ============================================================
CREATE TABLE viagens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  motorista_id UUID NOT NULL REFERENCES users(id),
  veiculo_id UUID NOT NULL REFERENCES veiculos(id),
  origem TEXT NOT NULL,
  destino TEXT NOT NULL,
  status viagem_status NOT NULL DEFAULT 'ativa',
  km_inicio INTEGER,
  km_fim INTEGER,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  encerrado_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_viagens_tenant_id ON viagens(tenant_id);
CREATE INDEX idx_viagens_motorista_id ON viagens(motorista_id);
CREATE INDEX idx_viagens_status ON viagens(status);

-- ============================================================
-- TABELA: checkpoints
-- ============================================================
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viagem_id UUID NOT NULL REFERENCES viagens(id) ON DELETE CASCADE,
  tipo checkpoint_tipo NOT NULL,
  descricao TEXT,
  km_atual INTEGER,
  foto_url TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkpoints_viagem_id ON checkpoints(viagem_id);

-- ============================================================
-- TABELA: gastos
-- ============================================================
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  viagem_id UUID REFERENCES viagens(id),
  veiculo_id UUID REFERENCES veiculos(id),
  motorista_id UUID NOT NULL REFERENCES users(id),
  categoria gasto_categoria NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  descricao TEXT,
  litros NUMERIC(8, 3),
  preco_litro NUMERIC(6, 3),
  posto_cidade TEXT,
  comprovante_url TEXT,
  status gasto_status NOT NULL DEFAULT 'aprovado',
  motivo_rejeicao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gastos_tenant_id ON gastos(tenant_id);
CREATE INDEX idx_gastos_motorista_id ON gastos(motorista_id);
CREATE INDEX idx_gastos_viagem_id ON gastos(viagem_id);
CREATE INDEX idx_gastos_created_at ON gastos(created_at);

-- ============================================================
-- TABELA: receitas
-- ============================================================
CREATE TABLE receitas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  viagem_id UUID REFERENCES viagens(id),
  tipo receita_tipo NOT NULL DEFAULT 'outros',
  valor NUMERIC(10, 2) NOT NULL,
  descricao TEXT,
  forma_pagamento forma_pagamento DEFAULT 'pix',
  nome_pagador TEXT,
  comprovante_url TEXT,
  registrado_por UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_receitas_tenant_id ON receitas(tenant_id);
CREATE INDEX idx_receitas_created_at ON receitas(created_at);

-- ============================================================
-- TABELA: manutencoes
-- ============================================================
CREATE TABLE manutencoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES veiculos(id),
  motorista_id UUID REFERENCES users(id),
  tipo manutencao_tipo NOT NULL DEFAULT 'corretiva',
  descricao TEXT NOT NULL,
  custo NUMERIC(10, 2) DEFAULT 0,
  km_na_manutencao INTEGER,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  oficina TEXT,
  cnpj_oficina TEXT,
  nota_url TEXT,
  status manutencao_status NOT NULL DEFAULT 'concluida',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_manutencoes_tenant_id ON manutencoes(tenant_id);
CREATE INDEX idx_manutencoes_veiculo_id ON manutencoes(veiculo_id);

-- ============================================================
-- TABELA: notificacoes
-- ============================================================
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tipo notificacao_tipo NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_tenant_id ON notificacoes(tenant_id);
CREATE INDEX idx_notificacoes_user_id ON notificacoes(user_id);
CREATE INDEX idx_notificacoes_lida ON notificacoes(lida);

-- ============================================================
-- TRIGGERS: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER veiculos_updated_at BEFORE UPDATE ON veiculos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER viagens_updated_at BEFORE UPDATE ON viagens FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER gastos_updated_at BEFORE UPDATE ON gastos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER manutencoes_updated_at BEFORE UPDATE ON manutencoes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

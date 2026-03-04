-- ============================================================
-- FreteLog — Row Level Security Policies
-- Migration: 20260301000002_rls_policies
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE motorista_veiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Retorna o tenant_id do usuário autenticado
CREATE OR REPLACE FUNCTION get_tenant_id()
RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Retorna o role do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() ->> 'role';
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Verifica se o usuário é admin ou supervisor
CREATE OR REPLACE FUNCTION is_admin_or_supervisor()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('admin', 'supervisor');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- TENANTS — policies
-- ============================================================
CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT USING (id = get_tenant_id());

CREATE POLICY "tenants_update_admin" ON tenants
  FOR UPDATE USING (id = get_tenant_id() AND get_user_role() = 'admin');

-- ============================================================
-- USERS — policies
-- ============================================================
CREATE POLICY "users_select_tenant" ON users
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (
    tenant_id = get_tenant_id() AND get_user_role() = 'admin'
  );

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (tenant_id = get_tenant_id() AND get_user_role() = 'admin');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE USING (tenant_id = get_tenant_id() AND get_user_role() = 'admin');

-- ============================================================
-- VEICULOS — policies
-- ============================================================
CREATE POLICY "veiculos_select_tenant" ON veiculos
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "veiculos_insert_admin" ON veiculos
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id() AND is_admin_or_supervisor());

CREATE POLICY "veiculos_update_admin" ON veiculos
  FOR UPDATE USING (tenant_id = get_tenant_id() AND is_admin_or_supervisor());

CREATE POLICY "veiculos_delete_admin" ON veiculos
  FOR DELETE USING (tenant_id = get_tenant_id() AND get_user_role() = 'admin');

-- ============================================================
-- MOTORISTA_VEICULO — policies
-- ============================================================
CREATE POLICY "mv_select_tenant" ON motorista_veiculo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u WHERE u.id = motorista_id AND u.tenant_id = get_tenant_id()
    )
  );

CREATE POLICY "mv_insert_admin" ON motorista_veiculo
  FOR INSERT WITH CHECK (is_admin_or_supervisor());

CREATE POLICY "mv_update_admin" ON motorista_veiculo
  FOR UPDATE USING (is_admin_or_supervisor());

-- ============================================================
-- VIAGENS — policies
-- ============================================================
CREATE POLICY "viagens_select_tenant" ON viagens
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "viagens_insert_motorista" ON viagens
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "viagens_update_own" ON viagens
  FOR UPDATE USING (
    tenant_id = get_tenant_id() AND (
      is_admin_or_supervisor() OR motorista_id = auth.uid()
    )
  );

-- ============================================================
-- CHECKPOINTS — policies (via viagem)
-- ============================================================
CREATE POLICY "checkpoints_select" ON checkpoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM viagens v
      WHERE v.id = viagem_id AND v.tenant_id = get_tenant_id()
    )
  );

CREATE POLICY "checkpoints_insert" ON checkpoints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM viagens v
      WHERE v.id = viagem_id AND v.tenant_id = get_tenant_id()
    )
  );

-- ============================================================
-- GASTOS — policies
-- ============================================================
CREATE POLICY "gastos_select_admin" ON gastos
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "gastos_insert_motorista" ON gastos
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "gastos_update_admin" ON gastos
  FOR UPDATE USING (
    tenant_id = get_tenant_id() AND (
      is_admin_or_supervisor() OR (motorista_id = auth.uid() AND status = 'pendente')
    )
  );

CREATE POLICY "gastos_delete_admin" ON gastos
  FOR DELETE USING (tenant_id = get_tenant_id() AND get_user_role() = 'admin');

-- ============================================================
-- RECEITAS — policies
-- ============================================================
CREATE POLICY "receitas_select_tenant" ON receitas
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "receitas_insert_tenant" ON receitas
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "receitas_update_admin" ON receitas
  FOR UPDATE USING (tenant_id = get_tenant_id() AND is_admin_or_supervisor());

CREATE POLICY "receitas_delete_admin" ON receitas
  FOR DELETE USING (tenant_id = get_tenant_id() AND get_user_role() = 'admin');

-- ============================================================
-- MANUTENCOES — policies
-- ============================================================
CREATE POLICY "manutencoes_select_tenant" ON manutencoes
  FOR SELECT USING (tenant_id = get_tenant_id());

CREATE POLICY "manutencoes_insert_tenant" ON manutencoes
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

CREATE POLICY "manutencoes_update_admin" ON manutencoes
  FOR UPDATE USING (tenant_id = get_tenant_id() AND is_admin_or_supervisor());

CREATE POLICY "manutencoes_delete_admin" ON manutencoes
  FOR DELETE USING (tenant_id = get_tenant_id() AND get_user_role() = 'admin');

-- ============================================================
-- NOTIFICACOES — policies
-- ============================================================
CREATE POLICY "notificacoes_select_own" ON notificacoes
  FOR SELECT USING (
    tenant_id = get_tenant_id() AND (user_id = auth.uid() OR is_admin_or_supervisor())
  );

CREATE POLICY "notificacoes_update_own" ON notificacoes
  FOR UPDATE USING (tenant_id = get_tenant_id() AND user_id = auth.uid());

CREATE POLICY "notificacoes_insert_service" ON notificacoes
  FOR INSERT WITH CHECK (tenant_id = get_tenant_id());

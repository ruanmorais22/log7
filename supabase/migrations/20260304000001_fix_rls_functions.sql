-- ============================================================
-- FreteLog — Fix RLS: substituir JWT claims por DB lookup
-- Migration: 20260304000001_fix_rls_functions
--
-- PROBLEMA: get_tenant_id() lê tenant_id de auth.jwt() ->> 'tenant_id'
-- mas o Supabase não inclui tenant_id no JWT por padrão.
-- Resultado: get_tenant_id() sempre retorna NULL → RLS bloqueia tudo.
--
-- SOLUÇÃO: get_my_tenant_id() lê tenant_id da tabela users via auth.uid().
-- SECURITY DEFINER permite bypassar RLS ao fazer a leitura (sem recursão).
-- ============================================================

-- Funções corrigidas (DB lookup, não JWT claims)

CREATE OR REPLACE FUNCTION get_my_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin_or_supervisor()
RETURNS BOOLEAN AS $$
  SELECT get_my_role() IN ('admin', 'supervisor');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- Drop todas as políticas antigas (que usavam get_tenant_id)
-- ============================================================

DROP POLICY IF EXISTS "tenants_select_own" ON tenants;
DROP POLICY IF EXISTS "tenants_update_admin" ON tenants;

DROP POLICY IF EXISTS "users_select_tenant" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

DROP POLICY IF EXISTS "veiculos_select_tenant" ON veiculos;
DROP POLICY IF EXISTS "veiculos_insert_admin" ON veiculos;
DROP POLICY IF EXISTS "veiculos_update_admin" ON veiculos;
DROP POLICY IF EXISTS "veiculos_delete_admin" ON veiculos;

DROP POLICY IF EXISTS "mv_select_tenant" ON motorista_veiculo;
DROP POLICY IF EXISTS "mv_insert_admin" ON motorista_veiculo;
DROP POLICY IF EXISTS "mv_update_admin" ON motorista_veiculo;

DROP POLICY IF EXISTS "viagens_select_tenant" ON viagens;
DROP POLICY IF EXISTS "viagens_insert_motorista" ON viagens;
DROP POLICY IF EXISTS "viagens_update_own" ON viagens;

DROP POLICY IF EXISTS "checkpoints_select" ON checkpoints;
DROP POLICY IF EXISTS "checkpoints_insert" ON checkpoints;

DROP POLICY IF EXISTS "gastos_select_admin" ON gastos;
DROP POLICY IF EXISTS "gastos_insert_motorista" ON gastos;
DROP POLICY IF EXISTS "gastos_update_admin" ON gastos;
DROP POLICY IF EXISTS "gastos_delete_admin" ON gastos;

DROP POLICY IF EXISTS "receitas_select_tenant" ON receitas;
DROP POLICY IF EXISTS "receitas_insert_tenant" ON receitas;
DROP POLICY IF EXISTS "receitas_update_admin" ON receitas;
DROP POLICY IF EXISTS "receitas_delete_admin" ON receitas;

DROP POLICY IF EXISTS "manutencoes_select_tenant" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_insert_tenant" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_update_admin" ON manutencoes;
DROP POLICY IF EXISTS "manutencoes_delete_admin" ON manutencoes;

DROP POLICY IF EXISTS "notificacoes_select_own" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_update_own" ON notificacoes;
DROP POLICY IF EXISTS "notificacoes_insert_service" ON notificacoes;

-- ============================================================
-- TENANTS
-- ============================================================

CREATE POLICY "tenants_select_own" ON tenants
  FOR SELECT USING (id = get_my_tenant_id());

CREATE POLICY "tenants_update_admin" ON tenants
  FOR UPDATE USING (id = get_my_tenant_id() AND get_my_role() = 'admin');

-- ============================================================
-- USERS
-- ============================================================

-- Usuário pode ver todos do mesmo tenant (incluindo a si mesmo)
-- OR id = auth.uid() garante que o próprio registro é sempre visível
CREATE POLICY "users_select_tenant" ON users
  FOR SELECT USING (tenant_id = get_my_tenant_id() OR id = auth.uid());

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (
    tenant_id = get_my_tenant_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'admin');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'admin');

-- ============================================================
-- VEICULOS
-- ============================================================

CREATE POLICY "veiculos_select_tenant" ON veiculos
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "veiculos_insert_admin" ON veiculos
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id() AND is_admin_or_supervisor());

CREATE POLICY "veiculos_update_admin" ON veiculos
  FOR UPDATE USING (tenant_id = get_my_tenant_id() AND is_admin_or_supervisor());

CREATE POLICY "veiculos_delete_admin" ON veiculos
  FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'admin');

-- ============================================================
-- MOTORISTA_VEICULO
-- ============================================================

CREATE POLICY "mv_select_tenant" ON motorista_veiculo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = motorista_id AND u.tenant_id = get_my_tenant_id()
    )
  );

CREATE POLICY "mv_insert_admin" ON motorista_veiculo
  FOR INSERT WITH CHECK (is_admin_or_supervisor());

CREATE POLICY "mv_update_admin" ON motorista_veiculo
  FOR UPDATE USING (is_admin_or_supervisor());

-- ============================================================
-- VIAGENS
-- ============================================================

CREATE POLICY "viagens_select_tenant" ON viagens
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "viagens_insert_motorista" ON viagens
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "viagens_update_own" ON viagens
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id() AND (
      is_admin_or_supervisor() OR motorista_id = auth.uid()
    )
  );

-- ============================================================
-- CHECKPOINTS (via viagem)
-- ============================================================

CREATE POLICY "checkpoints_select" ON checkpoints
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM viagens v
      WHERE v.id = viagem_id AND v.tenant_id = get_my_tenant_id()
    )
  );

CREATE POLICY "checkpoints_insert" ON checkpoints
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM viagens v
      WHERE v.id = viagem_id AND v.tenant_id = get_my_tenant_id()
    )
  );

-- ============================================================
-- GASTOS
-- ============================================================

CREATE POLICY "gastos_select_admin" ON gastos
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "gastos_insert_motorista" ON gastos
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "gastos_update_admin" ON gastos
  FOR UPDATE USING (
    tenant_id = get_my_tenant_id() AND (
      is_admin_or_supervisor() OR (motorista_id = auth.uid() AND status = 'pendente')
    )
  );

CREATE POLICY "gastos_delete_admin" ON gastos
  FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'admin');

-- ============================================================
-- RECEITAS
-- ============================================================

CREATE POLICY "receitas_select_tenant" ON receitas
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "receitas_insert_tenant" ON receitas
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "receitas_update_admin" ON receitas
  FOR UPDATE USING (tenant_id = get_my_tenant_id() AND is_admin_or_supervisor());

CREATE POLICY "receitas_delete_admin" ON receitas
  FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'admin');

-- ============================================================
-- MANUTENCOES
-- ============================================================

CREATE POLICY "manutencoes_select_tenant" ON manutencoes
  FOR SELECT USING (tenant_id = get_my_tenant_id());

CREATE POLICY "manutencoes_insert_tenant" ON manutencoes
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

CREATE POLICY "manutencoes_update_admin" ON manutencoes
  FOR UPDATE USING (tenant_id = get_my_tenant_id() AND is_admin_or_supervisor());

CREATE POLICY "manutencoes_delete_admin" ON manutencoes
  FOR DELETE USING (tenant_id = get_my_tenant_id() AND get_my_role() = 'admin');

-- ============================================================
-- NOTIFICACOES
-- ============================================================

CREATE POLICY "notificacoes_select_own" ON notificacoes
  FOR SELECT USING (
    tenant_id = get_my_tenant_id() AND (user_id = auth.uid() OR is_admin_or_supervisor())
  );

CREATE POLICY "notificacoes_update_own" ON notificacoes
  FOR UPDATE USING (tenant_id = get_my_tenant_id() AND user_id = auth.uid());

CREATE POLICY "notificacoes_insert_service" ON notificacoes
  FOR INSERT WITH CHECK (tenant_id = get_my_tenant_id());

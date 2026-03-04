-- Migration: Adiciona role super_admin (dono do SaaS)
-- O super_admin pode ver todos os tenants, gerenciar planos e acessar qualquer dado.

-- 1. Tornar tenant_id nullable em users (super_admin não pertence a nenhum tenant)
ALTER TABLE public.users ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. Adicionar super_admin ao enum de roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';

-- 2. Atualizar RLS: super_admin pode ver TUDO em todas as tabelas
-- (usar service_role no painel ou política específica)

-- Políticas: super_admin bypassa o filtro de tenant em todas as tabelas
-- Usa get_my_role() SECURITY DEFINER para evitar recursão infinita na tabela users
CREATE POLICY "super_admin_all_users" ON users
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "super_admin_all_tenants" ON tenants
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "super_admin_all_veiculos" ON veiculos
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "super_admin_all_viagens" ON viagens
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "super_admin_all_gastos" ON gastos
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "super_admin_all_receitas" ON receitas
  FOR ALL USING (get_my_role() = 'super_admin');

CREATE POLICY "super_admin_all_manutencoes" ON manutencoes
  FOR ALL USING (get_my_role() = 'super_admin');

-- 3. Função para criar o super_admin
-- Execute manualmente após aplicar esta migration:
--
-- INSERT INTO public.users (id, tenant_id, nome, email, role, ativo)
-- VALUES (
--   '<UUID do auth.users criado via Supabase Auth>',
--   NULL,               -- super_admin não tem tenant
--   'Ruan Morais',
--   'seu@email.com',
--   'super_admin',
--   true
-- );
--
-- E no auth.users, defina:
--   raw_app_meta_data = '{"role": "super_admin"}'

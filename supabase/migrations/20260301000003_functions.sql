-- ============================================================
-- FreteLog — Functions, Views e Hooks
-- Migration: 20260301000003_functions
-- ============================================================

-- ============================================================
-- FUNCTION: Criar tenant + admin (onboarding)
-- Chamada via service role no registro
-- ============================================================
CREATE OR REPLACE FUNCTION criar_tenant_e_admin(
  p_tenant_nome TEXT,
  p_tenant_cnpj TEXT,
  p_user_id UUID,
  p_user_nome TEXT,
  p_user_email TEXT
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Cria o tenant
  INSERT INTO tenants (nome, cnpj)
  VALUES (p_tenant_nome, p_tenant_cnpj)
  RETURNING id INTO v_tenant_id;

  -- Cria o perfil do admin
  INSERT INTO users (id, tenant_id, nome, email, role)
  VALUES (p_user_id, v_tenant_id, p_user_nome, p_user_email, 'admin');

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: Adicionar motorista ao tenant
-- ============================================================
CREATE OR REPLACE FUNCTION adicionar_motorista(
  p_user_id UUID,
  p_tenant_id UUID,
  p_nome TEXT,
  p_email TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO users (id, tenant_id, nome, email, role)
  VALUES (p_user_id, p_tenant_id, p_nome, p_email, 'motorista')
  ON CONFLICT (id) DO UPDATE
    SET tenant_id = p_tenant_id, nome = p_nome, role = 'motorista';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: DRE por período
-- ============================================================
CREATE OR REPLACE FUNCTION calcular_dre(
  p_tenant_id UUID,
  p_inicio DATE,
  p_fim DATE
)
RETURNS TABLE (
  receita_fretes NUMERIC,
  outras_receitas NUMERIC,
  receita_total NUMERIC,
  custo_combustivel NUMERIC,
  custo_pedagio NUMERIC,
  custo_manutencao NUMERIC,
  custo_alimentacao NUMERIC,
  custo_hospedagem NUMERIC,
  outros_custos NUMERIC,
  total_despesas NUMERIC,
  resultado_operacional NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH
    rec AS (
      SELECT
        COALESCE(SUM(CASE WHEN tipo IN ('pagamento_entrega', 'coleta_valor') THEN valor ELSE 0 END), 0) AS fretes,
        COALESCE(SUM(CASE WHEN tipo IN ('reembolso', 'outros') THEN valor ELSE 0 END), 0) AS outras
      FROM receitas
      WHERE tenant_id = p_tenant_id
        AND created_at::DATE BETWEEN p_inicio AND p_fim
    ),
    gas AS (
      SELECT
        COALESCE(SUM(CASE WHEN categoria = 'combustivel' THEN valor ELSE 0 END), 0) AS combustivel,
        COALESCE(SUM(CASE WHEN categoria = 'pedagio' THEN valor ELSE 0 END), 0) AS pedagio,
        COALESCE(SUM(CASE WHEN categoria = 'manutencao_rota' THEN valor ELSE 0 END), 0) AS manutencao_rota,
        COALESCE(SUM(CASE WHEN categoria = 'alimentacao' THEN valor ELSE 0 END), 0) AS alimentacao,
        COALESCE(SUM(CASE WHEN categoria = 'hospedagem' THEN valor ELSE 0 END), 0) AS hospedagem,
        COALESCE(SUM(CASE WHEN categoria IN ('lavagem', 'multa', 'outros') THEN valor ELSE 0 END), 0) AS outros
      FROM gastos
      WHERE tenant_id = p_tenant_id
        AND status = 'aprovado'
        AND created_at::DATE BETWEEN p_inicio AND p_fim
    ),
    man AS (
      SELECT COALESCE(SUM(custo), 0) AS total
      FROM manutencoes
      WHERE tenant_id = p_tenant_id
        AND data BETWEEN p_inicio AND p_fim
        AND status = 'concluida'
    )
  SELECT
    rec.fretes,
    rec.outras,
    rec.fretes + rec.outras,
    gas.combustivel,
    gas.pedagio,
    gas.manutencao_rota + man.total,
    gas.alimentacao,
    gas.hospedagem,
    gas.outros,
    gas.combustivel + gas.pedagio + gas.manutencao_rota + man.total + gas.alimentacao + gas.hospedagem + gas.outros,
    (rec.fretes + rec.outras) - (gas.combustivel + gas.pedagio + gas.manutencao_rota + man.total + gas.alimentacao + gas.hospedagem + gas.outros)
  FROM rec, gas, man;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCTION: KPIs do dashboard
-- ============================================================
CREATE OR REPLACE FUNCTION dashboard_kpis(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_inicio_mes DATE := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_fim_mes DATE := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  v_inicio_mes_ant DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_fim_mes_ant DATE := (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
BEGIN
  SELECT json_build_object(
    'motoristas_em_rota', (
      SELECT COUNT(DISTINCT motorista_id) FROM viagens
      WHERE tenant_id = p_tenant_id AND status = 'ativa'
    ),
    'veiculos_em_uso', (
      SELECT COUNT(*) FROM veiculos
      WHERE tenant_id = p_tenant_id AND status = 'em_rota'
    ),
    'veiculos_disponiveis', (
      SELECT COUNT(*) FROM veiculos
      WHERE tenant_id = p_tenant_id AND status = 'disponivel'
    ),
    'veiculos_manutencao', (
      SELECT COUNT(*) FROM veiculos
      WHERE tenant_id = p_tenant_id AND status = 'manutencao'
    ),
    'gastos_hoje', (
      SELECT COALESCE(SUM(valor), 0) FROM gastos
      WHERE tenant_id = p_tenant_id AND status = 'aprovado'
        AND created_at::DATE = CURRENT_DATE
    ),
    'gastos_semana', (
      SELECT COALESCE(SUM(valor), 0) FROM gastos
      WHERE tenant_id = p_tenant_id AND status = 'aprovado'
        AND created_at::DATE >= CURRENT_DATE - INTERVAL '7 days'
    ),
    'gastos_mes', (
      SELECT COALESCE(SUM(valor), 0) FROM gastos
      WHERE tenant_id = p_tenant_id AND status = 'aprovado'
        AND created_at::DATE BETWEEN v_inicio_mes AND v_fim_mes
    ),
    'receitas_mes', (
      SELECT COALESCE(SUM(valor), 0) FROM receitas
      WHERE tenant_id = p_tenant_id
        AND created_at::DATE BETWEEN v_inicio_mes AND v_fim_mes
    ),
    'receitas_mes_anterior', (
      SELECT COALESCE(SUM(valor), 0) FROM receitas
      WHERE tenant_id = p_tenant_id
        AND created_at::DATE BETWEEN v_inicio_mes_ant AND v_fim_mes_ant
    ),
    'gastos_pendentes_aprovacao', (
      SELECT COUNT(*) FROM gastos
      WHERE tenant_id = p_tenant_id AND status = 'pendente'
    ),
    'total_motoristas', (
      SELECT COUNT(*) FROM users
      WHERE tenant_id = p_tenant_id AND role = 'motorista' AND ativo = TRUE
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCTION: Gastos por categoria (últimos N meses)
-- ============================================================
CREATE OR REPLACE FUNCTION gastos_por_categoria(p_tenant_id UUID, p_meses INTEGER DEFAULT 1)
RETURNS TABLE (categoria TEXT, total NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT g.categoria::TEXT, COALESCE(SUM(g.valor), 0) AS total
  FROM gastos g
  WHERE g.tenant_id = p_tenant_id
    AND g.status = 'aprovado'
    AND g.created_at >= NOW() - (p_meses || ' months')::INTERVAL
  GROUP BY g.categoria
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCTION: Receitas e Despesas mensais (últimos 6 meses)
-- ============================================================
CREATE OR REPLACE FUNCTION historico_financeiro(p_tenant_id UUID)
RETURNS TABLE (mes TEXT, receitas NUMERIC, despesas NUMERIC) AS $$
BEGIN
  RETURN QUERY
  WITH meses AS (
    SELECT DATE_TRUNC('month', NOW() - (n || ' months')::INTERVAL)::DATE AS inicio,
           (DATE_TRUNC('month', NOW() - (n || ' months')::INTERVAL) + INTERVAL '1 month - 1 day')::DATE AS fim,
           TO_CHAR(NOW() - (n || ' months')::INTERVAL, 'Mon/YY') AS label
    FROM GENERATE_SERIES(5, 0, -1) n
  )
  SELECT
    m.label,
    COALESCE((
      SELECT SUM(valor) FROM receitas r
      WHERE r.tenant_id = p_tenant_id AND r.created_at::DATE BETWEEN m.inicio AND m.fim
    ), 0),
    COALESCE((
      SELECT SUM(valor) FROM gastos g
      WHERE g.tenant_id = p_tenant_id AND g.status = 'aprovado'
        AND g.created_at::DATE BETWEEN m.inicio AND m.fim
    ), 0)
  FROM meses m;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- FUNCTION: Verificar limites do plano
-- ============================================================
CREATE OR REPLACE FUNCTION verificar_limite_plano(p_tenant_id UUID)
RETURNS JSON AS $$
DECLARE
  v_plano plano_tipo;
  v_total_motoristas INTEGER;
  v_total_veiculos INTEGER;
  v_limite_motoristas INTEGER;
  v_limite_veiculos INTEGER;
BEGIN
  SELECT plano INTO v_plano FROM tenants WHERE id = p_tenant_id;

  v_limite_motoristas := CASE v_plano
    WHEN 'starter' THEN 5
    WHEN 'growth' THEN 20
    WHEN 'pro' THEN 9999
  END;

  v_limite_veiculos := CASE v_plano
    WHEN 'starter' THEN 8
    WHEN 'growth' THEN 30
    WHEN 'pro' THEN 9999
  END;

  SELECT COUNT(*) INTO v_total_motoristas FROM users
  WHERE tenant_id = p_tenant_id AND role = 'motorista' AND ativo = TRUE;

  SELECT COUNT(*) INTO v_total_veiculos FROM veiculos
  WHERE tenant_id = p_tenant_id AND ativo = TRUE;

  RETURN json_build_object(
    'plano', v_plano,
    'motoristas_atual', v_total_motoristas,
    'motoristas_limite', v_limite_motoristas,
    'motoristas_pode_adicionar', v_total_motoristas < v_limite_motoristas,
    'veiculos_atual', v_total_veiculos,
    'veiculos_limite', v_limite_veiculos,
    'veiculos_pode_adicionar', v_total_veiculos < v_limite_veiculos
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- STORAGE: Buckets para comprovantes e documentos
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('comprovantes', 'comprovantes', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documentos', 'documentos', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('fotos', 'fotos', FALSE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: usuário só acessa arquivos do seu tenant
CREATE POLICY "storage_comprovantes_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'comprovantes' AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "storage_comprovantes_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'comprovantes' AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "storage_documentos_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "storage_documentos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documentos' AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "storage_fotos_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'fotos' AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

CREATE POLICY "storage_fotos_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'fotos' AND
    (storage.foldername(name))[1] = get_tenant_id()::TEXT
  );

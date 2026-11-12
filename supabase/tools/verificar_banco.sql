-- =====================================================================
-- PORTFY · Verificação do banco
-- Rode no SQL Editor do Supabase. Mostra uma tabela: tudo deve estar OK.
-- Se algo estiver em ATENÇÃO, rode de novo as migrações na ordem (são idempotentes),
-- começando por supabase/migrations/20261008000000_initial_schema.sql
-- =====================================================================
with checks (verificacao, esperado, encontrado) as (
  select 'Tabelas do Portfy (16 obrigatórias)', 16::bigint,
         (select count(*) from information_schema.tables where table_schema = 'public'
             and table_name in ('planos','perfis','configuracoes_usuario','diagnosticos',
             'assinaturas','pagamentos','modelos','documentos','projetos','tarefas','eventos',
             'notas','registro_atividades','ia_conversas','ia_mensagens','ia_uso_diario'))
  union all
  select 'Dessas tabelas, com RLS ligado', 16,
         (select count(*) from pg_tables where schemaname = 'public' and rowsecurity
             and tablename in ('planos','perfis','configuracoes_usuario','diagnosticos',
             'assinaturas','pagamentos','modelos','documentos','projetos','tarefas','eventos',
             'notas','registro_atividades','ia_conversas','ia_mensagens','ia_uso_diario'))
  union all
  -- 23 = 20 da migração inicial + 1 de anexos (v9) + 2 de pacotes (v10)
  select 'Políticas de segurança (RLS)', 23,
         (select count(*) from pg_policies where schemaname = 'public')
  union all
  select 'Gatilho on_auth_user_created', 1,
         (select count(*) from pg_trigger t
            join pg_class c on c.oid = t.tgrelid
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'auth' and c.relname = 'users' and t.tgname = 'on_auth_user_created'
               and not t.tgisinternal)
  union all
  select 'Funções do Portfy', 8,
         (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and p.proname in ('ensure_user_rows','ai_quota','ai_register_usage','dashboard_stats',
                 'handle_new_user','delete_my_account','activate_plan','sync_my_plan'))
  union all
  select 'Colunas novas do perfil e dos pagamentos', 5,
         (select count(*) from information_schema.columns where table_schema = 'public'
            and ((table_name = 'perfis' and column_name in ('localizacao','linkedin','github',
                'habilidades'))
              or (table_name = 'pagamentos' and column_name = 'meio_pagamento')))
  union all
  -- 7 = as 6 tabelas da migração inicial + anexos (v9)
  select 'Colunas usuario_id com preenchimento automático', 7,
         (select count(*) from information_schema.columns
           where table_schema = 'public' and column_name = 'usuario_id'
               and column_default like '%auth.uid()%')
  union all
  select 'Buckets de imagens (avatars, doc-images)', 2,
         (select count(*) from storage.buckets where id in ('avatars', 'doc-images'))
  union all
  select 'Planos cadastrados (A, B, C)', 3, (select count(*) from public.planos)
  union all
  select 'Modelos da v9 cadastrados (23)', 23, (select count(*) from public.modelos
      where identificador in ('curriculo-profissional', 'curriculo-minimalista',
      'curriculo-estagio', 'curriculo-moderno', 'curriculo-executivo', 'curriculo-criativo',
      'curriculo-tech', 'carta-apresentacao', 'portfolio-criativo', 'portfolio-minimalista',
      'portfolio-tech', 'portfolio-fotografia', 'portfolio-sobre-mim', 'perfil-linkedin',
      'linkedin-post', 'linkedin-carrossel', 'case-de-projeto', 'projeto-resumo',
      'apresentacao-pitch', 'apresentacao-resultados', 'apresentacao-timeline', 'em-branco-a4',
      'em-branco-slide'))
  union all
  select 'v9 · coluna projetos.documento_id', 1,
         (select count(*) from information_schema.columns where table_schema = 'public'
             and table_name = 'projetos' and column_name = 'documento_id')
  union all
  select 'v9 · tabela anexos com RLS ligado', 1,
         (select count(*) from pg_tables where schemaname = 'public' and tablename = 'anexos'
             and rowsecurity)
  union all
  select 'v9 · gatilho de limite de anexos', 1,
         (select count(*) from pg_trigger where tgname = 'trg_anexos_limit' and not tgisinternal)
  union all
  select 'v9 · bucket anexos', 1, (select count(*) from storage.buckets where id = 'anexos'
      and public)
  union all
  select 'v9 · políticas do bucket anexos', 4,
         (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects'
             and policyname like 'anexos\_%')
  union all
  select 'v10 · tabelas pacotes e usuario_pacotes com RLS ligado', 2,
         (select count(*) from pg_tables where schemaname = 'public'
             and tablename in ('pacotes', 'usuario_pacotes') and rowsecurity)
  union all
  select 'v10 · colunas tipo e pacote_codigo em pagamentos', 2,
         (select count(*) from information_schema.columns where table_schema = 'public'
             and table_name = 'pagamentos' and column_name in ('tipo', 'pacote_codigo'))
  union all
  select 'v9 · API pode gravar em anexos (permissão de tabela)', 1,
         (select case when to_regclass('public.anexos') is null then 0
                      when has_table_privilege('authenticated', 'public.anexos', 'INSERT') then 1
                      else 0 end)
  union all
  select 'v10 · API lê pacotes (visitante) e compras (logado)', 2,
         (select case when to_regclass('public.pacotes') is null then 0
                      when has_table_privilege('anon', 'public.pacotes', 'SELECT') then 1
                      else 0 end)
         + (select case when to_regclass('public.usuario_pacotes') is null then 0
                      when has_table_privilege('authenticated', 'public.usuario_pacotes',
                           'SELECT') then 1
                      else 0 end)
  union all
  select 'Usuários sem perfil (o site conserta no próximo login)', 0,
         (select count(*) from auth.users u left join public.perfis p on p.id = u.id
             where p.id is null)
)
select verificacao, esperado, encontrado,
       case when encontrado = esperado then 'OK' else 'ATENÇÃO' end as status
from checks;

-- Usuários que existem hoje em Authentication (inclui os apagados com "soft delete", se houver):
-- select id, email, email_confirmed_at, created_at, deleted_at
--   from auth.users order by created_at desc;

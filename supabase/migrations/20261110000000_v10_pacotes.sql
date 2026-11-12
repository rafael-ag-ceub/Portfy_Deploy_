-- =====================================================================
-- PORTFY · v10 · Pacotes de elementos pagos (Mercado Pago)
-- Rode no SQL Editor do Supabase (New query > colar > Run).
-- É idempotente: pode ser executada de novo sem erro.
-- Pré-requisito: a migração 20261021000000_perfil_e_pagamentos.sql já rodada.
--
--   1. pacotes          catálogo dos pacotes à venda (o preço é decidido aqui, no servidor)
--   2. usuario_pacotes  pacotes já liberados em cada conta (só o servidor escreve)
--   3. pagamentos       passa a aceitar compra de PLANO ou de PACOTE
--   4. planos           recursos do Premium alinhados com o que o Portfy realmente oferece
-- =====================================================================

-- 1. CATÁLOGO DE PACOTES ------------------------------------------------------
create table if not exists public.pacotes (
  codigo          text primary key,                       -- 'startup', 'cv-criativo', 'dados'
  nome            text    not null,
  descricao       text    not null default '',
  preco_centavos  integer not null check (preco_centavos > 0),
  ativo           boolean not null default true,
  criado_em       timestamptz not null default now()
);

insert into public.pacotes (codigo, nome, descricao, preco_centavos, ativo) values
  ('startup',     'Pacote Startup',
      'Órbitas, carimbos e ícones de lançamento para apresentações e portfólios de produto.', 1900,
      true),
  ('cv-criativo', 'Pacote Criativo',
      'Manchas, ondas, etiquetas e corações para currículos e portfólios de design.',        1490,
      true),
  ('dados',       'Pacote Dados e Tech',
      'Gráficos, anéis de progresso, cubos e ícones de código para projetos técnicos.',       2490,
      true)
on conflict (codigo) do update
  set nome = excluded.nome, descricao = excluded.descricao,
      preco_centavos = excluded.preco_centavos, ativo = excluded.ativo;

alter table public.pacotes enable row level security;
drop policy if exists catalog_read on public.pacotes;
create policy catalog_read on public.pacotes for select to anon, authenticated using (ativo);
-- Permissão da API (o RLS filtra: só pacotes ativos aparecem)
grant select on public.pacotes to anon, authenticated;

-- 2. PACOTES LIBERADOS PARA CADA CONTA ----------------------------------------
create table if not exists public.usuario_pacotes (
  usuario_id     uuid not null references auth.users (id) on delete cascade,
  codigo_pacote  text not null references public.pacotes (codigo),
  criado_em      timestamptz not null default now(),
  primary key (usuario_id, codigo_pacote)
);

alter table public.usuario_pacotes enable row level security;
drop policy if exists own_select on public.usuario_pacotes;
create policy own_select on public.usuario_pacotes for select to authenticated
  using (usuario_id = (select auth.uid()));
grant select on public.usuario_pacotes to authenticated;
-- Sem policy de escrita de propósito: só o servidor (service role) libera ou tira um pacote.

-- 3. PAGAMENTOS DE PLANO OU DE PACOTE -----------------------------------------
alter table public.pagamentos add column if not exists tipo text not null default 'plano'
  check (tipo in ('plano', 'pacote'));
alter table public.pagamentos add column if not exists pacote_codigo text
    references public.pacotes (codigo);
alter table public.pagamentos alter column codigo_plano drop not null;

alter table public.pagamentos drop constraint if exists pagamentos_tipo_ck;
alter table public.pagamentos add constraint pagamentos_tipo_ck check (
     (tipo = 'plano'  and codigo_plano is not null and pacote_codigo is null)
  or (tipo = 'pacote' and pacote_codigo is not null and codigo_plano is null)
);

create index if not exists pagamentos_pacote_idx on public.pagamentos (pacote_codigo)
  where pacote_codigo is not null;

-- 4. PREMIUM: só o que existe de fato -----------------------------------------
update public.planos
   set recursos = '["Tudo do plano Pro","Todos os pacotes de elementos","Exportação sem marca"]'::jsonb
 where codigo = 'C';

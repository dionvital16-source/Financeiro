-- =====================================================================
-- VITAL FINANCEIRO - banco completo
-- Pode rodar mais de uma vez sem quebrar e sem apagar dados.
-- Papéis: Admin, Financeiro, Vendedor.
-- =====================================================================

-- ---------- tipos ----------
do $$ begin
  create type public.papel as enum ('Admin', 'Financeiro', 'Vendedor');
exception when duplicate_object then null; end $$;

-- ---------- tabelas ----------
create table if not exists public.profiles (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid unique references auth.users (id) on delete set null,
  email     text not null unique check (email = lower(email) and email like '%_@_%'),
  nome      text not null check (length(trim(nome)) between 1 and 120),
  papel     public.papel not null default 'Vendedor',
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.formas_pagamento (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique check (length(trim(nome)) between 1 and 60),
  ativo     boolean not null default true,
  ordem     integer not null default 99,
  criado_em timestamptz not null default now()
);

create table if not exists public.orcamentos (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique check (length(trim(codigo)) between 1 and 60),
  cliente         text not null check (length(trim(cliente)) between 1 and 160),
  cliente_doc     text check (length(cliente_doc) <= 20),
  obra            text check (length(obra) <= 160),
  cidade          text check (length(cidade) <= 80),
  uf              text check (length(uf) <= 2),
  valor           numeric(12, 2) not null check (valor >= 0),
  data_fechamento date not null default current_date,
  vendedor_id     uuid references public.profiles (id) on delete set null,
  vendedor_nome   text check (length(vendedor_nome) <= 120),
  observacao      text check (length(observacao) <= 1000),
  itens           jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array' and pg_column_size(itens) < 200000),
  origem          text not null default 'manual' check (origem in ('manual', 'cem')),
  criado_por      uuid references public.profiles (id) on delete set null,
  criado_em       timestamptz not null default now()
);
create index if not exists orcamentos_vendedor_idx on public.orcamentos (vendedor_id);
create index if not exists orcamentos_criado_por_idx on public.orcamentos (criado_por);

create table if not exists public.parcelas (
  id           uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  descricao    text check (length(descricao) <= 80),
  forma_id     uuid not null references public.formas_pagamento (id) on delete restrict,
  valor        numeric(12, 2) not null check (valor > 0),
  vencimento   date not null,
  pago_em      date,
  observacao   text check (length(observacao) <= 300),
  criado_por   uuid references public.profiles (id) on delete set null,
  criado_em    timestamptz not null default now()
);
create index if not exists parcelas_orcamento_idx on public.parcelas (orcamento_id);
create index if not exists parcelas_forma_idx on public.parcelas (forma_id);
create index if not exists parcelas_criado_por_idx on public.parcelas (criado_por);

create table if not exists public.notas_fiscais (
  id           uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  numero       text not null check (length(trim(numero)) between 1 and 40),
  data_emissao date not null,
  valor        numeric(12, 2) not null check (valor > 0),
  arquivo_path text check (length(arquivo_path) <= 200),
  arquivo_nome text check (length(arquivo_nome) <= 120),
  criado_por   uuid references public.profiles (id) on delete set null,
  criado_em    timestamptz not null default now()
);
create index if not exists notas_orcamento_idx on public.notas_fiscais (orcamento_id);
create index if not exists notas_criado_por_idx on public.notas_fiscais (criado_por);

-- ---------- funções de permissão ----------
-- Só enxergam perfil ATIVO: conta suspensa perde o acesso na hora.
create or replace function public.meu_perfil_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = auth.uid() and ativo
$$;

create or replace function public.meu_papel() returns public.papel
language sql stable security definer set search_path = public as $$
  select papel from public.profiles where user_id = auth.uid() and ativo
$$;

-- Admin e Financeiro veem todos; Vendedor só os orçamentos em que é o vendedor.
create or replace function public.pode_ver_orcamento(oid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when public.meu_papel() in ('Admin', 'Financeiro') then true
    else exists (select 1 from public.orcamentos o where o.id = oid and o.vendedor_id = public.meu_perfil_id())
  end
$$;

-- Arquivo: o caminho começa com o id do orçamento dono.
create or replace function public.pode_ver_arquivo(caminho text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when split_part(caminho, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.pode_ver_orcamento(split_part(caminho, '/', 1)::uuid)
    else false
  end
$$;

-- ---------- sistema fechado: só cria conta quem tem perfil pré-criado ----------
create or replace function public.auth_antes_cadastro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.email = lower(new.email) and p.user_id is null and p.ativo
  ) then
    raise exception 'Cadastro não autorizado para este e-mail.';
  end if;
  return new;
end $$;

create or replace function public.auth_depois_cadastro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set user_id = new.id
  where email = lower(new.email) and user_id is null;
  return new;
end $$;

drop trigger if exists vf_antes_cadastro on auth.users;
create trigger vf_antes_cadastro before insert on auth.users
  for each row execute function public.auth_antes_cadastro();

drop trigger if exists vf_depois_cadastro on auth.users;
create trigger vf_depois_cadastro after insert on auth.users
  for each row execute function public.auth_depois_cadastro();

-- ---------- gatilhos de proteção ----------
create or replace function public.profiles_protecao() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  logado boolean := auth.uid() is not null;
  eu uuid := public.meu_perfil_id();
  meu public.papel := public.meu_papel();
begin
  if tg_op = 'INSERT' then
    new.email := lower(trim(new.email));
    -- o vínculo com o login nunca é escolhido à mão: nasce no cadastro da conta,
    -- ou é religado aqui se a pessoa já tinha conta (perfil apagado e recriado)
    new.user_id := (
      select u.id from auth.users u
      where lower(u.email) = new.email
        and not exists (select 1 from public.profiles p where p.user_id = u.id)
      limit 1
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.email := lower(trim(new.email));
    if new.id <> old.id then
      raise exception 'O identificador do perfil não pode ser alterado.';
    end if;
    -- vínculo com o login: só muda por dentro (cadastro ou exclusão da conta), nunca à mão
    if new.user_id is distinct from old.user_id and pg_trigger_depth() < 2 then
      raise exception 'O vínculo do perfil com o login não pode ser alterado.';
    end if;
    if logado then
      if new.papel <> old.papel and old.id = eu then
        raise exception 'Você não pode alterar o próprio papel.';
      end if;
      if meu is distinct from 'Admin'
         and (new.email <> old.email or new.papel <> old.papel or new.ativo <> old.ativo) then
        raise exception 'Você só pode alterar o seu nome.';
      end if;
    end if;
  end if;

  -- o último administrador ativo não pode ser rebaixado, suspenso nem excluído
  if old.papel = 'Admin' and old.ativo
     and (tg_op = 'DELETE' or new.papel <> 'Admin' or not new.ativo)
     and not exists (select 1 from public.profiles where papel = 'Admin' and ativo and id <> old.id) then
    raise exception 'Este é o último administrador ativo: não pode ser rebaixado, suspenso nem excluído.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists profiles_protecao on public.profiles;
create trigger profiles_protecao before insert or update or delete on public.profiles
  for each row execute function public.profiles_protecao();

-- "quem criou": preenchido pelo banco; depois só o Admin altera.
-- Em parcelas e notas, o orçamento dono também não pode ser trocado.
create or replace function public.protege_registro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.criado_por := public.meu_perfil_id(); end if;
    return new;
  end if;
  if new.id <> old.id then
    raise exception 'O identificador do registro não pode ser alterado.';
  end if;
  if new.criado_por is distinct from old.criado_por
     and auth.uid() is not null and public.meu_papel() is distinct from 'Admin' then
    raise exception 'O campo "quem criou" só pode ser alterado pelo administrador.';
  end if;
  if tg_table_name in ('parcelas', 'notas_fiscais')
     and (to_jsonb(new) ->> 'orcamento_id') is distinct from (to_jsonb(old) ->> 'orcamento_id') then
    raise exception 'Não é possível mover o lançamento para outro orçamento.';
  end if;
  return new;
end $$;

drop trigger if exists orcamentos_protecao on public.orcamentos;
create trigger orcamentos_protecao before insert or update on public.orcamentos
  for each row execute function public.protege_registro();
drop trigger if exists parcelas_protecao on public.parcelas;
create trigger parcelas_protecao before insert or update on public.parcelas
  for each row execute function public.protege_registro();
drop trigger if exists notas_protecao on public.notas_fiscais;
create trigger notas_protecao before insert or update on public.notas_fiscais
  for each row execute function public.protege_registro();

-- ---------- RLS: ligado em todas as tabelas ----------
alter table public.profiles         enable row level security;
alter table public.formas_pagamento enable row level security;
alter table public.orcamentos       enable row level security;
alter table public.parcelas         enable row level security;
alter table public.notas_fiscais    enable row level security;

-- profiles: Admin e Financeiro veem todos; cada um vê o próprio. Só Admin cria e apaga.
drop policy if exists profiles_ver on public.profiles;
create policy profiles_ver on public.profiles for select to authenticated
  using (public.meu_papel() in ('Admin', 'Financeiro') or id = public.meu_perfil_id());
drop policy if exists profiles_criar on public.profiles;
create policy profiles_criar on public.profiles for insert to authenticated
  with check (public.meu_papel() = 'Admin');
drop policy if exists profiles_alterar on public.profiles;
create policy profiles_alterar on public.profiles for update to authenticated
  using (public.meu_papel() = 'Admin' or id = public.meu_perfil_id())
  with check (public.meu_papel() = 'Admin' or id = public.meu_perfil_id());
drop policy if exists profiles_apagar on public.profiles;
create policy profiles_apagar on public.profiles for delete to authenticated
  using (public.meu_papel() = 'Admin');

-- formas de pagamento: todos os usuários ativos veem; só Admin mexe.
drop policy if exists formas_ver on public.formas_pagamento;
create policy formas_ver on public.formas_pagamento for select to authenticated
  using (public.meu_perfil_id() is not null);
drop policy if exists formas_criar on public.formas_pagamento;
create policy formas_criar on public.formas_pagamento for insert to authenticated
  with check (public.meu_papel() = 'Admin');
drop policy if exists formas_alterar on public.formas_pagamento;
create policy formas_alterar on public.formas_pagamento for update to authenticated
  using (public.meu_papel() = 'Admin') with check (public.meu_papel() = 'Admin');
drop policy if exists formas_apagar on public.formas_pagamento;
create policy formas_apagar on public.formas_pagamento for delete to authenticated
  using (public.meu_papel() = 'Admin');

-- orçamentos: Admin/Financeiro veem todos e criam/alteram; Vendedor só vê os dele; só Admin apaga.
drop policy if exists orcamentos_ver on public.orcamentos;
create policy orcamentos_ver on public.orcamentos for select to authenticated
  using (public.meu_papel() in ('Admin', 'Financeiro') or vendedor_id = public.meu_perfil_id());
drop policy if exists orcamentos_criar on public.orcamentos;
create policy orcamentos_criar on public.orcamentos for insert to authenticated
  with check (public.meu_papel() in ('Admin', 'Financeiro'));
drop policy if exists orcamentos_alterar on public.orcamentos;
create policy orcamentos_alterar on public.orcamentos for update to authenticated
  using (public.meu_papel() in ('Admin', 'Financeiro'))
  with check (public.meu_papel() in ('Admin', 'Financeiro'));
drop policy if exists orcamentos_apagar on public.orcamentos;
create policy orcamentos_apagar on public.orcamentos for delete to authenticated
  using (public.meu_papel() = 'Admin');

-- parcelas e notas: quem vê o orçamento vê, lança e altera; só Admin apaga.
drop policy if exists parcelas_ver on public.parcelas;
create policy parcelas_ver on public.parcelas for select to authenticated
  using (public.pode_ver_orcamento(orcamento_id));
drop policy if exists parcelas_criar on public.parcelas;
create policy parcelas_criar on public.parcelas for insert to authenticated
  with check (public.pode_ver_orcamento(orcamento_id));
drop policy if exists parcelas_alterar on public.parcelas;
create policy parcelas_alterar on public.parcelas for update to authenticated
  using (public.pode_ver_orcamento(orcamento_id)) with check (public.pode_ver_orcamento(orcamento_id));
drop policy if exists parcelas_apagar on public.parcelas;
create policy parcelas_apagar on public.parcelas for delete to authenticated
  using (public.meu_papel() = 'Admin');

drop policy if exists notas_ver on public.notas_fiscais;
create policy notas_ver on public.notas_fiscais for select to authenticated
  using (public.pode_ver_orcamento(orcamento_id));
drop policy if exists notas_criar on public.notas_fiscais;
create policy notas_criar on public.notas_fiscais for insert to authenticated
  with check (public.pode_ver_orcamento(orcamento_id));
drop policy if exists notas_alterar on public.notas_fiscais;
create policy notas_alterar on public.notas_fiscais for update to authenticated
  using (public.pode_ver_orcamento(orcamento_id)) with check (public.pode_ver_orcamento(orcamento_id));
drop policy if exists notas_apagar on public.notas_fiscais;
create policy notas_apagar on public.notas_fiscais for delete to authenticated
  using (public.meu_papel() = 'Admin');

-- ---------- arquivos: bucket privado, 25 MB, só PDF ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('notas', 'notas', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 26214400, allowed_mime_types = array['application/pdf'];

drop policy if exists notas_arquivo_ver on storage.objects;
create policy notas_arquivo_ver on storage.objects for select to authenticated
  using (bucket_id = 'notas' and public.pode_ver_arquivo(name));
drop policy if exists notas_arquivo_enviar on storage.objects;
create policy notas_arquivo_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'notas' and public.pode_ver_arquivo(name));
drop policy if exists notas_arquivo_apagar on storage.objects;
create policy notas_arquivo_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'notas' and public.meu_papel() = 'Admin');

-- ---------- permissões: visitante sem login (anon) não tem NADA ----------
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
revoke execute on all functions in schema public from public;
alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public;

-- usuário logado: o mínimo por tabela (o RLS decide as linhas)
revoke all on all tables in schema public from authenticated;
grant select, insert, update, delete on
  public.profiles, public.formas_pagamento, public.orcamentos, public.parcelas, public.notas_fiscais
  to authenticated;

-- funções: só as de permissão são chamáveis, e só por quem tem login
revoke execute on all functions in schema public from authenticated;
grant execute on function public.meu_perfil_id()            to authenticated;
grant execute on function public.meu_papel()                to authenticated;
grant execute on function public.pode_ver_orcamento(uuid)   to authenticated;
grant execute on function public.pode_ver_arquivo(text)     to authenticated;

-- funções de gatilho: ninguém executa diretamente
revoke execute on function public.auth_antes_cadastro()  from public, anon, authenticated;
revoke execute on function public.auth_depois_cadastro() from public, anon, authenticated;
revoke execute on function public.profiles_protecao()    from public, anon, authenticated;
revoke execute on function public.protege_registro()     from public, anon, authenticated;

-- ---------- formas de pagamento iniciais (só se a tabela estiver vazia) ----------
insert into public.formas_pagamento (nome, ordem)
select v.nome, v.ordem
from (values ('Pix', 1), ('Dinheiro', 2), ('Cartão de crédito', 3), ('Cartão de débito', 4),
             ('Boleto', 5), ('Cheque', 6), ('Transferência', 7)) as v (nome, ordem)
where not exists (select 1 from public.formas_pagamento);

-- ---------- pedido assinado pelo cliente (PDF) ----------

create table if not exists public.pedidos_assinados (
  id           uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references public.orcamentos (id) on delete cascade,
  -- o caminho do arquivo sempre começa com o id do orçamento dono
  arquivo_path text not null unique check (length(arquivo_path) <= 200),
  arquivo_nome text not null check (length(trim(arquivo_nome)) between 1 and 120),
  criado_por   uuid references public.profiles (id) on delete set null,
  criado_em    timestamptz not null default now(),
  constraint pedidos_caminho_do_orcamento check (arquivo_path like orcamento_id::text || '/%')
);
create index if not exists pedidos_orcamento_idx on public.pedidos_assinados (orcamento_id);
create index if not exists pedidos_criado_por_idx on public.pedidos_assinados (criado_por);

-- mesma proteção de parcelas e notas: "quem criou" e o orçamento dono não mudam
create or replace function public.protege_registro() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then new.criado_por := public.meu_perfil_id(); end if;
    return new;
  end if;
  if new.id <> old.id then
    raise exception 'O identificador do registro não pode ser alterado.';
  end if;
  if new.criado_por is distinct from old.criado_por
     and auth.uid() is not null and public.meu_papel() is distinct from 'Admin' then
    raise exception 'O campo "quem criou" só pode ser alterado pelo administrador.';
  end if;
  if tg_table_name in ('parcelas', 'notas_fiscais', 'pedidos_assinados')
     and (to_jsonb(new) ->> 'orcamento_id') is distinct from (to_jsonb(old) ->> 'orcamento_id') then
    raise exception 'Não é possível mover o lançamento para outro orçamento.';
  end if;
  return new;
end $$;
revoke execute on function public.protege_registro() from public, anon, authenticated;

drop trigger if exists pedidos_protecao on public.pedidos_assinados;
create trigger pedidos_protecao before insert or update on public.pedidos_assinados
  for each row execute function public.protege_registro();

alter table public.pedidos_assinados enable row level security;

drop policy if exists pedidos_ver on public.pedidos_assinados;
create policy pedidos_ver on public.pedidos_assinados for select to authenticated
  using (public.pode_ver_orcamento(orcamento_id));
drop policy if exists pedidos_criar on public.pedidos_assinados;
create policy pedidos_criar on public.pedidos_assinados for insert to authenticated
  with check (public.pode_ver_orcamento(orcamento_id));
drop policy if exists pedidos_alterar on public.pedidos_assinados;
create policy pedidos_alterar on public.pedidos_assinados for update to authenticated
  using (public.pode_ver_orcamento(orcamento_id)) with check (public.pode_ver_orcamento(orcamento_id));
drop policy if exists pedidos_apagar on public.pedidos_assinados;
create policy pedidos_apagar on public.pedidos_assinados for delete to authenticated
  using (public.meu_papel() = 'Admin');

revoke all on public.pedidos_assinados from anon, authenticated;
grant select, insert, update, delete on public.pedidos_assinados to authenticated;

-- arquivos: bucket privado próprio, 25 MB, só PDF
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pedidos', 'pedidos', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 26214400, allowed_mime_types = array['application/pdf'];

drop policy if exists pedidos_arquivo_ver on storage.objects;
create policy pedidos_arquivo_ver on storage.objects for select to authenticated
  using (bucket_id = 'pedidos' and public.pode_ver_arquivo(name));
drop policy if exists pedidos_arquivo_enviar on storage.objects;
create policy pedidos_arquivo_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'pedidos' and public.pode_ver_arquivo(name));
drop policy if exists pedidos_arquivo_apagar on storage.objects;
create policy pedidos_arquivo_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'pedidos' and public.meu_papel() = 'Admin');

-- ---------- contato do cliente no orçamento ----------
alter table public.orcamentos add column if not exists cliente_endereco text check (length(cliente_endereco) <= 300);
alter table public.orcamentos add column if not exists cliente_fone     text check (length(cliente_fone) <= 60);
alter table public.orcamentos add column if not exists cliente_email    text check (length(cliente_email) <= 160);

-- ---------- reforço de segurança e trilha de auditoria ----------

-- 1) Permissão só para conta com e-mail CONFIRMADO.
--    Antes, a proteção dependia só da opção "Confirm email" do painel. Agora o próprio
--    banco recusa: se alguém cadastrar a senha de um e-mail pré-liberado que não é dele,
--    não enxerga nada enquanto não confirmar pelo link que chega na caixa do dono.
create or replace function public.meu_perfil_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.user_id = auth.uid() and p.ativo and u.email_confirmed_at is not null
$$;

create or replace function public.meu_papel() returns public.papel
language sql stable security definer set search_path = public as $$
  select p.papel from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.user_id = auth.uid() and p.ativo and u.email_confirmed_at is not null
$$;

-- 2) O PDF de uma nota só pode apontar para a pasta do próprio orçamento.
do $$ begin
  alter table public.notas_fiscais add constraint notas_caminho_do_orcamento
    check (arquivo_path is null or arquivo_path like orcamento_id::text || '/%');
exception when duplicate_object then null; end $$;

-- 3) Envio de arquivo: nome obrigatório no formato <id do orçamento>/<id>.pdf
drop policy if exists notas_arquivo_enviar on storage.objects;
create policy notas_arquivo_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'notas' and public.pode_ver_arquivo(name)
              and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$');
drop policy if exists pedidos_arquivo_enviar on storage.objects;
create policy pedidos_arquivo_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'pedidos' and public.pode_ver_arquivo(name)
              and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$');

-- 4) Tabela ou função criada no futuro não nasce liberada para quem tem login.
alter default privileges for role postgres in schema public revoke all on tables    from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from authenticated;
alter default privileges for role postgres in schema public revoke all on functions from authenticated;

-- 5) Trilha de auditoria: quem criou, alterou ou apagou o quê, e como era antes.
--    Ninguém escreve nem apaga nela pelo site; só o Admin lê.
create table if not exists public.auditoria (
  id          bigint generated always as identity primary key,
  quando      timestamptz not null default now(),
  perfil_id   uuid,
  perfil_nome text,
  papel       text,
  tabela      text not null,
  operacao    text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  registro_id uuid,
  antes       jsonb,
  depois      jsonb
);
create index if not exists auditoria_registro_idx on public.auditoria (tabela, registro_id);
create index if not exists auditoria_quando_idx on public.auditoria (quando desc);

create or replace function public.registra_auditoria() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := public.meu_perfil_id();
  v_antes jsonb;
  v_depois jsonb;
begin
  if tg_op <> 'INSERT' then v_antes := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_depois := to_jsonb(new); end if;
  if tg_op = 'UPDATE' and v_antes = v_depois then return null; end if;
  insert into public.auditoria (perfil_id, perfil_nome, papel, tabela, operacao, registro_id, antes, depois)
  values (eu, (select nome from public.profiles where id = eu), public.meu_papel()::text,
          tg_table_name, tg_op, coalesce(v_depois ->> 'id', v_antes ->> 'id')::uuid, v_antes, v_depois);
  return null;
end $$;
revoke execute on function public.registra_auditoria() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'formas_pagamento', 'orcamentos', 'parcelas', 'notas_fiscais', 'pedidos_assinados'] loop
    execute format('drop trigger if exists auditoria_%1$s on public.%1$I', t);
    execute format('create trigger auditoria_%1$s after insert or update or delete on public.%1$I
                    for each row execute function public.registra_auditoria()', t);
  end loop;
end $$;

alter table public.auditoria enable row level security;
drop policy if exists auditoria_ver on public.auditoria;
create policy auditoria_ver on public.auditoria for select to authenticated
  using (public.meu_papel() = 'Admin');
revoke all on public.auditoria from anon, authenticated;
grant select on public.auditoria to authenticated;

-- ---------- assinatura eletrônica do pedido ----------

create table if not exists public.assinaturas (
  id                 uuid primary key default gen_random_uuid(),
  orcamento_id       uuid not null references public.orcamentos (id) on delete cascade,
  original_path      text not null unique check (length(original_path) <= 200),
  arquivo_nome       text not null check (length(trim(arquivo_nome)) between 1 and 120),
  original_sha256    text not null check (original_sha256 ~ '^[0-9a-f]{64}$'),
  token_hash         text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  status             text not null default 'aguardando' check (status in ('aguardando', 'assinado', 'cancelado')),
  expira_em          timestamptz not null default now() + interval '7 days',
  tentativas         integer not null default 0,
  enviado_por        uuid references public.profiles (id) on delete set null,
  enviado_por_nome   text,
  criado_em          timestamptz not null default now(),
  assinante_nome     text check (length(assinante_nome) <= 120),
  assinante_doc      text check (length(assinante_doc) <= 20),
  assinante_ip       text check (length(assinante_ip) <= 60),
  assinante_agente   text check (length(assinante_agente) <= 300),
  assinado_em        timestamptz,
  codigo_verificacao text check (length(codigo_verificacao) <= 40),
  pedido_id          uuid references public.pedidos_assinados (id) on delete set null,
  constraint assinaturas_caminho_do_orcamento check (original_path like orcamento_id::text || '/%')
);
create index if not exists assinaturas_orcamento_idx on public.assinaturas (orcamento_id);
create index if not exists assinaturas_enviado_por_idx on public.assinaturas (enviado_por);
create index if not exists assinaturas_pedido_idx on public.assinaturas (pedido_id);

-- Quem tem login só pode: criar o envio, gerar um link novo e cancelar.
-- Marcar como "assinado" e gravar os dados de quem assinou é só do servidor.
create or replace function public.assinaturas_protecao() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  eu uuid := public.meu_perfil_id();
begin
  if auth.uid() is null then return new; end if; -- servidor

  if tg_op = 'INSERT' then
    new.status := 'aguardando';
    new.expira_em := now() + interval '7 days';
    new.tentativas := 0;
    new.enviado_por := eu;
    new.enviado_por_nome := (select nome from public.profiles where id = eu);
    new.criado_em := now();
    new.assinante_nome := null; new.assinante_doc := null; new.assinante_ip := null;
    new.assinante_agente := null; new.assinado_em := null; new.codigo_verificacao := null; new.pedido_id := null;
    return new;
  end if;

  if old.status <> 'aguardando' then
    raise exception 'Este envio já foi assinado ou cancelado e não pode mais ser alterado.';
  end if;
  if new.status not in ('aguardando', 'cancelado') then
    raise exception 'Só o cliente, pelo link, pode concluir a assinatura.';
  end if;
  -- tudo o que não é "cancelar" ou "novo link" volta ao que era
  new.id := old.id; new.orcamento_id := old.orcamento_id; new.original_path := old.original_path;
  new.arquivo_nome := old.arquivo_nome; new.original_sha256 := old.original_sha256;
  new.enviado_por := old.enviado_por; new.enviado_por_nome := old.enviado_por_nome; new.criado_em := old.criado_em;
  new.assinante_nome := null; new.assinante_doc := null; new.assinante_ip := null;
  new.assinante_agente := null; new.assinado_em := null; new.codigo_verificacao := null; new.pedido_id := null;
  if new.token_hash is distinct from old.token_hash then
    new.expira_em := now() + interval '7 days';
    new.tentativas := 0;
  else
    new.expira_em := old.expira_em;
    new.tentativas := old.tentativas;
  end if;
  return new;
end $$;
revoke execute on function public.assinaturas_protecao() from public, anon, authenticated;

drop trigger if exists assinaturas_protecao on public.assinaturas;
create trigger assinaturas_protecao before insert or update on public.assinaturas
  for each row execute function public.assinaturas_protecao();

drop trigger if exists auditoria_assinaturas on public.assinaturas;
create trigger auditoria_assinaturas after insert or update or delete on public.assinaturas
  for each row execute function public.registra_auditoria();

alter table public.assinaturas enable row level security;
drop policy if exists assinaturas_ver on public.assinaturas;
create policy assinaturas_ver on public.assinaturas for select to authenticated
  using (public.pode_ver_orcamento(orcamento_id));
drop policy if exists assinaturas_criar on public.assinaturas;
create policy assinaturas_criar on public.assinaturas for insert to authenticated
  with check (public.pode_ver_orcamento(orcamento_id));
drop policy if exists assinaturas_alterar on public.assinaturas;
create policy assinaturas_alterar on public.assinaturas for update to authenticated
  using (public.pode_ver_orcamento(orcamento_id)) with check (public.pode_ver_orcamento(orcamento_id));
drop policy if exists assinaturas_apagar on public.assinaturas;
create policy assinaturas_apagar on public.assinaturas for delete to authenticated
  using (public.meu_papel() = 'Admin');
revoke all on public.assinaturas from anon, authenticated;
grant select, insert, update, delete on public.assinaturas to authenticated;

-- Contador de tentativas por aparelho (freio contra quem fica testando links).
-- Sem nenhuma regra de acesso: só o servidor lê e escreve.
create table if not exists public.assinatura_tentativas (
  id     bigint generated always as identity primary key,
  ip     text not null,
  quando timestamptz not null default now()
);
create index if not exists assinatura_tentativas_idx on public.assinatura_tentativas (ip, quando);
alter table public.assinatura_tentativas enable row level security;
revoke all on public.assinatura_tentativas from anon, authenticated;

-- ---------- primeiro administrador ----------
-- Rodar UMA vez, à mão, no painel do Supabase (SQL Editor), trocando o e-mail e o nome:
--   insert into public.profiles (email, nome, papel) values ('seu@email.com', 'Seu Nome', 'Admin');
-- Depois abrir o site e usar "Primeiro acesso" com esse e-mail.

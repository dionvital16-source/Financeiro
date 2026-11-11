-- =====================================================================
-- Reforço de segurança (auditoria de 11/11/2026). Pode rodar mais de uma vez.
-- Não altera nem apaga dados existentes.
-- =====================================================================

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

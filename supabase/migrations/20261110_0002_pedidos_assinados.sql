-- =====================================================================
-- Pedido assinado pelo cliente (PDF) arquivado em cada orçamento.
-- Pode rodar mais de uma vez.
-- Quem vê o orçamento vê e anexa; só Admin apaga.
-- =====================================================================

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

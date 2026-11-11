-- =====================================================================
-- Assinatura eletrônica do pedido pelo cliente. Pode rodar mais de uma vez.
-- O vendedor anexa o PDF e manda um link; o cliente assina sem login,
-- por uma função de servidor. O link guarda só o "hash" do código secreto.
-- =====================================================================

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

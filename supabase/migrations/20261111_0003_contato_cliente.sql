-- =====================================================================
-- Endereço, telefone e e-mail do cliente no orçamento (vêm do XML do CEM).
-- Pode rodar mais de uma vez. Não altera dados existentes.
-- =====================================================================
alter table public.orcamentos add column if not exists cliente_endereco text check (length(cliente_endereco) <= 300);
alter table public.orcamentos add column if not exists cliente_fone     text check (length(cliente_fone) <= 60);
alter table public.orcamentos add column if not exists cliente_email    text check (length(cliente_email) <= 160);

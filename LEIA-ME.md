# Vital Financeiro

Controle de orçamentos fechados, pagamentos, notas fiscais e pedidos assinados da Vital Esquadrias e Vidros.

- Site: https://vitalfinanceiro.netlify.app
- Banco, login e arquivos: Supabase (projeto "Vital Financeiro")
- Hospedagem: Netlify, publicando a partir da branch `claude/dazzling-curie-cj23ub`

## Papéis

| | Admin | Financeiro | Vendedor |
|---|---|---|---|
| Ver orçamentos, pagamentos, notas e pedidos | Todos | Todos | Só os dele |
| Lançar pagamentos, notas e anexar PDFs | Sim | Sim | Só nos dele |
| Importar XML do CEM e criar/alterar orçamento | Sim | Sim | Não |
| Apagar | Sim | Não | Não |
| Formas de pagamento e usuários | Sim | Não | Não |

## Visual

Segue a identidade da Vital Esquadrias e Vidros: verdes da marca, logotipo em `public/`, títulos em Plus Jakarta Sans e faixas diagonais (17°). Cantos sempre retos; preto para alerta e atraso.

No menu, a tela das vendas fechadas se chama "Clientes" (no código e no banco continua `orcamentos`).

## Como testar sem mexer no banco

Abrir o site com `?demo` no final do endereço. Os dados são de exemplo e ficam só na memória do navegador.

## Banco de dados

- `supabase/schema.sql`: banco completo, pode rodar mais de uma vez.
- `supabase/migrations/`: uma mudança por arquivo, com data no nome.

## Publicação

Todo envio para a branch publica o site sozinho. Para guardar código sem publicar, incluir `[skip netlify]` na mensagem do commit.
Mudança no banco sempre vai antes do site.

## Segurança

- Todas as tabelas com RLS; visitante sem login não tem permissão nenhuma.
- Só entra quem tem perfil criado pelo Admin **e** e-mail confirmado (o banco confere os dois).
- Trilha de auditoria na tabela `auditoria`: quem criou, alterou ou apagou o quê. Só o Admin lê; ninguém altera.
- O site só conversa com o endereço exato do projeto Supabase (ver `netlify.toml`). Se o projeto mudar, trocar o endereço lá.
- Saída automática depois de 60 minutos sem uso.
- Sem backup automático no plano gratuito do Supabase: exportar os dados de tempos em tempos.

## Segredos

O site usa somente a chave pública do Supabase (variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, configuradas no Netlify).
A chave secreta nunca entra no código nem no repositório.

# Base para criar um novo site no padrão da Vital (layout do Vital Financeiro)

Cole este texto inteiro em uma conversa nova e anexe junto os três arquivos do logo (`logo-vital-branco.png`, `logo-vital-cor.png`, `simbolo-vital.png`). Antes de enviar, preencha a seção 1.

---

## 1. O que eu quero (PREENCHER)

- **Nome do site:** ...
- **Para que serve:** ...
- **Quem vai usar e o que cada um pode fazer:** ...
- **Telas principais:** ...
- **Nome que aparece abaixo do logo** (no Vital Financeiro é "FINANCEIRO"): ...

Sou dono da Vital Esquadrias e Vidros e não sou programador. Fale comigo em português simples, sem termos técnicos quando der. Quero o novo site com o **mesmo layout** e as **mesmas regras de segurança** do meu sistema atual, o Vital Financeiro, descritos abaixo.

O projeto de referência é o repositório `dionvital16-source/financeiro` no GitHub (site em https://vitalfinanceiro.netlify.app; abrir com `?demo` mostra as telas com dados de exemplo). Se você tiver acesso a ele, leia de lá `src/styles.css`, `src/components/ui.tsx`, `src/components/Shell.tsx`, `src/screens/Login.tsx`, `netlify.toml` e `supabase/schema.sql`. Use como modelo, mas crie o site novo em **outro repositório**, com **outro projeto Supabase** e **outro site no Netlify**. Não altere nada do Vital Financeiro.

---

## 2. Tecnologia (igual ao Vital Financeiro)

- React 19 + TypeScript + Vite 6, `react-router-dom` 7, ícones `lucide-react` com `strokeWidth={1.5}`.
- Banco, login e arquivos no Supabase (`@supabase/supabase-js` 2). Hospedagem no Netlify.
- Sem biblioteca de componentes e sem Tailwind: um único `src/styles.css` com variáveis CSS, mais estilos inline pontuais.
- Estrutura de pastas:

```
src/
  main.tsx, App.tsx, styles.css
  components/   Shell.tsx (menu lateral + área principal), ui.tsx (Blueprint, Chip, Selo, Campo, Vazio, Confirmar, Carregando, Modal, Cabecalho, Stat)
  screens/      uma tela por arquivo (Login.tsx, Perfil.tsx, ...)
  state/        AuthContext.tsx, DataContext.tsx, ToastContext.tsx, demo.tsx
  lib/          supabase.ts, types.ts, dates.ts, format.ts, regras de negócio
supabase/
  schema.sql    banco completo, pode rodar mais de uma vez
  migrations/   uma mudança por arquivo, com data no nome
  functions/    Edge Functions (só se precisar de servidor)
netlify.toml
```

- **Modo demonstração:** abrir o site com `?demo` na URL usa dados de exemplo em memória (`state/demo.tsx`), sem tocar no banco. Serve para testar telas antes de publicar.
- `vite.config.ts`: `build.target = 'es2022'`, `sourcemap: false`, e `manualChunks` separando `react` e `supabase`.
- Mensagens de erro do Supabase traduzidas para português em uma função `mensagemErro()`.


- Os três arquivos do logo ficam na pasta `public/` e são usados pelo caminho `/logo-vital-branco.png`, `/logo-vital-cor.png` e `/simbolo-vital.png`.

---

## 3. Layout: identidade da Vital Esquadrias e Vidros

A marca é **verde, branca e angular**. Três ingredientes aparecem em todo o site: os verdes da marca, o logotipo e as **faixas diagonais** que saem do "V".

**Cores**

| Nome | Código | Onde usar |
|---|---|---|
| verde-vital | `#009635` | Cor da marca: título da tela, botão principal, chip ligado, marca de seção |
| verde-medio | `#026529` | Início do degradê do menu e do fundo do login |
| verde-escuro | `#00491e` | Fim do degradê |
| verde-claro | `#93c763` | Só detalhes sobre o verde escuro: nome do sistema abaixo do logo, item ativo do menu, "Sair" |
| cinza-vital | `#757575` | Rótulos pequenos e legendas |
| tinta | `#1d1f20` | Texto, e também alerta e atraso (nunca vermelho) |

**Fonte** (Google Fonts, no `index.html`): `Plus Jakarta Sans` nos pesos 400, 500, 600, 700 e 800. Títulos em caixa alta e peso 800.

**Logotipo**

- Menu lateral: `logo-vital-branco.png` (172 px de largura) sobre o degradê verde, com o nome do sistema embaixo em verde-claro, caixa alta e letras espaçadas.
- Tela de login: `logo-vital-cor.png` (220 px) dentro do cartão branco.
- Ícone da aba do navegador: `simbolo-vital.png`.
- Nunca redigitar "VITAL" com fonte, nem mudar as cores, distorcer ou colocar sombra no logo. Logo colorido só sobre branco; sobre verde, usar o branco.

**Faixas diagonais**

- Grupos de 2 ou 3 faixas paralelas, inclinadas 17° (a inclinação do "V"), translúcidas sobre o verde.
- Sempre entram por uma borda e saem por outra; nunca soltas no meio.
- Aparecem no menu lateral e no fundo do login. A área de trabalho fica limpa, para a leitura de tabelas e valores.

**Regras de uso**

- **Cantos sempre retos** (`border-radius: 0`). Sem sombras e sem emoji. Degradê só no menu e no fundo do login.
- Cada tela começa com um rótulo pequeno em caixa alta cinza (`.kicker`) e um `h1` em verde-vital, caixa alta.
- Conteúdo em cartões `Blueprint`: fundo branco e borda fina. O título do cartão (`h3`) leva um pequeno paralelogramo verde na frente.
- Filtros e escolhas em `Chip`: desligado é branco com contorno, ligado é verde-vital.
- Situações em `Selo` (badge pequeno em caixa alta): verde claro para "ok", contorno cinza para neutro, tinta para alerta e atraso.
- Botão principal verde cheio (`.btn-primary`), secundário só contorno, perigo em tinta (`.btn-ink`).
- Campos brancos com borda fina, altura mínima 44 px (bom para celular).
- Números de destaque em cartões `Stat`; o cartão de alerta fica em tinta com texto branco.
- Menu lateral fixo de 236 px no computador, em degradê verde com texto branco; no celular (até 900 px) vira bloco no topo, com os itens lado a lado.
- Fio verde de 4 px no alto da área principal.
- Avisos rápidos em `toast` tinta no canto inferior direito.
- Lista vazia: caixa tracejada com uma frase explicando o que fazer.
- `<meta name="theme-color" content="#026529">` e `<meta name="robots" content="noindex, nofollow">` no `index.html`.

**CSS completo** (copiar inteiro para `src/styles.css`). A primeira parte é a estrutura; o bloco final "IDENTIDADE VITAL" aplica as cores, a fonte e as faixas por cima.

```css
:root {
  --color-bg: #f2f2f3;
  --color-surface: #e9e9ea;
  --color-text: #1d1f20;
  --color-divider: rgba(29, 31, 32, 0.16);

  --ink: #1d1f20;
  --paper: #f2f2f3;
  --muted: rgba(29, 31, 32, 0.55);
  --muted-2: rgba(29, 31, 32, 0.45);
  --hair: rgba(29, 31, 32, 0.22);
  --hair-soft: rgba(29, 31, 32, 0.1);

  --color-accent: #009838;
  --color-accent-100: #eaf7ee;
  --color-accent-200: #cdecd8;
  --color-accent-300: #a3dcb8;
  --color-accent-400: #5cbd83;
  --color-accent-500: #009838;
  --color-accent-600: #008632;
  --color-accent-700: #00702a;
  --color-accent-800: #005a22;
  --color-accent-900: #003d17;

  --color-neutral-100: #f5f5f8;
  --color-neutral-200: #e7e7ea;
  --color-neutral-300: #d4d4d7;
  --color-neutral-500: #98989b;
  --color-neutral-700: #5d5d60;
  --color-neutral-900: #2b2b2d;

  --font-heading: 'Barlow Condensed', system-ui, sans-serif;
  --font-heading-weight: 600;
  --font-body: 'Barlow', system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; background: var(--color-bg); color: var(--color-text); }
body { font-family: var(--font-body); font-size: 15px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
#root { min-height: 100vh; }
a { color: var(--color-accent-700); text-decoration: none; }
a:hover { color: var(--color-accent-800); }
input, button, textarea, select { font-family: inherit; }
button { cursor: pointer; }
button:disabled { opacity: 0.45; cursor: not-allowed; }
img { display: block; max-width: 100%; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-thumb { background: rgba(29, 31, 32, 0.18); }
:focus { outline: none; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
::selection { background: color-mix(in srgb, var(--color-accent) 30%, transparent); }

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  line-height: 1.12; letter-spacing: -0.015em; margin: 0;
}
h1 { font-size: 46px; line-height: 1; }
h2 { font-size: 32px; }
h3 { font-size: 25px; }
h6 { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; }
p { margin: 0; }

.heading { font-family: var(--font-heading); font-weight: var(--font-heading-weight); }
.kicker {
  font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--color-accent-700);
}
.label-up { font-size: 10.5px; letter-spacing: 0.11em; text-transform: uppercase; color: rgba(29, 31, 32, 0.5); }
.muted { color: var(--muted); }
.ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* cartão com moldura de projeto: <div class="blueprint"><i class="corner tl"/><i class="corner tr"/><i class="corner bl"/><i class="corner br"/>…</div> */
.blueprint { position: relative; border: 1px solid var(--color-divider); border-radius: 0; background: transparent; }
.blueprint > .corner { position: absolute; width: 11px; height: 11px; color: rgba(29, 31, 32, 0.55); pointer-events: none; }
.blueprint > .corner::before, .blueprint > .corner::after { content: ''; position: absolute; background: currentColor; }
.blueprint > .corner::before { left: 5px; top: 0; width: 1px; height: 100%; }
.blueprint > .corner::after { top: 5px; left: 0; width: 100%; height: 1px; }
.blueprint > .corner.tl { top: -6px; left: -6px; }
.blueprint > .corner.tr { top: -6px; right: -6px; }
.blueprint > .corner.bl { bottom: -6px; left: -6px; }
.blueprint > .corner.br { bottom: -6px; right: -6px; }
.blueprint.clicavel { cursor: pointer; }
.blueprint.clicavel:hover { border-color: var(--color-accent); }

/* botões */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  font-size: 14px; letter-spacing: 0.04em; line-height: 1.2; color: var(--color-text);
  background: transparent; border: 1px solid var(--color-divider); border-radius: 0;
  padding: 7px 14px; min-height: 42px; text-decoration: none; white-space: nowrap;
}
.btn svg { display: block; }
.btn-primary { background: var(--color-accent); border-color: var(--color-accent); color: var(--paper); }
.btn-primary:hover { background: var(--color-accent-600); }
.btn-primary:active { background: var(--color-accent-700); }
.btn-secondary:hover { background: rgba(29, 31, 32, 0.07); }
.btn-secondary:active { background: rgba(29, 31, 32, 0.14); }
.btn-ink { background: var(--ink); border-color: var(--ink); color: var(--paper); }
.btn-ink:hover { background: #000; }
.btn-ghost { border-color: transparent; color: var(--color-accent-700); padding-inline: 4px; }
.btn-ghost:hover { background: rgba(0, 152, 56, 0.08); }
.btn-icon { width: 40px; height: 40px; min-height: 0; padding: 0; }
.btn-sm { min-height: 34px; padding: 0 12px; font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; }
.btn-link {
  border: 0; background: transparent; padding: 0; color: var(--color-accent-700);
  font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; display: inline-flex; gap: 6px; align-items: center;
}
.btn-link:hover { color: var(--color-accent-800); }

/* chips (filtros e seleções) */
.chip {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  min-height: 36px; padding: 0 14px; border: 1px solid rgba(29, 31, 32, 0.22);
  background: transparent; color: rgba(29, 31, 32, 0.65); border-radius: 0;
  font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;
}
.chip:hover { background: rgba(29, 31, 32, 0.05); }
.chip.on { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.chip.on.verde { background: var(--color-accent); border-color: var(--color-accent); }
.chip.texto { font-family: var(--font-body); font-weight: 400; text-transform: none; letter-spacing: 0; color: rgba(29, 31, 32, 0.7); }
.chip.texto.on { color: var(--paper); }
.chip .n { font-size: 11px; opacity: 0.7; }
.chip.fill { flex: 1; }

/* selo de situação */
.badge {
  display: inline-flex; align-items: center; font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; padding: 3px 8px; border: 1px solid; white-space: nowrap;
}

/* formulários */
.field > label, .form-label { display: block; font-size: 13px; margin-bottom: 6px; color: rgba(29, 31, 32, 0.72); }
.input {
  width: 100%; min-height: 44px; padding: 8px 10px; font: inherit; font-size: 14px;
  color: var(--color-text); caret-color: var(--color-accent); background: var(--color-surface);
  border: 1px solid var(--color-divider); border-radius: 0;
}
.input:hover { border-color: rgba(29, 31, 32, 0.45); }
.input:focus-visible { border-color: var(--color-accent); outline-offset: 0; }
.input.erro { border-color: var(--ink); }
textarea.input { min-height: 90px; resize: vertical; line-height: 1.45; }
select.input { appearance: auto; }
.erro-txt { font-size: 12px; color: var(--ink); margin-top: 4px; }

/* tabela */
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th {
  text-align: left; font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  font-size: 11.5px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(29, 31, 32, 0.55);
  padding: 7px 8px; border-bottom: 1px solid var(--color-divider);
}
.table td { padding: 8px; border-bottom: 1px solid rgba(29, 31, 32, 0.08); vertical-align: top; }

/* diversos */
.dashed { border: 1px dashed rgba(29, 31, 32, 0.28); color: rgba(29, 31, 32, 0.5); font-size: 13px; }
.hover-row:hover { background: var(--color-accent-100); }
.lista-row { display: flex; align-items: center; gap: 12px; min-height: 54px; border-bottom: 1px solid var(--hair-soft); }

/* toast */
@keyframes toastIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.toast {
  position: fixed; right: 28px; bottom: 28px; z-index: 70; max-width: 460px;
  background: var(--ink); color: var(--paper); padding: 13px 16px; font-size: 14px;
  animation: toastIn 0.22s ease-out; display: flex; gap: 10px; align-items: center;
}

/* estrutura: menu lateral + área principal */
.shell { min-height: 100vh; display: grid; grid-template-columns: 236px minmax(0, 1fr); }
.sidebar {
  position: sticky; top: 0; height: 100vh; border-right: 1px solid var(--color-divider);
  background: var(--color-surface); padding: 24px 14px 18px; display: flex; flex-direction: column; gap: 24px;
}
.nav-btn {
  display: flex; align-items: center; gap: 11px; min-height: 42px; padding: 0 12px; border: 0;
  border-left: 2px solid transparent; background: transparent; color: rgba(29, 31, 32, 0.72);
  text-align: left; font-family: var(--font-heading); font-weight: var(--font-heading-weight);
  font-size: 15px; letter-spacing: 0.05em; text-transform: uppercase; width: 100%;
}
.nav-btn:hover { background: var(--color-accent-100); }
.nav-btn.on { background: var(--color-accent-100); color: var(--color-accent-800); border-left-color: var(--color-accent); }
.main { min-width: 0; padding: 32px clamp(18px, 3vw, 44px) 72px; }
.page { display: flex; flex-direction: column; gap: 24px; max-width: 1280px; }

/* login */
.auth-wrap { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #dedee1;
  background-image: linear-gradient(rgba(29,31,32,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(29,31,32,.06) 1px, transparent 1px);
  background-size: 32px 32px; }
.auth-card { width: min(440px, 100%); background: var(--color-bg); padding: 28px 28px 26px; display: flex; flex-direction: column; gap: 18px; }

/* carregando */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner { width: 22px; height: 22px; border: 2px solid rgba(29, 31, 32, 0.15); border-top-color: var(--color-accent); border-radius: 50%; animation: spin 0.8s linear infinite; }

@media (max-width: 900px) {
  .shell { grid-template-columns: 1fr; }
  .sidebar { position: static; height: auto; }
  .main { padding: 20px 16px 60px; }
  h1 { font-size: 34px; }
}

/* ---------- complementos do Vital Financeiro ---------- */
.brand { display: flex; flex-direction: column; gap: 2px; padding: 0 12px; }
.brand b { font-family: var(--font-heading); font-weight: 600; font-size: 26px; letter-spacing: 0.02em; text-transform: uppercase; line-height: 1; }
.brand b span { color: var(--color-accent); }
.nav { display: flex; flex-direction: column; gap: 2px; }
.sidebar-foot { margin-top: auto; display: flex; flex-direction: column; gap: 10px; padding: 0 12px; font-size: 13px; }

.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.between { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.col { display: flex; flex-direction: column; gap: 14px; }
.card { padding: 20px; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 18px; }
.stat { padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; }
.stat .v { font-family: var(--font-heading); font-weight: 600; font-size: 30px; line-height: 1; }
.grid-2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.span-2 { grid-column: 1 / -1; }
.table-wrap { overflow-x: auto; }
.table td.num, .table th.num { text-align: right; white-space: nowrap; }
.table tr.clicavel { cursor: pointer; }
.nowrap { white-space: nowrap; }
.vazio { padding: 22px; text-align: center; }

.modal-back {
  position: fixed; inset: 0; z-index: 60; background: rgba(29, 31, 32, 0.5);
  display: grid; place-items: center; padding: 16px; overflow-y: auto;
}
.modal { background: var(--color-bg); width: min(560px, 100%); padding: 24px; display: flex; flex-direction: column; gap: 18px; max-height: calc(100vh - 32px); overflow-y: auto; }
.modal.largo { width: min(760px, 100%); }
.modal-foot { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.demo-bar { background: var(--ink); color: var(--paper); font-size: 13px; padding: 8px 12px; display: flex; flex-direction: column; gap: 8px; }
.demo-bar .chip { color: rgba(242, 242, 243, 0.75); border-color: rgba(242, 242, 243, 0.3); min-height: 28px; padding: 0 8px; font-size: 11px; }
.demo-bar .chip.on { background: var(--color-accent); border-color: var(--color-accent); color: var(--paper); }
.center-screen { min-height: 60vh; display: grid; place-items: center; }

@media (max-width: 900px) {
  .sidebar { padding: 16px 10px; gap: 14px; }
  .nav { flex-direction: row; flex-wrap: wrap; }
  .nav-btn { width: auto; min-height: 38px; font-size: 13px; padding: 0 10px; border-left: 0; border-bottom: 2px solid transparent; }
  .nav-btn.on { border-bottom-color: var(--color-accent); }
  .sidebar-foot { flex-direction: row; align-items: center; justify-content: space-between; flex-wrap: wrap; }
  .toast { left: 16px; right: 16px; bottom: 16px; }
}

.btn.ocupado { opacity: 0.45; cursor: not-allowed; }
label.btn { cursor: pointer; }

/* =====================================================================
   IDENTIDADE VITAL ESQUADRIAS E VIDROS
   Verde, branco e angular: verdes da marca, logotipo, títulos em
   sans geométrica extra-negrito e faixas diagonais (17°). Cantos retos.
   ===================================================================== */
:root {
  --verde-vital: #009635;
  --verde-medio: #026529;
  --verde-escuro: #00491e;
  --verde-claro: #93c763;
  --cinza-vital: #757575;

  --color-bg: #f4f6f4;
  --color-surface: #eef1ee;
  --color-divider: rgba(29, 31, 32, 0.14);

  --color-accent: #009635;
  --color-accent-100: #e8f5ec;
  --color-accent-200: #cfe9d7;
  --color-accent-300: #a5d8b5;
  --color-accent-400: #5cbd83;
  --color-accent-500: #009635;
  --color-accent-600: #027f2e;
  --color-accent-700: #026529;
  --color-accent-800: #00491e;
  --color-accent-900: #00331a;

  --font-heading: 'Plus Jakarta Sans', system-ui, sans-serif;
  --font-heading-weight: 800;
  --font-body: 'Plus Jakarta Sans', system-ui, sans-serif;
}

body { font-size: 14.5px; }
h1, h2, h3 { text-transform: uppercase; letter-spacing: -0.01em; }
h1 { font-size: 32px; line-height: 1.05; color: var(--verde-vital); }
h2 { font-size: 24px; }
h3 { font-size: 15px; letter-spacing: 0.05em; display: flex; align-items: center; gap: 10px; }
/* marca de seção: pequeno paralelogramo verde, na inclinação das faixas do "V" */
h3::before { content: ''; width: 7px; height: 16px; background: var(--verde-vital); transform: skewX(-17deg); flex: none; }
.modal h3::before { display: none; }

.kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: var(--cinza-vital); margin-bottom: 4px; }
.label-up { font-weight: 600; font-size: 10.5px; letter-spacing: 0.09em; color: var(--cinza-vital); }

/* cartões: brancos, borda fina, sem marcas nos cantos */
.blueprint { background: #fff; }
.blueprint > .corner { display: none; }
.modal, .auth-card { background: #fff; }

.btn { font-weight: 700; font-size: 13px; letter-spacing: 0.01em; }
.btn-sm { font-size: 11px; letter-spacing: 0.06em; }
.btn-link { font-weight: 700; font-size: 11.5px; letter-spacing: 0.08em; }
.chip { font-weight: 700; font-size: 11.5px; letter-spacing: 0.04em; background: #fff; }
.chip.on { background: var(--verde-vital); border-color: var(--verde-vital); color: #fff; }
.badge { font-weight: 700; font-size: 9.5px; letter-spacing: 0.08em; }
.table th { font-weight: 700; font-size: 10.5px; letter-spacing: 0.08em; color: var(--cinza-vital); }
.stat .v { font-weight: 800; font-size: 24px; letter-spacing: -0.02em; }
.input { background: #fff; }
.input:disabled { background: var(--color-surface); color: var(--cinza-vital); }
.dashed { background: rgba(255, 255, 255, 0.6); }

/* menu lateral: degradê verde-medio -> verde-escuro, logo branco e faixas translúcidas */
.sidebar {
  background: linear-gradient(165deg, var(--verde-medio) 0%, var(--verde-escuro) 100%);
  border-right: 0; color: #fff; overflow: hidden; isolation: isolate;
}
.sidebar::after {
  content: ''; position: absolute; z-index: -1; pointer-events: none;
  top: -15%; height: 130%; right: -150px; width: 230px; transform: skewX(-17deg);
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.06) 0 46px, transparent 46px 78px,
    rgba(255, 255, 255, 0.06) 78px 124px, transparent 124px 156px,
    rgba(255, 255, 255, 0.06) 156px 202px, transparent 202px);
}
.brand { gap: 8px; }
.brand img { width: 172px; height: auto; }
.brand .produto {
  font-weight: 800; font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--verde-claro);
}
.nav-btn { font-weight: 700; font-size: 12px; letter-spacing: 0.03em; white-space: nowrap; color: rgba(255, 255, 255, 0.8); }
.nav-btn:hover { background: rgba(255, 255, 255, 0.08); color: #fff; }
.nav-btn.on { background: rgba(255, 255, 255, 0.14); color: #fff; border-left-color: var(--verde-claro); }
.sidebar .label-up { color: rgba(255, 255, 255, 0.6); }
.sidebar .btn-link { color: var(--verde-claro); }
.sidebar .btn-link:hover { color: #fff; }
.sidebar :focus-visible { outline-color: #fff; }
.demo-bar { background: rgba(0, 0, 0, 0.28); }
.demo-bar .chip { background: transparent; }

/* login: fundo verde com as faixas da marca, cartão branco com o logo */
.auth-wrap {
  position: relative; overflow: hidden; isolation: isolate;
  background: linear-gradient(150deg, var(--verde-medio) 0%, var(--verde-escuro) 100%);
}
.auth-wrap::before, .auth-wrap::after {
  content: ''; position: absolute; z-index: -1; pointer-events: none; top: -20%; height: 140%; transform: skewX(-17deg);
}
.auth-wrap::before {
  left: 6%; width: 300px;
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.07) 0 64px, transparent 64px 112px,
    rgba(255, 255, 255, 0.07) 112px 176px, transparent 176px 224px,
    rgba(255, 255, 255, 0.07) 224px 288px, transparent 288px);
}
.auth-wrap::after {
  right: 4%; width: 200px;
  background: linear-gradient(90deg,
    rgba(147, 199, 99, 0.16) 0 44px, transparent 44px 78px,
    rgba(147, 199, 99, 0.16) 78px 122px, transparent 122px);
}
.auth-card { border: 0; padding: 34px 32px 30px; }
.auth-card .brand img { width: 220px; }
.auth-card .brand .produto { color: var(--verde-vital); }
.auth-card h2 { color: var(--verde-vital); }

/* área principal: fio verde no alto, como a faixa do papel timbrado */
.main { border-top: 4px solid var(--verde-vital); }

@media (max-width: 900px) {
  .sidebar { position: relative; }
  h1 { font-size: 26px; }
  .brand img { width: 150px; }
  .nav-btn { font-size: 11.5px; }
  .nav-btn.on { border-bottom-color: var(--verde-claro); }
  .sidebar-foot { padding-top: 4px; }
}
```

**Trechos de tela que usam o logo**

Menu lateral (`Shell.tsx`):

```tsx
<div className="brand">
  <img src="/logo-vital-branco.png" alt="Vital Esquadrias e Vidros" width={172} height={53} />
  <span className="produto">Financeiro</span>
</div>
```

Cartão de login (`Login.tsx`), dentro de `<div className="auth-wrap"><Blueprint className="auth-card">`:

```tsx
<div className="brand" style={{ padding: 0 }}>
  <img src="/logo-vital-cor.png" alt="Vital Esquadrias e Vidros" width={220} height={67} />
  <span className="produto">Financeiro</span>
</div>
```

---

## 4. Segurança: tudo isto é obrigatório

### 4.1 Chaves e segredos

- O site usa **somente a chave pública** do Supabase (anon / publishable), em `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, guardadas em `.env.local`.
- A chave secreta (`service_role` / secret key) **nunca** entra no código do site, no repositório nem na conversa.
- Senhas, tokens e chaves **nunca são colados no chat**. Eu mesmo digito no painel do Supabase ou do Netlify.
- `.gitignore` com `.env`, `.env.local`, `.env.*.local`, `node_modules`, `dist`, `.netlify`.

### 4.2 Login

- Login por e-mail e senha do Supabase Auth, senha com no mínimo 8 caracteres.
- **Sistema fechado:** ninguém se cadastra sozinho. O administrador cria o perfil (tabela `profiles` com e-mail, nome, papel, ativo). Um gatilho em `auth.users` recusa o cadastro de e-mail que não tenha perfil pré-criado e vincula o login ao perfil.
- Conta suspensa (`ativo = false`) perde o acesso na hora, porque as funções de permissão só enxergam perfis ativos.
- No painel do Supabase: ativar "Prevent use of leaked passwords" e manter a confirmação de e-mail ligada.

### 4.3 Banco de dados

- **RLS ligado em todas as tabelas.** Cada tabela tem políticas separadas de ver, criar, alterar e apagar, sempre `to authenticated`, baseadas no papel do usuário.
- Papéis em um tipo enumerado (no Vital Financeiro: Admin, Financeiro, Vendedor). Definir os papéis do site novo comigo antes de criar as políticas.
- Funções auxiliares `meu_perfil_id()` e `meu_papel()` como `security definer`, `stable`, com `set search_path = public`. Toda função criada leva `search_path` fixo.
- **O visitante sem login (papel `anon`) não tem permissão nenhuma**, mesmo com RLS:

```sql
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
revoke execute on all functions in schema public from public;
alter default privileges for role postgres in schema public revoke all on tables    from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;
alter default privileges for role postgres in schema public revoke execute on functions from public;
```

- Funções de gatilho não são executáveis por ninguém diretamente (`revoke execute ... from public, anon, authenticated`).
- **Gatilhos de proteção** para o que a política sozinha não cobre:
  - ninguém altera o próprio papel;
  - o último administrador ativo não pode ser rebaixado, suspenso nem excluído;
  - o vínculo do perfil com o login não pode ser editado à mão;
  - o campo "quem criou" de um registro só muda por Admin;
  - perfis de menor permissão só alteram os campos liberados para eles (o banco recusa o resto, não só a tela).
- Tabela de configuração com tokens internos (`app_config`): RLS ligado, **sem nenhuma política** e com `revoke all ... from anon, authenticated`. Só o servidor lê.
- Extensões (`pg_net`, `pg_cron` etc.) instaladas no schema `extensions`, nunca no `public`.
- Depois de cada mudança no banco, rodar o verificador de segurança do Supabase (Security Advisor) e corrigir os avisos.

### 4.4 Arquivos

- Buckets **privados**, com limite de tamanho por arquivo (25 MB no Vital Financeiro).
- Caminho do arquivo começa com o id do registro dono, e as políticas do storage checam se o usuário pode ver esse registro.
- O site abre arquivos por **link assinado com validade de 1 hora**. Documentos são forçados a **baixar** em vez de abrir no navegador (opção `download` do link assinado).

### 4.5 Funções de servidor (Edge Functions), se houver

- Toda função confere quem chamou: login válido com papel permitido, ou token interno guardado em `app_config`.
- Token comparado em **tempo constante**. Entradas validadas (por exemplo, id no formato UUID) antes de qualquer consulta.
- Respostas de erro sem detalhes internos. Chaves de serviços externos ficam nos "Secrets" da função, nunca no código.

### 4.6 Site (cabeçalhos no `netlify.toml`)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests"
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    Cross-Origin-Opener-Policy = "same-origin"
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

- Nenhum script de terceiros. Nada de `dangerouslySetInnerHTML` nem HTML montado com texto do usuário.
- Links externos com `rel="noreferrer"`.
- Se o site precisar de câmera, localização ou outro serviço externo, ajustar a `Permissions-Policy` e a `Content-Security-Policy` só no que for necessário.
- `npm audit` sem vulnerabilidades antes de publicar.

### 4.7 Conferência final de segurança

Antes de dizer que está pronto, testar e me mostrar o resultado:

1. Consulta sem login em cada tabela devolve vazio ou erro de permissão.
2. Cada papel só vê e altera o que deveria (testar um usuário de cada papel).
3. E-mail sem perfil não consegue criar conta.
4. Função de servidor responde 401 com token errado e sem login.
5. Cabeçalhos de segurança aparecem na resposta do site publicado.
6. Security Advisor do Supabase sem avisos pendentes, ou com cada aviso restante explicado.

---

## 5. Como trabalhar comigo

- Mostrar o que vai fazer antes, em uma linha, e no fim um resumo curto do que foi feito e do que falta.
- Testar no modo demonstração antes de pedir para publicar.
- **Nada vai para produção sem eu responder "pode publicar"**: publicação no Netlify, mudança no banco e Edge Function pedem meu OK a cada vez.
- Mudança no banco sempre em arquivo de migração com data no nome, que possa rodar mais de uma vez sem quebrar.
- Guardar cada etapa em um commit do git, com mensagem em português.
- Não apagar dados reais em testes.
- Se algo não foi testado, dizer claramente que não foi.
- **Publicação pelo GitHub:** o Netlify publica sozinho a cada envio para a branch. Para guardar código sem publicar, incluir `[skip netlify]` na mensagem do commit. Mudança no banco sempre vai antes do site.
- No Netlify, desligar o selo "Powered by Netlify badge" (ele injeta um script na página) e deixar o site principal sem exigir login da equipe do Netlify.

## 6. Primeiro passo

Leia tudo, faça as perguntas que faltarem sobre a seção 1 (papéis, telas, dados) e me proponha: a lista de telas, as tabelas do banco e quem pode o quê em cada uma. Só comece a programar depois que eu aprovar essa proposta.


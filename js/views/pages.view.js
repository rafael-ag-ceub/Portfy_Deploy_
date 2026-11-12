/* =====================================================================
   PORTFY · js/views/pages.view.js
   Camada: View
   render() olha a variável "page" e chama a função da tela aberta.
   Cada tela tem o seu arquivo de view (dash, projects, models, files,
   notes, calendar, profile, billing, chat). Aqui ficam só o roteamento
   e os pedaços comuns (cabeçalho de página, estado vazio).
   ===================================================================== */

/** Cabeçalho de página: título grande, uma linha de apoio (sub) e ações à direita. */
const ph = (t, b = '', sub = '') =>
  `<header class="ph"><div class="ph-t">${sub ? `<span class="eyebrow">${sub}</span>` : ''}<h1>${t}</h1></div><div class="ph-a">${b}</div></header>`;

/** Estado vazio com ícone, texto e (opcional) um botão de ação. */
const emp = (t, ic = 'sparkles', act = '') => `<div class="emp">${ico(ic)}<p>${t}</p>${act}</div>`;

/** Botão principal de criação, usado nos cabeçalhos. */
const btn = (t, k, ic = 'plus') =>
  `<button class="btn p" onclick="openM('${k}')">${ico(ic)}${t}</button>`;

/** Títulos das telas (migalhas e busca). */
const PAGE_TITLE = {
  dash: 'Início',
  proj: 'Projetos',
  mod: 'Modelos',
  por: 'Meus arquivos',
  notas: 'Notas',
  cal: 'Calendário',
  age: 'Agenda',
  ia: 'Agente de IA',
  plan: 'Planos',
  perf: 'Perfil',
  cfg: 'Configurações',
};

/** Texto do campo de busca de cada tela. */
const PAGE_SEARCH = {
  dash: 'Filtrar tarefas e compromissos…',
  proj: 'Filtrar projetos…',
  mod: 'Buscar modelos…',
  por: 'Filtrar arquivos…',
  notas: 'Filtrar notas…',
  cal: 'Buscar compromissos…',
  age: 'Filtrar compromissos…',
  ia: 'Buscar nas conversas…',
  plan: 'Buscar…',
  perf: 'Buscar…',
  cfg: 'Buscar…',
};

function render() {
  if (!me || !D) return;
  if (!PAGE_TITLE[page]) page = 'dash';
  const q = ($('#q').value || '').toLowerCase();
  const fn = {
    dash: pgDash,
    proj: pgProj,
    mod: pgMod,
    por: pgFiles,
    notas: pgNotes,
    cal: pgCal,
    age: pgAgenda,
    ia: pgChat,
    plan: pgPlan,
    perf: pgProfile,
    cfg: pgSettings,
  }[page];
  $('#pc').innerHTML = `<section class="pg-in" data-page="${page}">${fn(q)}</section>`;
  $('#pc').classList.toggle('chat', page === 'ia');
  $('#q').placeholder = PAGE_SEARCH[page] || 'Filtrar…';
  $('#tb-s').classList.toggle('hot', false);
  shellDraw();
  fitThumbs();
  if (page === 'ia') chatAfterRender();
  if (page === 'perf') skDraw();
  if (page === 'mod') edLoadFonts();
}

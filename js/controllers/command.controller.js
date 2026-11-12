/* =====================================================================
   PORTFY · js/controllers/command.controller.js
   Camada: Controller
   Busca e comandos (Ctrl+K ou ⌘K), menu "Novo", notificações e o
   fechamento dos menus flutuantes. Teclado: ↑ ↓ escolhem, Enter abre, Esc fecha.
   ===================================================================== */

const CK = { items: [], i: 0 };

/* ---------- Busca e comandos ---------- */
function cmdkOpen() {
  closePops();
  $('#cmdk-ov').classList.add('on');
  $('#cmdk-q').value = '';
  CK.i = 0;
  cmdkDraw();
  setTimeout(() => $('#cmdk-q').focus(), 30);
}
function cmdkClose() {
  $('#cmdk-ov').classList.remove('on');
}

function cmdkDraw() {
  const q = $('#cmdk-q').value;
  CK.items = cmdkItems(q);
  CK.i = Math.min(CK.i, Math.max(0, CK.items.length - 1));
  $('#cmdk-list').innerHTML =
    cmdkListHTML(CK.items, CK.i) ||
    `<div class="cmdk-e">Nada encontrado para “${esc(q)}”. Tente outra palavra.</div>`;
  cmdkScroll();
}
function cmdkMark() {
  $$('#cmdk-list .cmdk-i').forEach((b, i) => {
    const on = i === CK.i;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  cmdkScroll();
}
function cmdkHover(i) {
  CK.i = i;
  cmdkMark();
}
function cmdkScroll() {
  const b = $(`#cmdk-list .cmdk-i[data-i="${CK.i}"]`);
  if (b && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' });
}
function cmdkRun(i) {
  const it = CK.items[i];
  if (!it) return;
  cmdkClose();
  it.run();
}
function cmdkKey(ev) {
  if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    CK.i = Math.min(CK.items.length - 1, CK.i + 1);
    cmdkMark();
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    CK.i = Math.max(0, CK.i - 1);
    cmdkMark();
  } else if (ev.key === 'Enter') {
    ev.preventDefault();
    cmdkRun(CK.i);
  } else if (ev.key === 'Escape') {
    ev.preventDefault();
    cmdkClose();
  }
}

/* ---------- Menus flutuantes (Novo e notificações) ---------- */
/** Posiciona um menu logo abaixo do botão que o abriu, alinhado à direita. */
function popPlace(p, btn) {
  const r = btn.getBoundingClientRect();
  p.style.top = Math.round(r.bottom + 8) + 'px';
  p.style.right = Math.max(12, Math.round(innerWidth - r.right)) + 'px';
  p.style.left = 'auto';
}

function closePops() {
  ['#pop-new', '#pop-notif'].forEach((s) => {
    const p = $(s);
    if (p) p.classList.remove('on');
  });
  const nb = $('#new-btn'),
    bb = $('#bell');
  if (nb) nb.setAttribute('aria-expanded', 'false');
  if (bb) bb.setAttribute('aria-expanded', 'false');
}
function popClose() {
  closePops();
}

/** Executa uma ação de um menu e o fecha. */
function popRun(fn) {
  closePops();
  fn();
}

function newMenu(ev) {
  ev.stopPropagation();
  const p = $('#pop-new'),
    btn = $('#new-btn'),
    abrir = !p.classList.contains('on');
  closePops();
  if (!abrir) return;
  p.innerHTML = newMenuHTML();
  popPlace(p, btn);
  p.classList.add('on');
  btn.setAttribute('aria-expanded', 'true');
}

function notif(ev) {
  ev.stopPropagation();
  const p = $('#pop-notif'),
    btn = $('#bell'),
    abrir = !p.classList.contains('on');
  closePops();
  if (!abrir) return;
  p.innerHTML = notifHTML();
  popPlace(p, btn);
  p.classList.add('on');
  btn.setAttribute('aria-expanded', 'true');
}

/** Criar nota a partir do menu: abre a tela de notas e cria uma nova. */
function ntNewFromMenu() {
  if (page !== 'notas') go('notas');
  ntNew();
}

/* Cliques dentro dos menus não os fecham; clique fora fecha tudo. */
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('.pop')) closePops();
});
['#pop-new', '#pop-notif'].forEach((s) => {
  const p = $(s);
  if (p) p.addEventListener('click', (e) => e.stopPropagation());
});
addEventListener('resize', () => closePops());

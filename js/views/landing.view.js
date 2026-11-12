/* =====================================================================
   PORTFY · js/views/landing.view.js
   Camada: View
   Partes da landing geradas com os mesmos dados do aplicativo: miniaturas
   reais dos modelos (com filtro por categoria), a vitrine de elementos e
   os pacotes à venda. Assim o site mostra exatamente o que a pessoa recebe.
   ===================================================================== */

/** Modelos em destaque na landing (ordem de exibição). */
const LAND_MODELS = [
  'curriculo-profissional',
  'portfolio-criativo',
  'carta-apresentacao',
  'linkedin-post',
  'case-de-projeto',
  'apresentacao-pitch',
  'curriculo-moderno',
  'portfolio-tech',
];
let LANDF = 'todos';

function renderLanding() {
  const cats = $('#land-cats');
  if (cats)
    cats.innerHTML = CATS.map(
      ([k, t]) =>
        `<button type="button" role="tab" aria-selected="${LANDF === k ? 'true' : 'false'}" class="${LANDF === k ? 'on' : ''}" onclick="landFilter('${k}')">${t}</button>`
    ).join('');

  const list = $('#land-models');
  if (list) {
    const ids = LAND_MODELS.filter(
      (id) => LANDF === 'todos' || (modelById(id) || {}).cat === LANDF
    );
    const pool = LANDF === 'todos' ? ids : MODELS.filter((m) => m.cat === LANDF).map((m) => m.id);
    list.innerHTML =
      pool
        .slice(0, 8)
        .map((id) => {
          const m = modelById(id);
          return `<article class="mdl-card"><div class="th-w">${thumb(buildDoc(id, { nameOnly: true }))}${m.plan === 'B' ? `<span class="pro-t">${ico('star')}Pro</span>` : ''}</div>
        <div class="tx"><b>${esc(m.name)}</b><small>${esc(m.desc)}</small></div></article>`;
        })
        .join('') || `<p class="hint">Nenhum modelo nesta categoria ainda.</p>`;
  }

  const els = $('#land-els');
  if (els) {
    const sample = [
      'rect',
      'ellipse',
      'tri',
      'star',
      'ic-rocket',
      'pf-burst',
      'ic-heart',
      'pf-sparkle',
      'ic-check-circle',
      'pf-ribbon',
      'px-seal',
      'st-orbit',
      'cr-blob',
      'dt-bars',
    ];
    els.innerHTML = sample
      .map((id) => {
        const x = EL_BY[id] || EL_BY['rect'];
        const inner =
          x.spec.k === 'svg'
            ? elSVG(x.spec.ref, x.spec.bg)
            : `<span class="el-raw" style="background:${x.spec.bg};border-radius:${x.spec.k === 'ellipse' ? '50%' : (x.spec.r || 0) + 'px'}"></span>`;
        const tag =
          x.tier === 'free'
            ? ''
            : `<span class="lk-b" title="${elTierLabel(x.tier)}">${ico(x.tier === 'pro' ? 'star' : 'lock')}</span>`;
        return `<div class="el-tile" title="${esc(x.name)}"><span class="el-i">${inner}</span>${tag}</div>`;
      })
      .join('');
  }

  const packs = $('#land-packs');
  if (packs)
    packs.innerHTML = PACKS.map(
      (p) => `<article class="pk-card">
      <div class="pk-top"><b>${p.name}</b><span class="chip n">${packCount(p.code)} itens</span></div>
      <p>${p.desc}</p>
      <div class="pk-f"><span class="pk-p">${brl(p.price)}</span><small>pagamento único · ou incluso no Premium</small></div>
    </article>`
    ).join('');

  const fe = $('#fact-els');
  if (fe) fe.textContent = EL_LIB.length + '+';
}

function landFilter(k) {
  LANDF = k;
  renderLanding();
  fitThumbs();
}

/* =====================================================================
   PORTFY · js/views/editor.view.js
   Camada: View
   Desenho do editor: página, painel de propriedades, camadas, a gaveta
   de ferramentas (Elementos, Texto, Anexos, Fundo) e o zoom.
   As ações ficam em js/controllers/editor.controller.js.
   ===================================================================== */

/* ---------- Página ---------- */
function edFit() {
  const d = Ed.doc,
    st = $('#ed-stage');
  if (!d || !st) return;
  const fit = Math.min((st.clientWidth - 56) / d.w, (st.clientHeight - 56) / d.h, 1);
  Ed.fitScale = Math.max(0.05, fit);
  Ed.scale = Ed.zoom ? Ed.zoom : Ed.fitScale;
  const w = $('#ed-wrap');
  w.style.width = d.w * Ed.scale + 'px';
  w.style.height = d.h * Ed.scale + 'px';
  $('#ed-zoom').textContent = Math.round(Ed.scale * 100) + '%';
  edRender();
}

function edRender() {
  const d = Ed.doc,
    pg = $('#ed-page');
  if (!d || !pg) return;
  pg.style.cssText = `width:${d.w}px;height:${d.h}px;background:${d.bg};transform:scale(${Ed.scale})`;
  pg.classList.toggle('grid', !!Ed.grid);
  pg.innerHTML =
    d.els.map((e) => elHTML(e, true)).join('') +
    '<div class="gd gv" id="gd-v"></div><div class="gd gh" id="gd-h"></div>';
  document.documentElement.style.setProperty('--hs', (1 / Ed.scale).toFixed(3)); // alças com tamanho constante na tela
  edBtns();
  if (Ed.tab === 'layers') edLayers();
  const gb = $('#ed-grid-b');
  if (gb) gb.classList.toggle('on', !!Ed.grid);
}

/** Estado dos botões desfazer / refazer. */
function edBtns() {
  $('#ed-undo').disabled = Ed.hi <= 0;
  $('#ed-redo').disabled = Ed.hi >= Ed.hist.length - 1;
}

/* ---------- Gaveta de ferramentas (coluna ao lado da régua) ---------- */
const EDT_TITLE = { el: 'Elementos', tx: 'Texto', im: 'Anexos', bg: 'Fundo' };

/** Abre, troca ou fecha a gaveta. Sem nome, ou o mesmo nome aberto = fecha. */
function edDrawer(name) {
  Ed.tool = !name || Ed.tool === name ? null : name;
  $('#ed-body').classList.toggle('dr-open', !!Ed.tool);
  $$('.ed-tool[data-tool]').forEach((b) => {
    const on = b.dataset.tool === Ed.tool;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  if (Ed.tool) {
    $('#ed-dr-t').textContent = EDT_TITLE[Ed.tool];
    $('#ed-dr-b').innerHTML = edDrawerHTML(Ed.tool);
    if (Ed.tool === 'el') {
      const q = $('#ed-el-q');
      if (q) q.focus();
    }
  }
  edFit();
}

function edDrawerHTML(t) {
  if (t === 'el') return edElementsHTML('');
  if (t === 'tx') return edTextHTML();
  if (t === 'im') return edAttachHTML();
  if (t === 'bg') return edBgHTML();
  return '';
}

/* -- Elementos: busca, categorias, pacotes -- */
function edElementsHTML(q) {
  const plan = (PL[D.plan] || PL.A)[0];
  const term = (q || '').toLowerCase();
  const tile = (x) => {
    const ok = elAllowed(x.tier);
    const badge =
      x.tier === 'free'
        ? ''
        : ok
          ? `<span class="lk pro" title="Liberado para você">${ico('check')}</span>`
          : `<span class="lk" title="Disponível no ${elTierLabel(x.tier)}">${ico('lock')}</span>`;
    return `<button type="button" class="ed-el ${ok ? '' : 'lk-off'}" onclick="edAddLib('${x.id}')" aria-label="Adicionar ${esc(x.name)}${ok ? '' : ' (bloqueado no seu plano)'}" title="${esc(x.name)}${x.tier === 'free' ? '' : ' · ' + elTierLabel(x.tier)}">
        <span class="ed-el-i">${x.spec.k === 'svg' ? elSVG(x.spec.ref, x.spec.bg) : ''}${x.spec.k !== 'svg' ? `<span class="ed-el-raw" style="background:${x.spec.bg};border-radius:${x.spec.k === 'ellipse' ? '50%' : (x.spec.r || 0) + 'px'}"></span>` : ''}</span>
        ${badge}</button>`;
  };
  const cats = EL_CATS.map(([c, t]) => {
    const items = EL_LIB.filter(
      (x) => x.cat === c && (!term || x.name.toLowerCase().includes(term))
    );
    if (!items.length) return '';
    return `<div class="ed-cat-h"><b>${t}</b><span class="hint">${items.length}</span></div><div class="ed-grid-el">${items.map(tile).join('')}</div>`;
  }).join('');
  const packs = !term
    ? `<div class="ed-cat-h"><b>Pacotes</b><span class="hint">à parte</span></div>${PACKS.map(
        (p) => {
          const owned = elAllowed('pack:' + p.code);
          return `<div class="ed-pk-card"><div class="pk-h"><b>${p.name}</b><span class="chip ${owned ? 'ok' : 'n'}">${owned ? 'Liberado' : brl(p.price)}</span></div>
        <p>${p.desc}</p>
        ${owned ? `<span class="hint">${packCount(p.code)} itens disponíveis neste arquivo.</span>` : `<button type="button" class="btn sm p" onclick="openCheckout('pk:${p.code}')">${ico('package')}Comprar pacote</button>`}</div>`;
        }
      ).join('')}`
    : '';
  return `<div class="ed-search">${ico('search')}<input id="ed-el-q" class="inp" placeholder="Buscar formas, ícones e adesivos" value="${esc(q || '')}" oninput="edElSearch(this.value)" aria-label="Buscar elementos"></div>
    <p class="hint">Seu plano: <b>${plan}</b>. Itens com cadeado ficam disponíveis em um plano superior ou em pacotes.</p>
    <div class="ed-el-list" id="ed-el-list">${cats || '<p class="hint">Nenhum elemento encontrado.</p>'}${packs}</div>`;
}

function edElSearch(v) {
  const cur = $('#ed-el-q');
  const pos = cur ? cur.selectionStart : null;
  $('#ed-dr-b').innerHTML = edElementsHTML(v);
  const q = $('#ed-el-q');
  if (q) {
    q.focus();
    if (pos !== null) q.setSelectionRange(pos, pos);
  }
}

/** Botões da barra à esquerda (Elementos, Texto, Anexos, Fundo). */
const edTool = (name) => edDrawer(name);

/* -- Texto: presets e pares de fontes -- */
function edTextHTML() {
  const presets = [
    ['title', 'Título', 'Grande e de destaque'],
    ['subtitle', 'Subtítulo', 'Para separar seções'],
    ['text', 'Texto', 'Parágrafo de corpo'],
    ['caption', 'Legenda', 'Pequeno, para detalhes'],
  ]
    .map(
      ([k, t, d]) =>
        `<button type="button" class="tx-p" onclick="edAdd('text','${k}')"><b style="font-family:'${TEXT_PRESETS[k].ff}';font-weight:${TEXT_PRESETS[k].fw};font-size:${Math.min(22, TEXT_PRESETS[k].fs * 0.4)}px">${t}</b><small>${d}</small></button>`
    )
    .join('');
  const pairs = Object.entries(FONT_PAIRS)
    .map(
      ([k, v]) =>
        `<button type="button" class="pair-b" onclick="edApplyPair('${k}')"><span><b style="font-family:'${v[1]}'">${v[0]}</b><small style="font-family:'${v[2]}'">${v[1]} + ${v[2]}</small></span>${ico('chev-right')}</button>`
    )
    .join('');
  return `<div class="ed-dr-sec"><h5>Adicionar texto</h5><div class="stack">${presets}</div></div>
    <div class="ed-dr-sec"><h5>Pares de fontes</h5><p class="hint">Aplica a fonte de título e de texto em todo o arquivo.</p><div class="stack">${pairs}</div></div>`;
}

/* -- Anexos: biblioteca de imagens e PDFs -- */
function edAttachHTML() {
  const files = D.files || [];
  const list = files
    .map((f) => {
      const pdf = f.type === 'application/pdf',
        url = fileUrl(f);
      return `<button type="button" class="att-i" onclick="libInsert('${f.id}')" aria-label="Inserir ${esc(f.name)}" title="${esc(f.name)}">
      ${pdf ? `<span class="att-pdf">${ico('pdf')}<b>PDF</b></span>` : `<img src="${esc(url)}" alt="" loading="lazy">`}<small>${esc(f.name)}</small></button>`;
    })
    .join('');
  return `<div class="ed-dr-sec"><h5>Enviar uma imagem</h5><p class="hint">PNG, JPG, WEBP ou GIF. A imagem é reduzida automaticamente para ficar leve.</p>
      <button type="button" class="btn p bl" onclick="$('#ed-file').click()">${ico('upload')}Escolher imagem</button></div>
    <div class="ed-dr-sec"><h5>Minha biblioteca</h5>${
      files.length ? `<div class="att-g">${list}</div>` : `<p class="hint">Nenhum anexo ainda.</p>`
    }
      <button type="button" class="btn sm" onclick="openLib('editor')">${ico('paperclip')}Gerenciar anexos</button></div>`;
}

/* -- Fundo: cores sólidas e degradês -- */
const BG_GRADS = [
  ['Brand', 'linear-gradient(135deg,#2453D6,#4C8CF5)'],
  ['Pôr do sol', 'linear-gradient(160deg,#F2643A,#FF9E6B)'],
  ['Oceano', 'linear-gradient(150deg,#0A1A3F,#2F5BEA)'],
  ['Menta', 'linear-gradient(140deg,#E6FBF6,#B9F2E4)'],
  ['Lavanda', 'linear-gradient(140deg,#F4F0FF,#D9CCFF)'],
  ['Noite', 'linear-gradient(160deg,#0B1020,#24335E)'],
];
function edBgHTML() {
  const solid = [
    '#FFFFFF',
    '#F5F6FA',
    '#0A1A3F',
    '#0B1020',
    '#2F5BEA',
    '#14A38B',
    '#F2643A',
    '#F59E0B',
    '#8B5CF6',
    '#FFF8E7',
  ]
    .map(
      (c) =>
        `<button type="button" class="sw-s" style="background:${c}" onclick="edSetBg('${c}')" aria-label="Fundo ${c}" title="${c}"></button>`
    )
    .join('');
  const grads = BG_GRADS.map(
    ([n, g]) =>
      `<button type="button" class="bg-s" style="background:${g}" onclick="edAddBg('${g}')" aria-label="Degradê ${n}" title="${n}"><span>${n}</span></button>`
  ).join('');
  return `<div class="ed-dr-sec"><h5>Cor sólida</h5><div class="sw-g">${solid}</div>
      <div class="pr"><label for="ed-bg-cor">Outra cor</label><input id="ed-bg-cor" type="color" value="${hex(Ed.doc.bg)}" oninput="edSetBg(this.value,true)"></div></div>
    <div class="ed-dr-sec"><h5>Degradês</h5><p class="hint">Adicionam uma camada de fundo do tamanho da página. Depois você pode mover ou apagar.</p><div class="bg-g">${grads}</div></div>`;
}

/* ---------- Painel da direita (camadas e propriedades) ---------- */
const edLayerName = (e) =>
  e.name ||
  (e.k === 'text'
    ? (e.txt || 'Texto').split('\n')[0].slice(0, 22)
    : LAYER_NAMES[e.k] || 'Elemento');
const edLayerIcon = (e) => LAYER_ICON[e.k] || 'square';

function edLayers() {
  const L = [...Ed.doc.els].reverse();
  $('#ed-panel').innerHTML = `<div class="ly" role="list">${
    L.map(
      (
        e,
        i
      ) => `<div class="ly-r ${Ed.sel === e.id ? 'on' : ''} ${e.hid ? 'off' : ''}" role="listitem" onclick="edSelect(${e.id})" tabindex="0" onkeydown="if(event.key==='Enter')edSelect(${e.id})">
      ${ico(edLayerIcon(e))}<span>${esc(edLayerName(e))}</span>
      <button type="button" title="${e.hid ? 'Mostrar' : 'Ocultar'}" aria-label="${e.hid ? 'Mostrar' : 'Ocultar'} camada" onclick="event.stopPropagation();edToggle(${e.id},'hid')">${ico(e.hid ? 'eye-off' : 'eye')}</button>
      <button type="button" title="${e.lock ? 'Destravar' : 'Travar'}" aria-label="${e.lock ? 'Destravar' : 'Travar'} camada" onclick="event.stopPropagation();edToggle(${e.id},'lock')">${ico(e.lock ? 'lock' : 'unlock')}</button>
      <button type="button" title="Subir" aria-label="Subir camada" ${i === 0 ? 'disabled' : ''} onclick="event.stopPropagation();edMoveLayer(${e.id},1)">${ico('chev-up')}</button>
      <button type="button" title="Descer" aria-label="Descer camada" ${i === L.length - 1 ? 'disabled' : ''} onclick="event.stopPropagation();edMoveLayer(${e.id},-1)">${ico('chev-down')}</button>
    </div>`
    ).join('') ||
    '<p class="hint">A página ainda está vazia. Use a barra da esquerda para adicionar texto, formas, ícones ou imagens.</p>'
  }</div>`;
}

function edProps() {
  $$('.ed-tabs button').forEach((b) => {
    const on = b.dataset.t === Ed.tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (Ed.tab === 'layers') return edLayers();
  const e = edEl(),
    d = Ed.doc;
  const row = (l, c) => `<div class="pr"><label>${l}</label>${c}</div>`;
  const num = (k, v, min, max, step = 1) =>
    `<input class="inp" type="number" min="${min}" max="${max}" step="${step}" value="${Math.round(v * 100) / 100}" onchange="edSet('${k}',+this.value,true)" aria-label="${k}">`;
  const col = (k, v) =>
    `<input type="color" value="${hex(v)}" oninput="edSet('${k}',this.value)" onchange="edSet('${k}',this.value,true)" aria-label="Cor">`;
  const tog = (k, on, label, title) =>
    `<button type="button" class="${on ? 'on' : ''}" title="${title || label}" aria-pressed="${on ? 'true' : 'false'}" onclick="edSet('${k}',${on ? 'false' : 'true'},true)">${label}</button>`;
  let h = '';
  if (!e) {
    const sizes = PAGE_SIZES.map(
      (s) =>
        `<option value="${s[1]}x${s[2]}" ${d.w === s[1] && d.h === s[2] ? 'selected' : ''}>${s[0]} · ${s[1]}×${s[2]}</option>`
    ).join('');
    h =
      `<h4>Página</h4>` +
      row(
        'Cor de fundo',
        `<input type="color" value="${hex(d.bg)}" oninput="Ed.doc.bg=this.value;edRender();edSave()" aria-label="Cor de fundo">`
      ) +
      row(
        'Tamanho',
        `<select class="inp" onchange="edPageSize(this.value)" aria-label="Tamanho da página">${sizes}${PAGE_SIZES.some((s) => d.w === s[1] && d.h === s[2]) ? '' : `<option selected>Personalizado · ${d.w}×${d.h}</option>`}</select>`
      ) +
      `<div class="pr2">${row('Largura', `<input class="inp" type="number" min="200" max="4000" value="${d.w}" onchange="edPageSize(this.value+'x${d.h}')">`)}${row('Altura', `<input class="inp" type="number" min="200" max="4000" value="${d.h}" onchange="edPageSize('${d.w}x'+this.value)">`)}</div>` +
      row(
        'Ajudas',
        `<div class="seg">${tog2('Grade', Ed.grid, 'edGrid()')}${tog2('Guias', Ed.snap !== false, 'edSnapToggle()')}</div>`
      ) +
      '<p class="hint">Clique em um elemento para editar. Dois cliques em um texto para digitar. Arraste os cantos para redimensionar e a bolinha de cima para girar.</p>' +
      '<div class="ed-note"><b>Atalhos</b><span><kbd>Ctrl</kbd>+<kbd>Z</kbd> desfaz</span><span><kbd>Ctrl</kbd>+<kbd>D</kbd> duplica</span><span><kbd>Ctrl</kbd>+<kbd>C</kbd>/<kbd>V</kbd> copia e cola</span><span><kbd>Setas</kbd> movem 1 px (Shift: 10 px)</span></div>';
  } else {
    h = `<div class="ed-prop-h"><h4>${esc(edLayerName(e))}</h4><span class="chip n">${esc(LAYER_NAMES[e.k] || 'Elemento')}</span></div>`;
    if (e.k === 'text') {
      h +=
        row(
          'Fonte',
          `<select class="inp" onchange="edSet('ff',this.value,true)" aria-label="Fonte">${FONTS.map((f) => `<option ${f === e.ff ? 'selected' : ''}>${f}</option>`).join('')}</select>`
        ) +
        `<div class="pr2">${row('Tamanho', num('fs', e.fs, 6, 400))}${row('Cor', col('color', e.color))}</div>` +
        row(
          'Estilo',
          `<div class="seg">${tog('fw', e.fw >= 700, '<b>B</b>', 'Negrito')
            .replace(`edSet('fw',false`, `edSet('fw',400`)
            .replace(
              `edSet('fw',true`,
              `edSet('fw',700`
            )}${tog('it', e.it, '<i>I</i>', 'Itálico')}${tog('ul', e.ul, '<u>U</u>', 'Sublinhado')}${tog('up', e.up, 'Aa', 'Maiúsculas')}</div>`
        ) +
        row(
          'Alinhamento',
          `<div class="seg">${['left', 'center', 'right'].map((a) => `<button type="button" class="${e.ta === a ? 'on' : ''}" onclick="edSet('ta','${a}',true)">${{ left: 'Esq.', center: 'Centro', right: 'Dir.' }[a]}</button>`).join('')}</div>`
        ) +
        `<div class="pr2">${row('Entrelinha', num('lh', e.lh || 1.3, 0.8, 3, 0.1))}${row('Espaço entre letras', num('ls', e.ls || 0, -5, 40, 0.5))}</div>` +
        row(
          'Destaque (fundo)',
          `<div class="seg">${e.bg ? col('bg', e.bg) : ''}<button type="button" onclick="edSet('bg',${e.bg ? 'null' : "'#FDE68A'"},true)">${e.bg ? 'Remover' : 'Adicionar'}</button></div>`
        ) +
        `<div class="seg"><button type="button" onclick="edFitText()">Ajustar altura ao texto</button></div>`;
    }
    if (e.k === 'rect' || e.k === 'ellipse' || POLY[e.k] || e.k === 'svg') {
      h += row(e.k === 'svg' ? 'Cor' : 'Preenchimento', col('bg', e.bg));
      if (e.k === 'rect')
        h += row(
          'Arredondamento',
          `<input type="range" min="0" max="200" value="${e.r || 0}" oninput="edSet('r',+this.value)" aria-label="Arredondamento">`
        );
    }
    if (e.k === 'img') {
      h +=
        row(
          'Ajuste da imagem',
          `<div class="seg">${[
            ['cover', 'Preencher'],
            ['contain', 'Conter'],
            ['fill', 'Esticar'],
          ]
            .map(
              ([v, t]) =>
                `<button type="button" class="${(e.fit || 'cover') === v ? 'on' : ''}" onclick="edSet('fit','${v}',true)">${t}</button>`
            )
            .join('')}</div>`
        ) +
        row(
          'Arredondamento',
          `<input type="range" min="0" max="300" value="${e.r || 0}" oninput="edSet('r',+this.value)" aria-label="Arredondamento">`
        ) +
        `<div class="seg"><button type="button" onclick="$('#ed-file-rep').click()">Trocar imagem</button></div>`;
    }
    h +=
      '<h5>Posição e tamanho</h5>' +
      `<div class="pr2">${row('X', num('x', e.x, -5000, 9000))}${row('Y', num('y', e.y, -5000, 9000))}${row('Largura', num('w', e.w, 4, 6000))}${row('Altura', num('h', e.h, 4, 6000))}</div>` +
      row(
        'Rotação (graus)',
        `<input type="range" min="-180" max="180" value="${e.rot || 0}" oninput="edSet('rot',+this.value)" onchange="edProps()" aria-label="Rotação">`
      ) +
      row(
        'Alinhar à página',
        `<div class="seg al">${[
          ['l', 'align-left', 'Esquerda'],
          ['c', 'align-center', 'Centro'],
          ['r', 'align-right', 'Direita'],
          ['t', 'align-top', 'Topo'],
          ['m', 'align-middle', 'Meio'],
          ['b', 'align-bottom', 'Base'],
        ]
          .map(
            ([a, i, t]) =>
              `<button type="button" title="${t}" aria-label="${t}" onclick="edAlign('${a}')">${ico(i)}</button>`
          )
          .join('')}</div>`
      ) +
      '<h5>Aparência</h5>' +
      row(
        'Transparência',
        `<input type="range" min="5" max="100" value="${e.op == null ? 100 : e.op}" oninput="edSet('op',+this.value)" aria-label="Transparência">`
      ) +
      row(
        'Sombra e borda',
        `<div class="seg">${tog('sh', e.sh, 'Sombra')}</div><div class="pr2" style="margin-top:8px">${num('bd', e.bd || 0, 0, 60)}${col('bdc', e.bdc || '#0A1A3F')}</div><small class="hint">Espessura da borda em px (0 = sem borda)</small>`
      ) +
      `<div class="ed-prop-acts"><div class="seg"><button type="button" onclick="edDup()">${ico('copy')}Duplicar</button><button type="button" onclick="edCopy()">Copiar</button></div>
        <div class="seg"><button type="button" onclick="edOrder(1)">Trazer p/ frente</button><button type="button" onclick="edOrder(-1)">Enviar p/ trás</button></div>
        <div class="seg"><button type="button" onclick="edToggle(${e.id},'lock')">${e.lock ? 'Destravar' : 'Travar'}</button><button type="button" class="dg" onclick="edDel()">${ico('trash')}Excluir</button></div></div>`;
  }
  $('#ed-panel').innerHTML = h;
}

const tog2 = (l, on, fn) =>
  `<button type="button" class="${on ? 'on' : ''}" aria-pressed="${on ? 'true' : 'false'}" onclick="${fn}">${l}</button>`;

/** Cor em #rrggbb para o campo de cor (aceita rgba/curtas). Degradês viram a cor do meio. */
function hex(c) {
  c = String(c || '#000000');
  if (/^#[0-9a-f]{6}/i.test(c)) return c.slice(0, 7);
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  const m = c.match(/\d+/g);
  return m && m.length >= 3
    ? '#' +
        m
          .slice(0, 3)
          .map((x) => (+x).toString(16).padStart(2, '0'))
          .join('')
    : '#000000';
}

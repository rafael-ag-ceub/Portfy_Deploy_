/* =====================================================================
   PORTFY · js/views/document.view.js
   Camada: View
   Desenho dos elementos de um arquivo (texto, formas, ícones, imagens) e das
   miniaturas usadas em todas as telas. Também monta o menu "Baixar".
   O mesmo desenho serve o editor (com alças) e as miniaturas (sem alças).
   ===================================================================== */

/* Pontos (em %) das formas em triângulo, estrela, losango e seta */
const POLY = {
  tri: '50,0 100,100 0,100',
  star: '50,2 61,37 98,37 68,59 79,95 50,73 21,95 32,59 2,37 39,37',
  diamond: '50,0 100,50 50,100 0,50',
  arrow: '0,35 60,35 60,10 100,50 60,90 60,65 0,65',
};

const LAYER_NAMES = {
  text: 'Texto',
  rect: 'Retângulo',
  ellipse: 'Círculo',
  img: 'Imagem',
  tri: 'Triângulo',
  star: 'Estrela',
  diamond: 'Losango',
  arrow: 'Seta',
  svg: 'Elemento',
};

/* Pequeno ícone de camada (painel de camadas) conforme o tipo do elemento */
const LAYER_ICON = {
  text: 'type',
  rect: 'square',
  ellipse: 'circle',
  img: 'image',
  tri: 'triangle',
  star: 'star',
  diamond: 'diamond',
  arrow: 'arrow-right',
  svg: 'sticker',
};

/**
 * Desenha um elemento do arquivo.
 * edit = true quando está no editor (mostra alças do elemento selecionado).
 */
function elHTML(e, edit, o = {}) {
  if (e.hid) return '';
  const sel = edit && Ed.sel === e.id && !e.lock;
  let css = `left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;`,
    inner = '';
  if (e.rot) css += `transform:rotate(${e.rot}deg);`;
  if (e.op != null && e.op < 100) css += `opacity:${e.op / 100};`;
  const shadow = e.sh
    ? e.k === 'text'
      ? 'text-shadow:0 2px 12px rgba(10,20,48,.35);'
      : 'box-shadow:0 14px 34px rgba(10,20,48,.28);'
    : '';
  const border = e.bd ? `border:${e.bd}px solid ${e.bdc || '#0A1A3F'};box-sizing:border-box;` : '';
  if (e.k === 'text') {
    css +=
      `font-family:'${e.ff}',sans-serif;font-weight:${e.fw};font-size:${e.fs}px;line-height:${e.lh || 1.3};color:${e.color};text-align:${e.ta};` +
      (e.it ? 'font-style:italic;' : '') +
      (e.ul ? 'text-decoration:underline;' : '') +
      (e.ls ? `letter-spacing:${e.ls}px;` : '') +
      (e.up ? 'text-transform:uppercase;' : '') +
      (e.bg ? `background:${e.bg};` : '') +
      shadow +
      border;
    inner = esc(e.txt);
  } else if (e.k === 'img') {
    css += `border-radius:${e.r || 0}px;overflow:hidden;` + shadow + border;
    inner = `<img src="${esc(e.src)}" alt="" draggable="false"${o.cors ? ' crossorigin="anonymous"' : ''} style="object-fit:${e.fit || 'cover'}">`;
  } else if (e.k === 'svg') {
    css += e.sh ? 'filter:drop-shadow(0 12px 16px rgba(10,20,48,.28));' : '';
    inner = typeof elSVG === 'function' ? elSVG(e.ref, e.bg || '#2F5BEA') : '';
  } else if (POLY[e.k]) {
    css += e.sh ? 'filter:drop-shadow(0 12px 16px rgba(10,20,48,.28));' : '';
    inner = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style="display:block;overflow:visible"><polygon points="${POLY[e.k]}" fill="${e.bg}"${e.bd ? ` stroke="${e.bdc || '#0A1A3F'}" stroke-width="${e.bd}" vector-effect="non-scaling-stroke" stroke-linejoin="round"` : ''}/></svg>`;
  } else {
    css +=
      `background:${e.bg};border-radius:${e.k === 'ellipse' ? '50%' : (e.r || 0) + 'px'};` +
      shadow +
      border;
  }
  const hs = sel
    ? ['nw', 'ne', 'sw', 'se'].map((h) => `<i class="hd ${h}" data-h="${h}"></i>`).join('') +
      '<i class="rot" data-h="rot"></i>'
    : '';
  return `<div class="el ${sel ? 'sel' : ''} ${e.lock ? 'lk' : ''}" data-id="${e.id}" style="${css}">${inner}${hs}</div>`;
}

/** Miniatura de um arquivo: a página inteira reduzida para caber no cartão (fitThumbs ajusta a escala). */
function thumb(doc) {
  return `<div class="th2" data-w="${doc.w}" data-h="${doc.h}" style="--ar:${doc.w / doc.h}"><div class="th2-in" style="width:${doc.w}px;height:${doc.h}px;background:${doc.bg}">${doc.els.map((e) => elHTML(e)).join('')}</div></div>`;
}

/* ---------- Menu "Baixar" (editor e cartões de Meus arquivos) ---------- */
function dlMenu(id) {
  const o = (f, t, d) =>
    `<button type="button" onclick="downloadDoc('${id}','${f}')"><b>${t}</b><small>${d}</small></button>`;
  return `<div class="dlm" role="menu">${o('pdf', 'PDF', 'Para enviar e imprimir')}${o('png', 'Imagem PNG', 'Alta qualidade, fundo transparente quando possível')}${o('jpg', 'Imagem JPG', 'Arquivo mais leve')}${o('html', 'Página HTML', 'Abre em qualquer navegador')}
    ${D.plan !== 'C' ? `<p class="dlm-n">${ico('star')}<span>Com a marca “Feito com Portfy”. <a href="#" onclick="closeEditor();go('plan');return false">Premium</a> baixa sem marca.</span></p>` : ''}</div>`;
}
function dlButton(id, primary) {
  return `<button type="button" class="btn sm ${primary ? 'p' : ''}" onclick="toggleDl(event,this)" aria-haspopup="menu" aria-expanded="false">${ico('download')}<span>Baixar</span>${ico('chev-down')}</button>${dlMenu(id)}`;
}
function toggleDl(ev, btn) {
  ev.stopPropagation();
  const w = btn.parentElement,
    open = w.classList.contains('open');
  closeDlMenus();
  if (!open) {
    w.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
  }
}
function closeDlMenus() {
  $$('.dl.open').forEach((x) => {
    x.classList.remove('open');
    const b = x.querySelector('button');
    if (b) b.setAttribute('aria-expanded', 'false');
  });
}
document.addEventListener('click', closeDlMenus);

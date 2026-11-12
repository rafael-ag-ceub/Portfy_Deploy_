/* =====================================================================
   PORTFY · js/views/files.view.js
   Camada: View
   Tela "Meus arquivos": currículos, portfólios e projetos. Cada cartão
   tem Abrir, Baixar (PDF, PNG, JPG, HTML), Duplicar e Excluir.
   ===================================================================== */

function pgFiles(q) {
  const L = D.docs.filter(
    (d) => (fk === 'todos' || d.kind === fk) && (d.title || '').toLowerCase().includes(q)
  );
  const chips = [
    ['todos', 'Todos'],
    ['curriculo', 'Currículos'],
    ['portfolio', 'Portfólios'],
    ['projeto', 'Projetos'],
  ]
    .map(
      (f) =>
        `<button class="${fk === f[0] ? 'on' : ''}" onclick="fk='${f[0]}';render()" aria-pressed="${fk === f[0] ? 'true' : 'false'}">${f[1]}</button>`
    )
    .join('');
  const cards = L.map(
    (d) => `<article class="fcard">
      <div class="fcard-pv" role="button" tabindex="0" onclick="openEditor('${d.id}')" onkeydown="if(event.key==='Enter')openEditor('${d.id}')" aria-label="Abrir ${esc(d.title)}">${thumb(d)}<span class="kd">${KIND_LABEL[d.kind] || d.kind}</span></div>
      <div class="fcard-b">
        <h4 title="${esc(d.title)}">${esc(d.title)}</h4>
        <small>Editado ${ago(d.upd)}</small>
      </div>
      <div class="fcard-a">
        <button class="btn sm p" onclick="openEditor('${d.id}')">${ico('pencil')}Abrir</button>
        <div class="dl">${dlButton(d.id)}</div>
        <button class="ic sm" onclick="dupDoc('${d.id}')" aria-label="Duplicar ${esc(d.title)}" title="Duplicar">${ico('copy')}</button>
        <button class="ic sm" onclick="delDoc('${d.id}')" aria-label="Excluir ${esc(d.title)}" title="Excluir">${ico('trash')}</button>
      </div>
    </article>`
  ).join('');
  return (
    ph(
      'Meus arquivos',
      `<button class="btn" onclick="openLib('manage')">${ico('paperclip')}Anexos</button>` +
        btn('Novo arquivo', 'file'),
      D.docs.length +
        (D.docs.length === 1 ? ' arquivo' : ' arquivos') +
        ' · currículos, portfólios e projetos'
    ) +
    `<div class="toolbar"><div class="seg" role="group" aria-label="Tipo de arquivo">${chips}</div></div>` +
    `<div class="grid g-3">${cards}<button class="addc" onclick="go('mod')">${ico('plus')}<b>Adicionar arquivo</b><small>Escolher um modelo</small></button></div>` +
    (L.length
      ? ''
      : `<p class="hint">Nenhum arquivo ${fk === 'todos' ? '' : 'deste tipo '}encontrado.</p>`)
  );
}

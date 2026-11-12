/* =====================================================================
   PORTFY · js/views/models.view.js
   Camada: View
   Tela "Modelos": catálogo com categorias, miniaturas reais (geradas pelo
   próprio editor) e selo Pro. Clicar em "Usar modelo" abre o assistente
   (library.view.js → wzHTML), que personaliza cor, fonte e textos.
   ===================================================================== */

function pgMod(q) {
  const L = MODELS.filter(
    (m) =>
      (filt === 'todos' || m.cat === filt) &&
      (m.name + ' ' + m.desc + ' ' + CAT_LABEL[m.cat]).toLowerCase().includes(q)
  );
  const lp = linkProj && D.projs.find((x) => sameId(x.id, linkProj));
  const banner = lp
    ? `<div class="lnk-bn">${ico('link')}<p>Escolha um modelo para o projeto <b>${esc(lp.t)}</b>. O arquivo criado será vinculado a ele.</p><button class="btn sm" onclick="cancelLink()">Cancelar</button></div>`
    : '';
  const cats = CATS.map(
    (f) =>
      `<button class="${filt === f[0] ? 'on' : ''}" onclick="filt='${f[0]}';render()" aria-pressed="${filt === f[0] ? 'true' : 'false'}">${f[1]}${f[0] === 'todos' ? '' : `<i>${MODELS.filter((m) => m.cat === f[0]).length}</i>`}</button>`
  ).join('');
  const cards = L.map((m) => {
    const pro = m.plan === 'B';
    return `<article class="mcard">
      <div class="mcard-pv" role="button" tabindex="0" onclick="useM('${m.id}')" onkeydown="if(event.key==='Enter')useM('${m.id}')" aria-label="Usar o modelo ${esc(m.name)}">
        ${thumb(buildDoc(m.id, { nameOnly: true }))}
        ${pro ? `<span class="pro-t">${ico('star')}Pro</span>` : ''}<span class="kd">${m.fmt}</span>
      </div>
      <div class="mcard-b"><h4>${esc(m.name)}</h4><p>${esc(m.desc)}</p>
        <div class="mc-f"><span class="chip ${pro ? '' : 'n'}">${pro ? 'Pro' : 'Gratuito'}</span><button class="btn sm p" onclick="useM('${m.id}')">Usar modelo</button></div>
      </div></article>`;
  }).join('');
  return (
    ph(
      'Modelos',
      `<button class="btn" onclick="openLib('manage')" title="Imagens e PDFs para usar nos seus arquivos">${ico('paperclip')}Anexos</button>`,
      MODELS.length + ' modelos prontos para personalizar'
    ) +
    banner +
    `<div class="mdl-top"><div class="cats" role="group" aria-label="Categorias">${cats}</div></div>` +
    (cards
      ? `<div class="grid g-3">${cards}</div>`
      : `<div class="card">${emp('Nenhum modelo encontrado para essa busca. Tente outra palavra ou escolha "Todos".', 'layout')}</div>`)
  );
}

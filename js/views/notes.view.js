/* =====================================================================
   PORTFY · js/views/notes.view.js
   Camada: View
   Tela "Notas" em duas colunas: lista à esquerda, editor à direita.
   A edição é salva sozinha (controllers/notes.controller.js).
   ===================================================================== */

function pgNotes(q) {
  const L = D.notes.filter((n) => ((n.t || '') + ' ' + (n.c || '')).toLowerCase().includes(q));
  const cur = noteCurrent();
  const list = L.map(
    (
      n
    ) => `<button class="nt-it ${cur && sameId(cur.id, n.id) ? 'on' : ''}" data-id="${n.id}" onclick="ntOpen('${n.id}')" aria-current="${cur && sameId(cur.id, n.id) ? 'true' : 'false'}">
      <b>${esc(n.t || 'Sem título')}</b><span>${esc((n.c || '').replace(/\s+/g, ' ').slice(0, 110) || 'Sem conteúdo')}</span><small>${n.upd ? ago(n.upd) : 'Sem data'}</small>
    </button>`
  ).join('');
  const editor = cur
    ? `<div class="nt-edit">
        <div class="nt-h"><small id="nt-st" aria-live="polite">Salvo</small><button class="btn sm dg" onclick="ntDel()">${ico('trash')}Excluir</button></div>
        <input class="nt-title" id="nt-title" value="${esc(cur.t || '')}" placeholder="Título da nota" maxlength="120" oninput="ntInput()" aria-label="Título da nota">
        <textarea class="nt-body" id="nt-body" placeholder="Escreva suas ideias, estudos ou lembretes…" oninput="ntInput()" aria-label="Conteúdo da nota">${esc(cur.c || '')}</textarea>
      </div>`
    : `<div class="nt-edit"><div class="nt-empty">${ico('note')}<h3>Nenhuma nota ainda</h3><p>Registre ideias, estudos e lembretes. Tudo é salvo automaticamente.</p><button class="btn p" onclick="ntNew()">${ico('plus')}Criar primeira nota</button></div></div>`;
  return (
    ph(
      'Notas',
      `<button class="btn p" onclick="ntNew()">${ico('plus')}Nova nota</button>`,
      D.notes.length + (D.notes.length === 1 ? ' nota' : ' notas') + ' · salvas automaticamente'
    ) +
    `<div class="notes">
        <aside class="nt-list" aria-label="Lista de notas">${list || `<div class="cl-emp">${ico('search')}<p>${q ? 'Nenhuma nota encontrada.' : 'Suas notas aparecem aqui.'}</p></div>`}</aside>
        ${editor}
      </div>`
  );
}

/* =====================================================================
   PORTFY · js/views/projects.view.js
   Camada: View
   Tela "Projetos": cada projeto pode ter um arquivo vinculado, que abre
   direto no editor ao clicar.
   ===================================================================== */

function pgProj(q) {
  const L = D.projs.filter((p) => (p.t + ' ' + (p.desc || '')).toLowerCase().includes(q));
  const attach = `<button class="btn" onclick="openLib('manage')" title="Imagens e PDFs para usar nos seus arquivos">${ico('paperclip')}Anexos</button>`;
  const cards = L.map((p) => {
    const d = p.doc && D.docs.find((x) => sameId(x.id, p.doc));
    const pv = d
      ? `<div class="pv" role="button" tabindex="0" onclick="openProject('${p.id}')" onkeydown="if(event.key==='Enter')openProject('${p.id}')" aria-label="Abrir o arquivo do projeto ${esc(p.t)}">${thumb(d)}<span class="kd">${KIND_LABEL[d.kind] || d.kind}</span></div>`
      : `<div class="pv pv-empty" role="button" tabindex="0" onclick="openM('proj',0,'${p.id}')" onkeydown="if(event.key==='Enter')openM('proj',0,'${p.id}')" aria-label="Vincular um arquivo ao projeto ${esc(p.t)}">${ico('link')}<b>Sem arquivo vinculado</b><small>Clique para vincular</small></div>`;
    const foot = d
      ? `<span class="chip n" title="${esc(d.title)}">${ico('link')}<span class="ellipsis">${esc(d.title)}</span></span><button class="btn sm p" onclick="openProject('${p.id}')">${ico('pencil')}Abrir</button>`
      : `<span class="chip">Sem arquivo</span><button class="btn sm" onclick="openM('proj',0,'${p.id}')">${ico('link')}Vincular</button>`;
    return `<article class="pcard">${pv}
      <div class="pcard-b">
        <div class="pc-h"><h4>${esc(p.t)}</h4>
          <div class="pc-x"><button class="ic sm" onclick="openM('proj',0,'${p.id}')" aria-label="Editar projeto" title="Editar">${ico('pencil')}</button><button class="ic sm" onclick="del('projs','${p.id}')" aria-label="Excluir projeto" title="Excluir">${ico('trash')}</button></div></div>
        <p>${esc(p.desc || 'Sem descrição')}</p>
        <div class="pc-f">${foot}</div>
      </div></article>`;
  }).join('');
  return (
    ph(
      'Projetos',
      attach + btn('Novo projeto', 'proj'),
      D.projs.length +
        (D.projs.length === 1 ? ' projeto' : ' projetos') +
        ' · cada um abre o arquivo vinculado'
    ) +
    (cards
      ? `<div class="grid g-3">${cards}</div>`
      : `<div class="card">${emp(q ? 'Nenhum projeto encontrado para essa busca.' : 'Crie o primeiro projeto e vincule um arquivo a ele. Assim o projeto vira um atalho para o seu portfólio.', 'folder', q ? '' : btn('Novo projeto', 'proj'))}</div>`)
  );
}

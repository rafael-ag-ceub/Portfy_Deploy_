/* =====================================================================
   PORTFY · js/views/command.view.js
   Camada: View
   Desenho dos três menus flutuantes da moldura: a busca e comandos
   (Ctrl+K), o menu "Novo" e as notificações. A lógica fica em
   js/controllers/command.controller.js.
   ===================================================================== */

/** Linha de um resultado da busca (ou de um item de menu). */
const cmdkRow = (
  x,
  i,
  ativo
) => `<button type="button" class="cmdk-i ${ativo ? 'on' : ''}" role="option" aria-selected="${ativo ? 'true' : 'false'}" data-i="${i}" onmouseenter="cmdkHover(${i})" onclick="cmdkRun(${i})">
  <span class="pi">${ico(x.ic)}</span><span><b>${x.label}</b>${x.sub ? `<small>${x.sub}</small>` : ''}</span>${x.key ? `<kbd>${x.key}</kbd>` : ''}</button>`;

/** Lista de resultados, agrupada por tipo (Ir para, Criar, Arquivos, Notas…). */
function cmdkListHTML(items, ativo) {
  let last = '',
    h = '';
  items.forEach((x, i) => {
    if (x.g !== last) {
      h += `<div class="cmdk-g">${x.g}</div>`;
      last = x.g;
    }
    h += cmdkRow(x, i, i === ativo);
  });
  return h;
}

/** Itens do menu "Novo" (botão + da moldura). */
function newMenuHTML() {
  const it = (fn, ic, cor, t, d) =>
    `<button type="button" onclick="popRun(${fn})"><span class="pi ${cor}">${ico(ic)}</span><span>${t}<small>${d}</small></span></button>`;
  return (
    it("()=>openM('task')", 'check-circle', '', 'Tarefa', 'Algo para fazer hoje ou depois') +
    it('()=>ntNewFromMenu()', 'note', 'teal', 'Nota', 'Ideias, estudos e lembretes') +
    it("()=>openM('event')", 'calendar', 'gold', 'Compromisso', 'Entrevista, prova ou prazo') +
    it("()=>openM('proj')", 'folder', 'coral', 'Projeto', 'Um projeto com arquivo vinculado') +
    '<hr>' +
    it(
      "()=>go('mod')",
      'layout',
      '',
      'Arquivo a partir de modelo',
      'Currículo, portfólio, carta ou slide'
    )
  );
}

/** Notificações: tarefas atrasadas, de hoje e compromissos de hoje. */
function notifHTML() {
  const td = today();
  const late = D.tasks
    .filter((t) => !t.done && t.d < td)
    .map((t) => ({ ic: 'bell', cls: 'warn', t: 'Atrasada: ' + esc(t.t), s: lbl(t.d) }));
  const hoje = D.tasks
    .filter((t) => !t.done && t.d === td)
    .map((t) => ({ ic: 'check-circle', cls: '', t: esc(t.t), s: 'Tarefa de hoje' }));
  const ev = D.events
    .filter((e) => e.d === td)
    .sort((a, b) => a.h.localeCompare(b.h))
    .map((e) => ({ ic: 'calendar', cls: 'ok', t: esc(e.t), s: 'Compromisso às ' + e.h }));
  const rows = [...late, ...hoje, ...ev];
  return `<div class="nt-h"><b>Notificações</b><span class="chip ${late.length ? 'er' : 'n'}">${rows.length}</span></div>
    <div class="nt-l">${rows.map((r) => `<div class="nt-i"><span class="pi ${r.cls}">${ico(r.ic)}</span><span>${r.t}<small>${r.s}</small></span></div>`).join('') || `<div class="nt-e"><span class="pi ok">${ico('check')}</span><p>Tudo em dia. Nenhuma pendência para hoje.</p></div>`}</div>
    <div class="nt-f"><button type="button" class="btn sm" onclick="popClose();go('age')">Ver agenda</button><button type="button" class="btn sm g" onclick="popClose();go('dash')">Início</button></div>`;
}

/** Corpo da busca: comandos, páginas, projetos, arquivos, notas e modelos. */
function cmdkItems(q) {
  const t = String(q || '')
    .trim()
    .toLowerCase();
  const acoes = [
    { g: 'Criar', label: 'Nova tarefa', ic: 'check-circle', run: () => openM('task') },
    { g: 'Criar', label: 'Nova nota', ic: 'note', run: () => ntNewFromMenu() },
    { g: 'Criar', label: 'Novo projeto', ic: 'folder', run: () => openM('proj') },
    { g: 'Criar', label: 'Novo compromisso', ic: 'calendar', run: () => openM('event') },
    {
      g: 'Criar',
      label: 'Criar arquivo a partir de um modelo',
      ic: 'layout',
      run: () => go('mod'),
    },
    { g: 'Ferramentas', label: 'Perguntar ao Agente de IA', ic: 'sparkles', run: () => go('ia') },
    {
      g: 'Ferramentas',
      label: 'Anexos (imagens e PDFs)',
      ic: 'paperclip',
      run: () => openLib('manage'),
    },
    { g: 'Ferramentas', label: 'Alternar tema claro e escuro', ic: 'moon', run: () => theme() },
    { g: 'Conta', label: 'Planos e pacotes', ic: 'star', run: () => go('plan') },
  ];
  const paginas = NAV.map(([id, label, ic]) => ({ g: 'Ir para', label, ic, run: () => go(id) }));
  const projetos = D.projs.map((p) => ({
    g: 'Projetos',
    label: esc(p.t),
    sub: esc(p.desc || ''),
    ic: 'folder',
    run: () => openProject(p.id),
  }));
  const arquivos = D.docs.map((d) => ({
    g: 'Arquivos',
    label: esc(d.title),
    sub: KIND_LABEL[d.kind] || '',
    ic: 'file',
    run: () => openEditor(d.id),
  }));
  const notas = D.notes.map((n) => ({
    g: 'Notas',
    label: esc(n.t || 'Sem título'),
    sub: esc((n.c || '').slice(0, 60)),
    ic: 'note',
    run: () => {
      go('notas');
      ntOpen(n.id);
    },
  }));
  const modelos = MODELS.map((m) => ({
    g: 'Modelos',
    label: esc(m.name),
    sub: esc(m.desc),
    ic: 'layout',
    run: () => {
      go('mod');
      useM(m.id);
    },
  }));
  let all = [...acoes, ...paginas, ...projetos, ...arquivos, ...notas, ...modelos];
  if (t)
    all = all.filter((x) =>
      (x.label + ' ' + (x.sub || '') + ' ' + x.g)
        .toLowerCase()
        .replace(/<[^>]+>/g, '')
        .includes(t)
    );
  return all.slice(0, 40);
}

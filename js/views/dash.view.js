/* =====================================================================
   PORTFY · js/views/dash.view.js
   Camada: View
   Tela "Início": saudação, atalho para perguntar à IA, indicadores,
   o arquivo que você estava editando, tarefas, agenda e atividade.
   ===================================================================== */

const MESES3 = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Conquistas (de 8) usadas no indicador. */
function conquistas() {
  return [
    D.tasks.some((t) => t.done),
    D.docs.length,
    D.notes.length,
    D.projs.length,
    D.events.length,
    D.prof && D.prof.bio,
    D.plan !== 'A',
    D.diag,
  ].filter(Boolean).length;
}

function pgDash(q) {
  const td = today(),
    first = esc(me.name.split(' ')[0]);
  const pend = D.tasks.filter((t) => !t.done),
    due = pend.filter((t) => t.d <= td);
  const up = D.events.filter((e) => e.d >= td).sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
  const tasks = [...D.tasks]
    .filter((t) => (t.t || '').toLowerCase().includes(q))
    .sort((a, b) => a.d.localeCompare(b.d))
    .slice(0, 6);
  const last = [...D.docs].sort((a, b) => b.upd - a.upd)[0];
  const logs = D.log.slice(0, 5);

  const kpis = [
    [
      'check-circle',
      'teal',
      due.length,
      due.length === 1 ? 'tarefa para hoje' : 'tarefas para hoje',
    ],
    ['calendar', '', up.length, up.length === 1 ? 'compromisso marcado' : 'compromissos marcados'],
    ['layout', 'coral', D.docs.length, D.docs.length === 1 ? 'arquivo criado' : 'arquivos criados'],
    ['trophy', 'gold', conquistas() + '/8', 'conquistas'],
  ]
    .map(
      ([i, c, n, l]) =>
        `<div class="kpi"><div class="kpi-top"><span class="kpi-i ${c}">${ico(i)}</span></div><b class="kpi-n">${n}</b><span class="kpi-l">${l}</span></div>`
    )
    .join('');

  const tl =
    tasks
      .map(
        (t) => `<div class="tk ${t.done ? 'd' : ''}">
      <button class="ck ${t.done ? 'd' : ''}" onclick="tog('${t.id}')" aria-label="${t.done ? 'Reabrir' : 'Concluir'} tarefa ${esc(t.t)}" aria-pressed="${t.done ? 'true' : 'false'}">${t.done ? ico('check') : ''}</button>
      <span class="tk-t">${esc(t.t)}</span>
      <small class="tk-d ${!t.done && t.d < td ? 'late' : ''}">${!t.done && t.d < td ? 'Atrasada · ' : ''}${lbl(t.d)}</small>
      <button class="tk-x" onclick="del('tasks','${t.id}')" aria-label="Excluir tarefa">${ico('x')}</button>
    </div>`
      )
      .join('') ||
    emp(
      'Nenhuma tarefa ainda. Adicione a primeira e acompanhe tudo daqui.',
      'check-circle',
      '<button class="btn sm" onclick="openM(\'task\')">' + ico('plus') + 'Nova tarefa</button>'
    );

  const ev =
    up
      .slice(0, 4)
      .map(
        (e) => `<div class="ev">
      <div class="ev-d"><b>${e.d.slice(8)}</b><small>${MESES3[+e.d.slice(5, 7) - 1]}</small></div>
      <div class="ev-b"><span>${esc(e.t)}</span><small>${lbl(e.d)} · ${e.h}</small></div>
    </div>`
      )
      .join('') ||
    emp(
      'Nenhum compromisso marcado. Reserve um horário para estudar ou para uma entrevista.',
      'calendar',
      '<button class="btn sm" onclick="openM(\'event\')">' + ico('plus') + 'Compromisso</button>'
    );

  const act =
    logs
      .map(
        (l) =>
          `<div class="act"><span class="act-i">${ico('check')}</span><span>${esc(l.t)}</span><small>${ago(l.ts)}</small></div>`
      )
      .join('') || emp('Suas ações recentes aparecem aqui.', 'clock');

  const cont = last
    ? `<div class="cont"><div class="th-box">${thumb(last)}</div>
        <div class="cont-b"><span class="chip n">${KIND_LABEL[last.kind] || last.kind}</span><h3>${esc(last.title)}</h3><p>Editado ${ago(last.upd)}</p>
        <div class="row"><button class="btn sm p" onclick="openEditor('${last.id}')">${ico('pencil')}Continuar editando</button><button class="btn sm g" onclick="go('por')">Ver todos</button></div></div></div>`
    : `<div class="cont cont-empty"><div class="cont-b"><span class="chip">Comece aqui</span><h3>Crie seu primeiro arquivo</h3><p>Escolha um modelo pronto e personalize em minutos.</p><div class="row"><button class="btn sm p" onclick="go('mod')">${ico('layout')}Escolher um modelo</button></div></div></div>`;

  const planBox =
    D.plan === 'A'
      ? `<section class="plan-mini"><div class="pm-t"><span class="chip">Plano Gratuito</span></div><h3>Desbloqueie mais recursos</h3><p>Modelos Pro, elementos exclusivos, mais mensagens de IA e exportação sem marca.</p><button class="btn p bl" onclick="go('plan')">${ico('star')}Ver planos</button></section>`
      : `<section class="plan-mini"><div class="pm-t"><span class="chip">Plano ${PL[D.plan][0]}</span></div><h3>Obrigado por apoiar o Portfy</h3><p>Seu plano já inclui os recursos avançados. Confira os pacotes de elementos disponíveis.</p><button class="btn bl" onclick="go('plan')">Ver pacotes</button></section>`;

  return `<section class="hc">
      <div class="hc-t"><small>${longDate()}</small><h2>${greet()}, ${first}.</h2><p>${due.length ? `Você tem ${due.length} ${due.length === 1 ? 'tarefa' : 'tarefas'} para hoje.` : 'Nenhuma tarefa pendente para hoje. Bom momento para criar algo novo.'}</p></div>
      <div class="hc-a"><button class="btn w" onclick="openM('task')">${ico('plus')}Nova tarefa</button><button class="btn w" onclick="go('mod')">${ico('layout')}Criar arquivo</button></div>
    </section>
    <form class="ask" onsubmit="return askFromDash(event)" role="search">
      ${ico('sparkles')}
      <input id="dash-ask" placeholder="Pergunte ao Agente de IA: como destaco meu projeto no currículo?" autocomplete="off" aria-label="Perguntar ao Agente de IA">
      <button class="btn sm p" type="submit">Perguntar</button>
    </form>
    <div class="sugg" aria-label="Sugestões de perguntas">
      ${['Revisar meu resumo profissional', 'Preparar uma entrevista', 'Montar uma rotina de estudos'].map((s) => `<button type="button" onclick="askText(${JSON.stringify(s).replace(/"/g, '&quot;')})">${esc(s)}</button>`).join('')}
    </div>
    <div class="kpis">${kpis}</div>
    <div class="dash">
      <div class="dash-col">
        ${cont}
        <section class="card">
          <div class="card-h"><h3>Próximas tarefas</h3><div class="row"><button class="btn sm" onclick="openM('task')">${ico('plus')}Nova</button><a class="lk" href="#" onclick="go('age');return false">Ver agenda</a></div></div>
          <div class="tk-list">${tl}</div>
        </section>
        <section class="card">
          <div class="card-h"><h3>Atividade recente</h3></div>
          <div class="act-list">${act}</div>
        </section>
      </div>
      <div class="dash-col">
        ${planBox}
        <section class="card">
          <div class="card-h"><h3>Próximos compromissos</h3><a class="lk" href="#" onclick="go('cal');return false">Calendário</a></div>
          <div class="ev-list">${ev}</div>
        </section>
        <section class="card">
          <div class="card-h"><h3>Atalhos</h3></div>
          <div class="qa">
            <button onclick="openM('note')">${ico('note')}<span>Nova nota</span></button>
            <button onclick="openM('proj')">${ico('folder')}<span>Novo projeto</span></button>
            <button onclick="openM('event')">${ico('calendar')}<span>Compromisso</span></button>
            <button onclick="go('ia')">${ico('sparkles')}<span>Perguntar à IA</span></button>
          </div>
        </section>
        <div class="tip-card">${ico('bulb')}<div><h4>Dica do dia</h4><p>Portfólios com números (quantos usuários, quanto tempo economizado, nota da disciplina) despertam mais interesse do que descrições genéricas.</p></div></div>
      </div>
    </div>`;
}

/** Envia a pergunta da barra da Início para o Agente de IA. */
function askFromDash(ev) {
  ev.preventDefault();
  const v = ($('#dash-ask').value || '').trim();
  if (!v) return false;
  askText(v);
  return false;
}

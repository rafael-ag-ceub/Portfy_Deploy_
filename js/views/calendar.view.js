/* =====================================================================
   PORTFY · js/views/calendar.view.js
   Camada: View
   Telas "Calendário" (grade do mês + dia escolhido) e "Agenda" (lista
   agrupada por hoje, próximos e passados).
   ===================================================================== */

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];
const DIAS_LONGOS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
];

/** Dia escolhido no calendário (formato AAAA-MM-DD). */
let calDay = null;

function calSel(ds) {
  calDay = ds;
  render();
}

function pgCal(q) {
  const td = today();
  if (!calDay) calDay = td;
  const y = cal.getFullYear(),
    m = cal.getMonth(),
    f = new Date(y, m, 1).getDay(),
    n = new Date(y, m + 1, 0).getDate(),
    pv = new Date(y, m, 0).getDate();
  let c = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    .map((d) => `<span class="cal-dow" aria-hidden="true">${d}</span>`)
    .join('');
  for (let i = f - 1; i >= 0; i--)
    c += `<span class="cal-c o" aria-hidden="true"><span>${pv - i}</span></span>`;
  for (let d = 1; d <= n; d++) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const k = D.events.filter((e) => e.d === ds).length;
    c += `<button class="cal-c ${ds === td ? 't' : ''} ${ds === calDay ? 'sel' : ''} ${k ? 'hasx' : ''}" onclick="calSel('${ds}')" aria-label="Dia ${d} de ${MESES[m]}${k ? ', ' + k + ' compromisso(s)' : ''}" aria-pressed="${ds === calDay ? 'true' : 'false'}">
      <span>${d}</span>${k ? `<span class="dd">${'<i></i>'.repeat(Math.min(3, k))}</span>` : ''}</button>`;
  }
  const mes = `${y}-${String(m + 1).padStart(2, '0')}`;
  const doMes = D.events
    .filter((e) => e.d.startsWith(mes))
    .sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
  const dia = D.events
    .filter((e) => e.d === calDay)
    .filter((e) => (e.t || '').toLowerCase().includes(q))
    .sort((a, b) => a.h.localeCompare(b.h));
  const [dy, dm, dd] = calDay.split('-').map(Number);
  const dl = new Date(dy, dm - 1, dd);
  const titulo = dl.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    ph(
      'Calendário',
      btn('Novo compromisso', 'event'),
      'Clique em um dia para ver e marcar compromissos'
    ) +
    `<div class="cal-wrap">
      <div class="card cal-card">
        <div class="cal-h"><button class="ic" onclick="mon(-1)" aria-label="Mês anterior">${ico('chev-left')}</button><h3>${MESES[m]} <span>${y}</span></h3><button class="ic" onclick="mon(1)" aria-label="Próximo mês">${ico('chev-right')}</button></div>
        <div class="cal-g">${c}</div>
        <div class="cal-legend"><span><i></i>Dia com compromisso</span><span><i class="t"></i>Hoje</span><span><i class="s"></i>Dia escolhido</span></div>
      </div>
      <aside class="card cal-side">
        <div class="sd-h"><div><small>${dl.getFullYear() === new Date().getFullYear() && calDay === td ? 'Hoje' : 'Dia escolhido'}</small><h3>${titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h3></div>
          <button class="btn sm p" onclick="openM('event','${calDay}')">${ico('plus')}Marcar</button></div>
        <div class="ev-list">${dia.map((e) => `<div class="ev"><div class="ev-d"><b>${e.h}</b><small>${esc(e.t)}</small></div><div class="ev-b"><span>${esc(e.t)}</span><small>${ico('clock')}${e.h}</small></div><button class="ic sm" onclick="del('events','${e.id}')" aria-label="Excluir compromisso">${ico('trash')}</button></div>`).join('') || emp('Nenhum compromisso neste dia.', 'calendar', `<button class="btn sm" onclick="openM('event','${calDay}')">${ico('plus')}Marcar compromisso</button>`)}</div>
        <div class="cal-month"><small>Neste mês: ${doMes.length} ${doMes.length === 1 ? 'compromisso' : 'compromissos'}</small></div>
      </aside>
    </div>`
  );
}

function pgAgenda(q) {
  const td = today();
  const all = D.events
    .filter((e) => (e.t || '').toLowerCase().includes(q))
    .sort((a, b) => (a.d + a.h).localeCompare(b.d + b.h));
  const hoje = all.filter((e) => e.d === td);
  const futuros = all.filter((e) => e.d > td);
  const passados = all.filter((e) => e.d < td).reverse();
  const item = (e, past) => `<div class="ag-it ${past ? 'past' : ''}">
      <div class="ev-d"><b>${e.d.slice(8)}</b><small>${MESES[+e.d.slice(5, 7) - 1].slice(0, 3).toLowerCase()}</small></div>
      <div class="ag-m"><span>${esc(e.t)}</span><small>${ico('clock')}${e.h} · ${lbl(e.d)}${past ? ' · já passou' : ''}</small></div>
      <button class="ic sm" onclick="del('events','${e.id}')" aria-label="Excluir compromisso ${esc(e.t)}">${ico('trash')}</button>
    </div>`;
  const sec = (t, L, past) =>
    L.length
      ? `<section class="ag-sec"><h3>${t}<span>${L.length}</span></h3>${L.map((e) => item(e, past)).join('')}</section>`
      : '';
  const body = sec('Hoje', hoje) + sec('Próximos', futuros) + sec('Já aconteceram', passados, true);
  return (
    ph(
      'Agenda',
      btn('Novo compromisso', 'event'),
      D.events.length +
        (D.events.length === 1 ? ' compromisso' : ' compromissos') +
        ' · provas, prazos e entrevistas'
    ) +
    (body ||
      `<div class="card">${emp(q ? 'Nenhum compromisso encontrado.' : 'Sua agenda está vazia. Marque estudos, prazos e entrevistas.', 'clock', q ? '' : btn('Novo compromisso', 'event'))}</div>`)
  );
}

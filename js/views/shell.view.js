/* =====================================================================
   PORTFY · js/views/shell.view.js
   Camada: View
   Moldura do aplicativo: menu lateral, bloco do plano, usuário, migalhas
   e o ponto de notificação. Redesenhada a cada troca de tela.
   ===================================================================== */

/** Desenha o menu lateral, o bloco do plano, o usuário e a migalha de pão do topo. */
function shellDraw() {
  if (!me || !D) return;
  const td = today();
  const due = (D.tasks || []).filter((t) => !t.done && t.d <= td).length;

  $('#nv').innerHTML = NAV_GROUPS.map(
    ([titulo, ids]) =>
      `<div class="nv-g"><small>${titulo}</small>${ids
        .map((id) => {
          const n = NAV.find((x) => x[0] === id),
            on = id === page;
          const badge =
            id === 'age' && due
              ? `<i class="tag-n" aria-label="${due} pendente(s)">${due}</i>`
              : '';
          return `<button class="ni ${on ? 'on' : ''}" onclick="go('${id}')" ${on ? 'aria-current="page"' : ''}>${ico(n[2])}<span>${n[1]}</span>${badge}</button>`;
        })
        .join('')}</div>`
  ).join('');

  const plan = PL[D.plan] || PL.A;
  const left = typeof planDaysLeft === 'function' ? planDaysLeft() : null;
  $('#sb-plan').innerHTML =
    D.plan === 'A'
      ? `<div class="sp-h">${ico('star')}<span>Plano ${plan[0]}</span></div><p>Libere modelos Pro, mais IA e elementos exclusivos.</p><button class="btn sm p" onclick="go('plan')">Ver planos</button>`
      : `<div class="sp-h">${ico('star')}<span>Plano ${plan[0]}</span></div><p>${left === null ? 'Plano ativo' : left > 0 ? `Vence em ${left} ${left === 1 ? 'dia' : 'dias'}` : 'Plano vencido'}</p><button class="btn sm" onclick="go('plan')">Gerenciar</button>`;

  const av = typeof avInner === 'function' ? avInner() : me.name.slice(0, 1);
  ['#u-av', '#u-av2'].forEach((s) => {
    const el = $(s);
    if (el) el.innerHTML = av;
  });
  $('#u-nm').textContent = me.name;
  $('#u-em').textContent = me.email;

  const title = PAGE_TITLE[page] || 'Início';
  $('#crumb').innerHTML =
    `<span class="tb-root">Portfy</span><span class="sep" aria-hidden="true">/</span><b>${title}</b>`;

  $('#bell-dot').hidden = !due;
  $('#bell').setAttribute(
    'aria-label',
    due ? `Notificações: ${due} tarefa(s) para hoje ou atrasada(s)` : 'Notificações'
  );
}

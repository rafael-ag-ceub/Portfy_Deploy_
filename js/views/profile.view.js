/* =====================================================================
   PORTFY · js/views/profile.view.js
   Camada: View
   Telas "Perfil" (foto, dados, links, biografia e habilidades) e
   "Configurações" (conta, aparência, preferências, segurança e dados).
   ===================================================================== */

function pgProfile() {
  const P = D.prof || {},
    sc = profileScore();
  PF_SK = [...(P.skills || [])];
  const fl = (l, i, v, t = 'text', extra = '') =>
    `<div class="fd"><label for="${i}">${l}</label><input class="inp" id="${i}" type="${t}" value="${esc(v || '')}" ${extra}></div>`;
  const tags = (P.skills || []).length
    ? `<div class="tags ro">${P.skills
        .slice(0, 8)
        .map((t) => `<span class="tag">${esc(t)}</span>`)
        .join('')}</div>`
    : '';
  return (
    ph('Perfil', '', 'Como as pessoas veem você') +
    `<div class="pf-grid">
      <aside class="card pf-side">
        <div class="av-up"><div class="av big ${D.avatar ? 'has-img' : ''}">${avInner()}</div>
          <label class="av-btn" title="Trocar foto" aria-label="Trocar foto">${ico('camera')}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onchange="pickAvatar(this)"></label></div>
        ${D.avatar ? '<button type="button" class="lnk" onclick="removeAvatar()">Remover foto</button>' : ''}
        <h3>${esc(me.name)}</h3>
        <p>${esc(P.role || 'Sua profissão')}</p>
        ${P.loc ? `<small class="loc">${ico('pin')}${esc(P.loc)}</small>` : ''}
        <small>${esc(me.email)}</small>
        <span class="chip">Plano ${PL[D.plan][0]}</span>
        ${tags}
        <div class="meter"><div class="meter-h"><span>Perfil completo</span><b>${sc.pct}%</b></div><div class="meter-b"><i style="width:${sc.pct}%"></i></div>
          <small>${sc.missing.length ? 'Falta: ' + sc.missing.slice(0, 3).join(', ') + (sc.missing.length > 3 ? '…' : '') : 'Tudo certo! Seu perfil está completo.'}</small></div>
      </aside>
      <form class="card pf-form" onsubmit="return savePf(event)">
        <h3 class="sec-t">Informações pessoais</h3>
        <div class="fr">${fl('Nome completo', 'p0', me.name, 'text', 'maxlength="80" required autocomplete="name"')}${fl('Profissão ou área', 'p1', P.role, 'text', 'maxlength="80" placeholder="Ex.: Desenvolvedora front-end"')}</div>
        <div class="fr">${fl('Telefone', 'p2', P.phone, 'tel', 'maxlength="30"')}${fl('Cidade e estado', 'p8', P.loc, 'text', 'maxlength="80" placeholder="Brasília, DF"')}</div>
        <h3 class="sec-t">Links <small>Opcionais</small></h3>
        ${fl('Site ou portfólio', 'p3', P.link, 'text', 'maxlength="200" placeholder="seusite.com.br"')}
        <div class="fr">${fl('LinkedIn', 'p6', P.li, 'text', 'maxlength="200" placeholder="linkedin.com/in/voce"')}${fl('GitHub', 'p7', P.gh, 'text', 'maxlength="200" placeholder="github.com/voce"')}</div>
        <h3 class="sec-t">Sobre você</h3>
        <div class="bio-w">
          <div class="fd"><label for="p4">Biografia <small class="cnt" id="p4c">${(P.bio || '').length}/500</small></label>
            <textarea class="inp" id="p4" rows="4" maxlength="500" oninput="$('#p4c').textContent=this.value.length+'/500'" placeholder="Conte em poucas linhas quem você é e o que procura.">${esc(P.bio || '')}</textarea></div>
          <button type="button" class="btn sm ai-b" onclick="bioAI()">${ico('sparkles')}Escrever com IA</button>
        </div>
        <div class="fd"><label for="p5">Habilidades <small class="cnt">Enter ou vírgula para adicionar (máx. 20)</small></label>
          <div class="tags in" onclick="$('#p5').focus()"><span id="p-tags" class="tg-l"></span><input id="p5" class="tg-i" maxlength="30" placeholder="Ex.: Figma, React, Excel" onkeydown="skKey(event)" onblur="skBlur(this)" aria-label="Adicionar habilidade"></div></div>
        <div class="pf-save"><button class="btn p" type="submit">${ico('check')}Salvar perfil</button></div>
      </form>
    </div>
    <section class="card pf-hist"><div class="card-h"><h3>Linha do tempo</h3><small class="hint">Últimas ações na sua conta</small></div><div class="act-list">${
      D.log
        .slice(0, 20)
        .map(
          (l) =>
            `<div class="act"><span class="act-i">${ico('check')}</span><span>${esc(l.t)}</span><small>${ago(l.ts)}</small></div>`
        )
        .join('') || emp('Suas ações aparecem aqui.', 'clock')
    }</div></section>`
  );
}

function pgSettings() {
  const sel = (k, o) =>
    `<select class="inp sel" aria-label="${k}" onchange="D.${k}=this.value;persistSettings();toast('Preferência salva.')">${o.map((x) => `<option ${D[k] === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
  const tg = (on, fn, l) =>
    `<button class="tg ${on ? 'on' : ''}" onclick="${fn}" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${l}"></button>`;
  const mode = document.documentElement.dataset.theme || 'system';
  const pick = [
    ['light', 'Claro', 'sun'],
    ['dark', 'Escuro', 'moon'],
    ['system', 'Sistema', 'settings'],
  ]
    .map(
      ([v, t, i]) =>
        `<button class="${mode === v ? 'on' : ''}" onclick="setTheme('${v}')" aria-pressed="${mode === v ? 'true' : 'false'}">${ico(i)}${t}</button>`
    )
    .join('');
  return (
    ph('Configurações', '', 'Conta, aparência e segurança') +
    `<div class="cfg-grid">
      <section class="card cfg-c"><h3>Conta</h3><p>Dados de acesso e sessão.</p>
        <div class="sr2"><div>Nome<small>${esc(me.name)}</small></div><button class="btn sm" onclick="openM('name')">${ico('pencil')}Editar</button></div>
        <div class="sr2"><div>E-mail<small>${esc(me.email)}</small></div></div>
        <div class="sr2"><div>Sair da conta<small>Encerrar a sessão neste dispositivo</small></div><button class="btn sm dg" onclick="logout()">${ico('logout')}Sair</button></div>
      </section>
      <section class="card cfg-c"><h3>Aparência</h3><p>Escolha o tema da interface. O modo sistema segue o seu computador.</p>
        <div class="theme-pick" role="group" aria-label="Tema">${pick}</div>
        <div class="sr2"><div>Preferências de idioma<small>Idioma da interface</small></div>${sel('lang', ['Português (Brasil)', 'English', 'Español'])}</div>
        <div class="sr2"><div>Privacidade do perfil<small>Quem pode ver seu portfólio</small></div>${sel('priv', ['Público', 'Somente com link', 'Privado'])}</div>
        <div class="sr2"><div>Lembretes por e-mail<small>Avisos de tarefas e compromissos</small></div>${tg(D.notif, "D.notif=D.notif?0:1;persistSettings();render();toast('Preferência salva.')", 'Lembretes por e-mail')}</div>
      </section>
      <section class="card cfg-c"><h3>Segurança</h3><p>Proteja sua conta.</p>
        <div class="sr2"><div>Autenticação de dois fatores<small>Código por e-mail ao entrar (opcional)</small></div>${tg(D.fa, "D.fa=D.fa?0:1;persistSettings();render();toast(D.fa?'2FA ativado.':'2FA desativado.')", 'Autenticação de dois fatores')}</div>
        <div class="sr2"><div>Alterar senha<small>Defina uma nova senha</small></div><button class="btn sm" onclick="auth('forgot')">Alterar</button></div>
      </section>
      <section class="card cfg-c"><h3>Meus dados</h3><p>Leve seus dados para outro lugar ou apague o que estiver salvo neste navegador.</p>
        <div class="sr2"><div>Exportar meus dados<small>Arquivo JSON com arquivos, tarefas, notas e perfil</small></div><button class="btn sm" onclick="exportData()">${ico('download')}Exportar</button></div>
        <div class="danger-z"><div><b>Apagar dados deste navegador</b><small>${USE_SUPABASE ? 'Na versão conectada, os dados ficam na sua conta. Para apagá-los, fale com o responsável pelo projeto.' : 'Remove tudo o que está salvo neste navegador (modo demonstração).'}</small></div>${USE_SUPABASE ? '' : '<button class="btn sm dg" onclick="clearData()">Apagar tudo</button>'}</div>
      </section>
    </div>`
  );
}

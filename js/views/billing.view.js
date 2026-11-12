/* =====================================================================
   PORTFY · js/views/billing.view.js
   Camada: View
   Tela "Planos e pacotes": planos (Gratuito, Pro, Premium), vitrine de
   pacotes de elementos, histórico de pagamentos e a janela de checkout.
   Chaves de compra: 'B' e 'C' (planos) e 'pk:<codigo>' (pacotes).
   ===================================================================== */

const brl = (cents) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dmy = (ts) => new Date(ts).toLocaleDateString('pt-BR');

/** Dias que faltam para o plano vencer (null = sem vencimento). */
function planDaysLeft() {
  if (!D || D.plan === 'A' || !D.planEnd) return null;
  return Math.ceil((Date.parse(D.planEnd) - Date.now()) / 864e5);
}

/** Nome legível de uma compra (plano ou pacote). */
function buyName(k) {
  if (String(k).startsWith('pk:')) {
    const p = PACK_BY[String(k).slice(3)];
    return p ? p.name : 'Pacote';
  }
  return PL[k] ? 'Plano ' + PL[k][0] : k;
}

/** Preço de uma compra em centavos. */
function buyCents(k) {
  if (String(k).startsWith('pk:')) {
    const p = PACK_BY[String(k).slice(3)];
    return p ? p.price : 0;
  }
  return PL_PRICE[k] || 0;
}

const payWay = (h) =>
  ({
    account_money: 'Saldo Mercado Pago',
    credit_card: 'Cartão de crédito',
    debit_card: 'Cartão de débito',
    bank_transfer: 'Pix',
    ticket: 'Boleto',
    simulado: 'Simulação',
  })[h] || (h ? h : '—');

/** Pequena amostra visual de um pacote: alguns dos seus itens em cores variadas. */
function packPreview(code) {
  const items = EL_LIB.filter((x) => x.tier === 'pack:' + code).slice(0, 6);
  return items
    .map(
      (x, i) =>
        `<span style="--c:${EL_COLORS[i % EL_COLORS.length]}">${elSVG(x.spec.ref, EL_COLORS[i % EL_COLORS.length])}</span>`
    )
    .join('');
}

/** Um pacote está liberado quando o plano é Premium ou quando foi comprado. */
function packOwned(code) {
  return D.plan === 'C' || (D.packs || []).indexOf(code) !== -1;
}

function pgPlan(q) {
  const left = planDaysLeft();
  const cur = PL[D.plan] || PL.A;
  const banner =
    D.plan === 'A'
      ? `<div class="pl-ban"><div><span class="chip n">Plano atual</span><h3>Gratuito</h3><p>Você já pode criar currículos, portfólios, notas e projetos. Assine para liberar modelos Pro, elementos exclusivos, mais IA e exportação sem marca.</p></div></div>`
      : `<div class="pl-ban on"><div><span class="chip">Plano atual</span><h3>${cur[0]}</h3><p>${left === null ? 'Plano ativo.' : left > 0 ? `Válido até <b>${dmy(D.planEnd)}</b> · ${left} ${left === 1 ? 'dia restante' : 'dias restantes'}.` : 'Seu plano venceu. Renove para continuar.'}</p></div>${left !== null && left <= 7 ? `<button class="btn w" onclick="openCheckout('${D.plan}')">Renovar por mais 30 dias</button>` : ''}</div>`;

  const planCards = [
    [
      'A',
      'Para começar',
      [
        'Modelos gratuitos',
        'Agenda, notas e projetos',
        'Elementos básicos',
        'Agente de IA com limite diário',
      ],
      ['Modelos Pro e elementos Pro', 'Exportação sem marca d’água'],
    ],
    [
      'B',
      'Para quem está se candidatando',
      [
        'Tudo do Gratuito',
        'Modelos Pro e elementos Pro',
        'Agente de IA ampliado',
        'Exportação em PDF, PNG e JPG',
      ],
      ['Exportação sem marca d’água', 'Pacotes à parte'],
    ],
    [
      'C',
      'Para quem vive de portfólio',
      [
        'Tudo do Pro',
        'Todos os pacotes de elementos incluídos',
        'Adesivos exclusivos Premium',
        'Exportação sem marca d’água',
      ],
      [],
    ],
  ]
    .map(([k, sub, yes, no]) => {
      const p = PL[k],
        isCur = D.plan === k,
        hot = k === 'B';
      const label =
        k === 'A'
          ? isCur
            ? 'Plano atual'
            : 'Incluído'
          : isCur
            ? 'Renovar +30 dias'
            : PL_PRICE[k] < PL_PRICE[D.plan]
              ? 'Trocar para ' + p[0]
              : 'Assinar ' + p[0];
      return `<article class="plan ${hot ? 'hot' : ''} ${isCur ? 'cur' : ''}">
      ${hot ? '<span class="plan-tag">Mais escolhido</span>' : isCur ? '<span class="plan-tag">Seu plano</span>' : ''}
      <h3>${p[0]}</h3><p class="pd">${sub}</p>
      <div class="pp"><b>${p[1]}</b><small>${k === 'A' ? 'para sempre' : '/ 30 dias'}</small></div>
      <ul>${yes.map((i) => `<li>${ico('check')}${i}</li>`).join('')}${no.map((i) => `<li class="no">${ico('x')}${i}</li>`).join('')}<li>${ico('check')}${PL_IA[k]} mensagens de IA por dia</li></ul>
      <button class="btn bl ${hot && !isCur ? 'p' : ''}" ${k === 'A' ? 'disabled' : ''} onclick="openCheckout('${k}')">${label}</button>
    </article>`;
    })
    .join('');

  const packs = PACKS.map((p) => {
    const owned = packOwned(p.code),
      n = packCount(p.code);
    return `<article class="pack">
      <div class="pack-pv" aria-hidden="true">${packPreview(p.code)}</div>
      <div class="pack-b"><span class="chip n">${n} itens</span><h4>${p.name}</h4><p>${p.desc}</p></div>
      <div class="pack-f"><div class="pk-p"><b>${brl(p.price)}</b><small>pagamento único</small></div>
        ${owned ? `<span class="chip ok">${D.plan === 'C' ? 'Incluído no Premium' : 'Já liberado'}</span>` : `<button class="btn sm p" onclick="openCheckout('pk:${p.code}')">${ico('package')}Comprar</button>`}</div>
    </article>`;
  }).join('');

  const pays = D.pays || [];
  const hist = pays.length
    ? `<section class="card pl-hist"><div class="card-h"><h3>Histórico de pagamentos</h3></div><div class="tbl-w"><table class="tbl"><thead><tr><th>Data</th><th>Compra</th><th>Valor</th><th>Forma</th><th>Situação</th></tr></thead><tbody>${pays
        .map((x) => {
          const st = PAY_ST[x.st] || [x.st, 'wa'];
          return `<tr><td>${dmy(x.ts)}</td><td>${esc(buyName(x.plan))}</td><td>${brl(x.cents)}</td><td>${esc(payWay(x.how))}</td><td><span class="pst ${st[1]}">${st[0]}</span></td></tr>`;
        })
        .join('')}</tbody></table></div></section>`
    : '';

  return (
    ph('Planos e pacotes', '', 'Assinatura de 30 dias, sem renovação automática') +
    banner +
    `<div class="plan-cards">${planCards}</div>
    <div class="packs-h"><div><h2>Pacotes de elementos</h2><p>Formas, ícones e adesivos temáticos para usar nos seus currículos, portfólios e slides. Pague uma vez e use. O plano Premium já inclui todos.</p></div></div>
    <div class="packs-g">${packs}</div>
    <div class="trust">
      <div>${ico('shield')}<span><b>Pagamento seguro</b>Processado pelo Mercado Pago. O Portfy não vê nem guarda dados do seu cartão.</span></div>
      <div>${ico('clock')}<span><b>Sem renovação automática</b>Cada plano libera 30 dias. Pacotes ficam liberados para sempre.</span></div>
      <div>${ico('zap')}<span><b>Liberação imediata</b>Pix, cartão de crédito, débito ou boleto. Liberado assim que o pagamento é aprovado.</span></div>
    </div>${hist}`
  );
}

/** Janela de confirmação antes de ir para o Mercado Pago (plano ou pacote). */
function openCheckout(k) {
  const isPack = String(k).startsWith('pk:');
  if (!isPack && (!PL[k] || k === 'A')) return;
  if (isPack && !PACK_BY[String(k).slice(3)]) return;
  if (isPack && packOwned(String(k).slice(3)))
    return toast('Este pacote já está liberado para você.');
  const real = USE_SUPABASE;
  const name = buyName(k),
    cents = buyCents(k);
  const items = isPack
    ? [
        `${packCount(String(k).slice(3))} itens do pacote, liberados para sempre`,
        'Uso ilimitado em currículos, portfólios e slides',
        'Liberado logo após a aprovação do pagamento',
      ]
    : [...PL[k][2], `${PL_IA[k]} mensagens de IA por dia`];
  $('#info-md').innerHTML = `<h3>${isPack ? 'Comprar ' + name : 'Assinar ' + name}</h3>
    <div class="ck-sum"><div><span>${isPack ? 'Pacote' : 'Plano'}</span><b>${name}</b></div><div><span>${isPack ? 'Tipo' : 'Duração'}</span><b>${isPack ? 'Pagamento único' : '30 dias'}</b></div><div class="tot"><span>Total</span><b>${brl(cents)}</b></div></div>
    <ul class="ck-li">${items.map((i) => `<li>${ico('check')}${esc(i)}</li>`).join('')}</ul>
    <div class="ck-ways"><span>${ico('zap')}Pix</span><span>${ico('credit')}Cartão</span><span>${ico('receipt')}Boleto</span></div>
    <p class="ck-n">${real ? 'Você será levado ao ambiente seguro do Mercado Pago e volta para o Portfy em seguida. Nenhum dado de cartão passa pelo Portfy.' : 'Modo demonstração: o pagamento é simulado e nenhuma cobrança é feita.'}</p>
    ${real ? '' : '<p class="ck-sim">' + ico('info') + 'Simulação: a compra é liberada na hora, só neste navegador.</p>'}
    <div class="err" id="ck-err" role="alert"></div>
    <div class="ma"><button type="button" class="btn" onclick="closeInfo()">Cancelar</button><button type="button" class="btn p" id="ck-go" onclick="startCheckout('${k}')">${real ? 'Ir para o pagamento' : 'Simular pagamento'}</button></div>`;
  $('#info-ov').classList.add('on');
}

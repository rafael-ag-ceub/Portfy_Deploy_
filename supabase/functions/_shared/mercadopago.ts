// =====================================================================
// PORTFY · supabase/functions/_shared/mercadopago.ts
// Camada: SERVIÇO de pagamento (Mercado Pago). Nenhuma regra de tela aqui.
//   mpFetch          chama a API do Mercado Pago com o Access Token (secreto)
//   verifySignature  confere a assinatura x-signature dos avisos (webhook)
//   processPayment   confere o pagamento NO Mercado Pago e libera o PLANO ou o PACOTE
// Secrets: MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET   (veja docs/PAGAMENTOS-MERCADO-PAGO.md)
// =====================================================================
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const API = 'https://api.mercadopago.com';
export const PLAN_DAYS = 30; // cada pagamento de plano libera 30 dias

/** Chamada à API do Mercado Pago com o Access Token secreto.
 *  A chave de idempotência faz uma requisição repetida não gerar cobrança em dobro. */
export async function mpFetch(path: string, init: RequestInit = {}, idempotencyKey?: string) {
  const token = Deno.env.get('MP_ACCESS_TOKEN');
  if (!token) throw new Error('MP_ACCESS_TOKEN não configurado nos secrets do Supabase.');
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(`Mercado Pago ${res.status}: ${body?.message ?? JSON.stringify(body)}`);
  return body;
}

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Comparação em tempo constante (evita descobrir a assinatura por tempo de resposta). */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/**
 * Confere o cabeçalho x-signature ("ts=...,v1=..."): HMAC-SHA256 do texto
 *   id:<data.id em minúsculas>;request-id:<x-request-id>;ts:<ts>;
 * com a "Assinatura secreta" do webhook (MP_WEBHOOK_SECRET).
 */
export async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  const header = req.headers.get('x-signature') ?? '';
  const requestId = req.headers.get('x-request-id') ?? '';
  if (!secret || !header) return false;
  const parts = Object.fromEntries(
    header.split(',').map(
      (p) =>
        p
          .trim()
          .split('=')
          .map((x) => x.trim()) as [string, string]
    )
  );
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;
  const manifest = `id:${/^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId};request-id:${requestId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest)));
  return safeEqual(mac, v1);
}

// status do Mercado Pago -> status da tabela pagamentos
const STATUS: Record<string, 'pendente' | 'pago' | 'falhou' | 'reembolsado'> = {
  approved: 'pago',
  authorized: 'pendente',
  pending: 'pendente',
  in_process: 'pendente',
  in_mediation: 'pendente',
  rejected: 'falhou',
  cancelled: 'falhou',
  refunded: 'reembolsado',
  charged_back: 'reembolsado',
};

export type Outcome = {
  ok: boolean;
  status?: string;
  plan?: string;
  pacote?: string;
  reason?: string;
};

/** Uma linha da tabela pagamentos (compra de plano OU de pacote). */
type Pagamento = {
  id: string;
  usuario_id: string;
  tipo: 'plano' | 'pacote';
  codigo_plano: string | null;
  pacote_codigo: string | null;
  valor_centavos: number;
  moeda: string;
  status: string;
};

/** Libera ou desfaz um plano (usa a função activate_plan, que só o servidor pode chamar). */
async function liberarPlano(admin: SupabaseClient, pg: Pagamento, pago: boolean, anterior: string) {
  const vira = pago
    ? { p_plan: pg.codigo_plano ?? '', p_days: PLAN_DAYS }
    : anterior === 'pago'
      ? { p_plan: 'A', p_days: 0 }
      : null; // estorno: volta ao gratuito
  if (!vira) return;
  const { error } = await admin.rpc('activate_plan', { p_user: pg.usuario_id, ...vira });
  if (error) throw error;
}

/** Libera ou tira um pacote de elementos da conta. Pacote é compra única e não expira. */
async function liberarPacote(admin: SupabaseClient, pg: Pagamento, pago: boolean) {
  const codigo = pg.pacote_codigo ?? '';
  if (pago) {
    const { error } = await admin
      .from('usuario_pacotes')
      .upsert(
        { usuario_id: pg.usuario_id, codigo_pacote: codigo },
        { onConflict: 'usuario_id,codigo_pacote', ignoreDuplicates: true }
      );
    if (error) throw error;
  } else {
    const { error } = await admin
      .from('usuario_pacotes')
      .delete()
      .eq('usuario_id', pg.usuario_id)
      .eq('codigo_pacote', codigo);
    if (error) throw error;
  }
  const { error: e2 } = await admin.from('registro_atividades').insert({
    usuario_id: pg.usuario_id,
    mensagem: (pago ? 'Pacote liberado: ' : 'Pacote estornado: ') + codigo,
  });
  if (e2) throw e2;
}

/**
 * Consulta o pagamento DIRETO no Mercado Pago (nunca confia no que veio na requisição),
 * confere valor e moeda e atualiza a tabela pagamentos + o que foi comprado. É idempotente.
 * `onlyUser`: quando o navegador pede a checagem, só aceita pagamento daquele usuário.
 */
export async function processPayment(
  admin: SupabaseClient,
  paymentId: string,
  onlyUser?: string
): Promise<Outcome> {
  const pay = await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
  const ref = String(pay.external_reference ?? '');
  if (!ref) return { ok: false, reason: 'Pagamento sem referência do Portfy.' };

  const { data: row, error } = await admin
    .from('pagamentos')
    .select('*')
    .eq('id', ref)
    .maybeSingle();
  if (error) throw error;
  if (!row) return { ok: false, reason: 'Pagamento desconhecido.' };
  const pg = row as Pagamento;
  if (onlyUser && pg.usuario_id !== onlyUser)
    return { ok: false, reason: 'Este pagamento é de outra conta.' };

  // valor e moeda precisam bater com o que o Portfy cobrou
  const esperado = Number(pg.valor_centavos) / 100;
  if (
    Math.abs(Number(pay.transaction_amount) - esperado) > 0.009 ||
    String(pay.currency_id) !== String(pg.moeda)
  ) {
    console.error('Valor/moeda divergentes', {
      ref,
      pago: pay.transaction_amount,
      esperado,
      moeda: pay.currency_id,
    });
    return { ok: false, reason: 'Valor divergente.' };
  }

  const novo = STATUS[String(pay.status)] ?? 'pendente';
  const anterior = pg.status;
  const campos = {
    status: novo,
    ref_provedor: String(pay.id),
    meio_pagamento: pay.payment_type_id ?? null,
    detalhe: pay.status_detail ?? null,
  };

  if (novo === 'pago' || novo === 'reembolsado') {
    // A troca de status é condicional (só muda se ainda não estava assim): se o aviso do Mercado Pago
    // e a checagem do navegador chegarem juntos, só um deles "ganha" e libera, uma única vez.
    const { data: mudou, error: e1 } = await admin
      .from('pagamentos')
      .update(campos)
      .eq('id', ref)
      .neq('status', novo)
      .select('id');
    if (e1) throw e1;
    if (mudou && mudou.length) {
      try {
        if (pg.tipo === 'pacote') await liberarPacote(admin, pg, novo === 'pago');
        else await liberarPlano(admin, pg, novo === 'pago', anterior);
      } catch (e) {
        // não conseguiu liberar: volta ao status anterior para o próximo aviso tentar de novo
        await admin.from('pagamentos').update({ status: anterior }).eq('id', ref);
        throw e;
      }
    }
  } else if (anterior !== 'pago') {
    const { error: e3 } = await admin.from('pagamentos').update(campos).eq('id', ref);
    if (e3) throw e3;
  }

  return pg.tipo === 'pacote'
    ? { ok: true, status: novo, pacote: pg.pacote_codigo ?? undefined }
    : { ok: true, status: novo, plan: pg.codigo_plano ?? undefined };
}

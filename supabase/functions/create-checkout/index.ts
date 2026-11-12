// =====================================================================
// PORTFY · supabase/functions/create-checkout/index.ts
// Camada: CONTROLLER. Cria o pagamento (Mercado Pago Checkout Pro) e devolve o link.
// Quem chama: o site, com o usuário logado.
// Corpo:  { plan: 'B' | 'C', return_url }   ou   { pacote: 'startup' | 'cv-criativo' | 'dados', return_url }
// O PREÇO vem sempre do banco (tabelas planos e pacotes): o navegador nunca decide quanto cobrar.
//
// Deploy:  npx supabase functions deploy create-checkout
// Secrets: MP_ACCESS_TOKEN, SITE_URL (e, opcional, ALLOWED_RETURN_ORIGINS)
// =====================================================================
import { cors, json } from '../_shared/cors.ts';
import { adminClient, userClient } from '../_shared/clients.ts';
import { mpFetch } from '../_shared/mercadopago.ts';

type Admin = ReturnType<typeof adminClient>;
type Item = { tipo: 'plano' | 'pacote'; codigo: string; titulo: string; preco: number };
type Recusa = { codigo: string; erro: string };

/** Só devolve o cliente para endereços do próprio site (evita redirecionamento malicioso). */
function safeReturnUrl(candidate: unknown): string | null {
  const allowed = [
    Deno.env.get('SITE_URL'),
    ...(Deno.env.get('ALLOWED_RETURN_ORIGINS') ?? '').split(','),
  ]
    .map((s) => (s ?? '').trim())
    .filter(Boolean);
  try {
    const u = new URL(String(candidate));
    const ok = allowed.some((a) => {
      try {
        return new URL(a).origin === u.origin;
      } catch {
        return false;
      }
    });
    return ok ? u.origin + u.pathname : null;
  } catch {
    return null;
  }
}

/** Confere no banco o que a pessoa quer comprar. Devolve o item, ou o motivo da recusa. */
async function escolherItem(
  admin: Admin,
  usuarioId: string,
  body: Record<string, unknown>
): Promise<Item | Recusa> {
  if (body.pacote) {
    const codigo = String(body.pacote);
    const { data: pacote } = await admin
      .from('pacotes')
      .select('codigo, nome, preco_centavos, ativo')
      .eq('codigo', codigo)
      .maybeSingle();
    if (!pacote || !pacote.ativo || pacote.preco_centavos <= 0)
      return { codigo: 'pacote', erro: 'Pacote indisponível.' };
    const { data: ja } = await admin
      .from('usuario_pacotes')
      .select('codigo_pacote')
      .eq('usuario_id', usuarioId)
      .eq('codigo_pacote', codigo)
      .maybeSingle();
    if (ja) return { codigo: 'ja_liberado', erro: 'Este pacote já está liberado na sua conta.' };
    return {
      tipo: 'pacote',
      codigo,
      titulo: `Portfy · ${pacote.nome}`,
      preco: pacote.preco_centavos,
    };
  }
  const { data: plano } = await admin
    .from('planos')
    .select('codigo, nome, preco_centavos')
    .eq('codigo', String(body.plan ?? ''))
    .maybeSingle();
  if (!plano || plano.preco_centavos <= 0) return { codigo: 'plan', erro: 'Plano inválido.' };
  return {
    tipo: 'plano',
    codigo: plano.codigo,
    titulo: `Portfy ${plano.nome} · 30 dias`,
    preco: plano.preco_centavos,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  try {
    const {
      data: { user },
      error: authError,
    } = await userClient(req).auth.getUser();
    if (authError || !user) return json({ error: 'Não autenticado.' }, 401);

    const body = await req.json().catch(() => ({}));
    const returnUrl = safeReturnUrl(body.return_url ?? Deno.env.get('SITE_URL'));
    if (!returnUrl)
      return json(
        {
          error: 'return_url',
          message: 'Endereço de retorno não permitido. Confira SITE_URL / ALLOWED_RETURN_ORIGINS.',
        },
        400
      );

    const admin = adminClient();
    const item = await escolherItem(admin, user.id, body);
    if ('erro' in item) return json({ error: item.codigo, message: item.erro }, 400);

    // 1. registra o pedido (pendente); o id vira a "external_reference" no Mercado Pago
    const { data: pag, error: e1 } = await admin
      .from('pagamentos')
      .insert({
        usuario_id: user.id,
        tipo: item.tipo,
        codigo_plano: item.tipo === 'plano' ? item.codigo : null,
        pacote_codigo: item.tipo === 'pacote' ? item.codigo : null,
        valor_centavos: item.preco,
        moeda: 'BRL',
        status: 'pendente',
        provedor: 'mercadopago',
      })
      .select('id')
      .single();
    if (e1) throw e1;

    // 2. cria a preferência de pagamento
    // O Mercado Pago avisa cada mudança de pagamento na função payment-webhook (notification_url).
    const base = Deno.env.get('SUPABASE_URL')!;
    let preference: { id: string; init_point: string; sandbox_init_point: string };
    try {
      preference = await mpFetch(
        '/checkout/preferences',
        {
          method: 'POST',
          body: JSON.stringify({
            items: [
              {
                id: item.codigo,
                title: item.titulo,
                quantity: 1,
                currency_id: 'BRL',
                unit_price: item.preco / 100,
              },
            ],
            payer: { email: user.email },
            external_reference: pag.id,
            notification_url: `${base}/functions/v1/payment-webhook`,
            back_urls: {
              success: `${returnUrl}?pagamento=sucesso`,
              pending: `${returnUrl}?pagamento=pendente`,
              failure: `${returnUrl}?pagamento=falha`,
            },
            ...(returnUrl.startsWith('https://') ? { auto_return: 'approved' } : {}), // o Mercado Pago só aceita retorno automático para endereço https
            statement_descriptor: 'PORTFY',
            binary_mode: false,
            metadata: {
              usuario_id: user.id,
              tipo: item.tipo,
              item: item.codigo,
              pagamento_id: pag.id,
            },
          }),
        },
        pag.id
      );
    } catch (err) {
      await admin
        .from('pagamentos')
        .update({ status: 'falhou', detalhe: 'preferencia_nao_criada' })
        .eq('id', pag.id);
      throw err;
    }

    await admin
      .from('pagamentos')
      .update({ ref_provedor: `pref:${preference.id}` })
      .eq('id', pag.id);
    // com credencial de TESTE (TEST-...) o link é o do checkout de teste; com a de produção (APP_USR-...), o real
    const teste = (Deno.env.get('MP_ACCESS_TOKEN') ?? '').startsWith('TEST-');
    return json({
      checkout_url: teste ? preference.sandbox_init_point : preference.init_point,
      sandbox_url: preference.sandbox_init_point,
      payment_id: pag.id,
    });
  } catch (err) {
    console.error('create-checkout:', err);
    return json({ error: 'server', message: (err as Error).message }, 500);
  }
});

// =====================================================================
// PORTFY · supabase/functions/_shared/cors.ts
// Camada: utilitário HTTP usado por todas as Edge Functions
// =====================================================================
// Permissões de CORS: quais sites podem chamar as funções pelo navegador.
// Com '*', qualquer site pode chamá-las. Isso só é seguro porque elas exigem login ou segredo.
// TODO: em produção, troque '*' pelo endereço do seu site.
export const cors = {
  'Access-Control-Allow-Origin': '*', // em produção, troque pelo endereço do seu site
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

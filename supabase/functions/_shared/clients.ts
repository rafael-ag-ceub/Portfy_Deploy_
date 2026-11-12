// =====================================================================
// PORTFY · supabase/functions/_shared/clients.ts
// Camada: acesso ao Supabase (Persistence)
//   userClient  -> age COMO o usuário logado (o RLS vale)
//   adminClient -> privilégio de servidor (ignora o RLS). Use só no back-end.
// =====================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Cliente que age como quem chamou a função (usa o token do cabeçalho Authorization).
// Por ele, o RLS do banco limita o que é lido e gravado.
export const userClient = (req: Request) =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

// Cliente de servidor (service_role): ignora o RLS. Use só quando o usuário não pode agir sozinho.
export const adminClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

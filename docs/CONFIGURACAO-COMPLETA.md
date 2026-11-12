# Portfy · configuração completa (Supabase + integrações)

Guia para quem **já rodou as migrações** no SQL Editor (ou está montando o banco agora). Siga na ordem. Cada etapa diz onde clicar, o que colar e como saber que deu certo.

Seu projeto no Supabase tem o endereço que está em `js/config.js` (`https://SEU_REF.supabase.co`). O trecho `SEU_REF` é o **código do projeto**; use-o onde este guia pedir.

---

## Etapa 1 · Confirmar que o banco está certo
1. Supabase > **SQL Editor** > **New query**.
2. Abra `supabase/tools/verificar_banco.sql`, copie tudo, cole e clique em **Run**.
3. Todas as linhas devem ter `status = OK` (são 20). As que começam com **v9 ·** e **v10 ·** provam que cada migração entrou (coluna `documento_id`, tabela `anexos`, pacotes, gatilho, bucket e permissões).
4. Se alguma estiver em **ATENÇÃO**, rode de novo as cinco migrações, na ordem do nome (são idempotentes): `20261008000000_initial_schema.sql`, `20261008000100_email_reminders.sql`, `20261021000000_perfil_e_pagamentos.sql`, `20261105000000_projetos_anexos_modelos.sql` e `20261110000000_v10_pacotes.sql`. Depois confira de novo.

> Dúvida comum: "salvei a query no SQL Editor, isso basta?". **Rodar (Run) é o que aplica; salvar só guarda o texto.** O verificador acima confirma que rodou. O ideal é manter também o arquivo na pasta `supabase/migrations` do GitHub, como você já faz: ele é o histórico, mas **não** aplica nada sozinho.

## Etapa 2 · Storage (onde ficam as imagens)
Supabase > **Storage**. Devem existir três buckets, todos **Public**:

| Bucket | Para quê |
| --- | --- |
| `avatars` | foto de perfil |
| `doc-images` | imagens colocadas dentro do editor |
| `anexos` | biblioteca de Anexos (imagens e PDFs, até 20 MB) |

Se `anexos` não aparecer, rode a migração v9 de novo. Não crie à mão.

## Etapa 3 · Ligar o site ao Supabase (`js/config.js`)
1. Supabase > **Project Settings** (engrenagem) > **API** (ou **API Keys**).
2. Copie **Project URL** e a chave **anon / publishable** (a pública).
3. Cole em `js/config.js` nos campos `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
4. **Nunca** cole a chave `service_role` (ou `secret`) nesse arquivo nem no GitHub. A anon é pública por desenho; quem protege os dados é o RLS.

Como saber que deu certo: ao abrir o site, a tela de login funciona e criar conta gera uma linha em **Authentication > Users**. Se `config.js` estiver vazio, o site roda em **modo demonstração** (dados só no navegador).

## Etapa 4 · Login e recuperação de senha
Supabase > **Authentication > URL Configuration**:
- **Site URL** (um só): o endereço real do seu site, por exemplo `https://auggusti0g.github.io/Software-Portfy/`.
- **Redirect URLs** (sempre com `/**` no fim):
```
https://auggusti0g.github.io/Software-Portfy/**
http://127.0.0.1:5500/**
http://localhost:5500/**
```
Em **Authentication > Providers > Email**, decida se exige confirmar o e-mail. Para apresentar o projeto, desligar a confirmação evita travar no cadastro; para produção, deixe ligada. E-mails bonitos em português exigem SMTP próprio (veja `docs/RECUPERACAO-DE-SENHA.md`).

## Etapa 5 · Edge Functions (o "back-end" do Portfy)
O site chama cinco funções. Instale a CLI uma vez e publique.

```bash
npx supabase login
npx supabase link --project-ref SEU_REF
npx supabase functions deploy ai-chat
npx supabase functions deploy create-checkout
npx supabase functions deploy check-payment
npx supabase functions deploy payment-webhook --no-verify-jwt
npx supabase functions deploy send-reminders --no-verify-jwt
```
`--no-verify-jwt` só nas duas que não são chamadas por uma pessoa logada (Mercado Pago e agendador). Depois de mudar o código de uma função, rode o `deploy` dela de novo. Conferir: Supabase > **Edge Functions** (as cinco com status ativo).

## Etapa 6 · Segredos (Secrets)
Os segredos ficam no Supabase, nunca no front-end. Defina com `npx supabase secrets set NOME="valor"` ou em **Edge Functions > Secrets**.

| Segredo | Quem usa | De onde vem |
| --- | --- | --- |
| `GEMINI_API_KEY` | ai-chat | Google AI Studio (aistudio.google.com > Get API key, tem camada gratuita) |
| `AI_MODEL`, `AI_FALLBACK_MODEL` | ai-chat (opcionais) | nome de modelo do Gemini; sem eles, o padrão do código |
| `MP_ACCESS_TOKEN` | create-checkout, check-payment, payment-webhook | Mercado Pago > Suas integrações > Credenciais |
| `MP_WEBHOOK_SECRET` | payment-webhook | assinatura secreta do webhook no painel do Mercado Pago |
| `SITE_URL` | create-checkout, send-reminders | domínio do site, sem caminho: `https://auggusti0g.github.io` |
| `ALLOWED_RETURN_ORIGINS` | create-checkout (opcional) | endereços de teste, separados por vírgula |
| `RESEND_API_KEY`, `MAIL_FROM`, `CRON_SECRET` | send-reminders | Resend (resend.com), remetente verificado e um texto aleatório seu |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` já existem automaticamente dentro das funções; você não precisa criá-las.

Se o chat de IA falhar com "permission denied for table ia_conversas", rode `supabase/tools/permissoes_service_role.sql` no SQL Editor.

## Etapa 7 · Pagamentos (Mercado Pago)
Passo a passo completo, com cartões de teste e a ida para produção, em `docs/PAGAMENTOS-MERCADO-PAGO.md`. Resumo:
1. Criar a aplicação **Checkout Pro** no painel de desenvolvedores do Mercado Pago e copiar o Access Token de **teste** (`TEST-...`).
2. `MP_ACCESS_TOKEN`, `SITE_URL` (Etapa 6) e publicar as três funções de pagamento (Etapa 5).
3. No painel do Mercado Pago > Webhooks: URL `https://SEU_REF.supabase.co/functions/v1/payment-webhook`, evento **Pagamentos**; copiar a assinatura para `MP_WEBHOOK_SECRET`.
4. Testar em Planos > Assinar Pro com cartão de teste (nome `APRO` aprova).

## Etapa 8 · Lembretes por e-mail (opcional)
1. Crie conta no Resend, verifique um domínio (ou use o remetente de teste deles) e gere a chave. Defina `RESEND_API_KEY`, `MAIL_FROM` (ex.: `Portfy <avisos@seudominio.com>`), `CRON_SECRET` e `SITE_URL`.
2. Supabase > **Database > Extensions**: ative `pg_cron` e `pg_net`.
3. No SQL Editor, agende a chamada diária (8h de Brasília = 11h UTC). Troque `SEU_REF` e o valor do segredo (o mesmo do `CRON_SECRET`):
```sql
select vault.create_secret('O_MESMO_VALOR_DO_CRON_SECRET', 'cron_secret');

select cron.schedule(
  'portfy-lembretes-diarios',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://SEU_REF.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```
4. Para testar já, rode só o `select net.http_post(...)` de dentro do comando e veja a resposta em Edge Functions > send-reminders > Logs.

## Etapa 9 · Publicar o site (GitHub Pages)
```bash
git add .
git commit -m "v9: projetos com arquivo vinculado, anexos e novos modelos"
git push
```
Depois abra o site e aperte **Ctrl + F5**. O `?v=9` nos scripts do `index.html` força o navegador a baixar a versão nova.

## Etapa 10 · Roteiro de teste ponta a ponta
1. Criar conta nova e entrar (e testar "Esqueci a senha").
2. **Modelos** > escolher um > personalizar > **Criar e editar**.
3. **Projetos** > Novo projeto > "Arquivo vinculado" > salvar. Clicar no card abre o arquivo.
4. **Anexos** (Projetos, Modelos ou editor): enviar uma imagem e um PDF; no editor, inserir.
5. **Meus arquivos** > Baixar em PDF.
6. **Agente de IA** > enviar uma pergunta.
7. **Planos** > pagamento de teste.

## Problemas comuns
| O que aparece | Causa | Solução |
| --- | --- | --- |
| "Falta aplicar a migração v9" | a migração não rodou neste projeto do Supabase | Etapa 1; confira se está no projeto certo |
| Janela de Anexos com aviso amarelo | tabela `anexos` ausente | rodar a migração v9 |
| Login funciona e depois "volta" para a tela de entrada | Site URL / Redirect URLs errados | Etapa 4 |
| Chat de IA: "Não autenticado" ou erro 500 | função não publicada ou `GEMINI_API_KEY` ausente | Etapas 5 e 6; ver Logs da função |
| Pagamento aprovado e plano continua Gratuito | webhook sem URL/assinatura corretas | Etapa 7; ver Logs de `payment-webhook` |
| Site igual ao antigo depois do push | cache | Ctrl + F5 |

## Segurança (resumo para a apresentação)
- Só a chave **anon** está no GitHub; `service_role`, chaves de IA, Mercado Pago e Resend ficam em **Secrets**.
- Todas as tabelas têm RLS: cada pessoa só enxerga os próprios dados (inclusive `anexos`).
- O webhook confere a **assinatura** do Mercado Pago; o agendador confere o `CRON_SECRET`.

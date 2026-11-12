# Pagamentos no Portfy (v10 · Mercado Pago · Checkout Pro)

Guia para cobrar **de verdade** pelos planos Pro (R$ 29) e Premium (R$ 59) e pelos **pacotes de elementos** (Startup R$ 19, Criativo R$ 14,90 e Dados e Tech R$ 24,90). Tudo já está programado no projeto. Falta **você configurar a sua conta do Mercado Pago e o Supabase** (cerca de 30 a 40 minutos).

> **Por que Mercado Pago?** É o gateway mais usado no Brasil. Aceita **Pix, cartão de crédito, débito e boleto**, não exige CNPJ para começar (pessoa física funciona) e o cliente paga numa página do próprio Mercado Pago. O Portfy **nunca vê nem guarda dados de cartão**.

---

## 1. Como funciona

```
Site (Planos > "Assinar Pro" ou "Comprar" um pacote)
  └─ função create-checkout ── confere o preço no banco, cria o pedido (pagamentos = "pendente")
        │                      e o link de pagamento no Mercado Pago
        └─ pessoa é levada ao Mercado Pago e paga (Pix, cartão, boleto)
              ├─ Mercado Pago avisa o servidor ──> payment-webhook (confere assinatura + consulta o pagamento)
              └─ Mercado Pago devolve a pessoa ao site ──> check-payment (confere de novo)
                        ├─ plano:   activate_plan  -> Pro/Premium por 30 dias (tabela assinaturas)
                        └─ pacote:  usuario_pacotes -> pacote liberado na conta, sem validade
```

O plano e o pacote **só mudam no servidor**, depois que o Mercado Pago confirma o pagamento. O navegador nunca decide preço nem libera nada.

**Regras adotadas** (fáceis de mudar depois):

- **Plano:** cada pagamento libera **30 dias** (`PLAN_DAYS` em `_shared/mercadopago.ts` e `PL_DAYS` em `js/models/constants.js`). Não há renovação automática. Se a pessoa pagar antes de vencer, os dias **somam** ao que sobrou.
- **Pacote:** compra **única** e sem validade. Cada conta compra cada pacote uma vez. Uma segunda tentativa é recusada antes de qualquer cobrança.
- **Premium** já inclui todos os pacotes. Para quem tem o Premium, o botão de compra vira "Incluído no Premium".
- Ao vencer o plano, a conta volta ao **Gratuito** sozinha (`sync_my_plan`, quando a pessoa entra no app).
- **Reembolso ou estorno** no Mercado Pago desfaz a compra: o plano volta ao Gratuito e o pacote sai da conta.
- Os preços ficam nas tabelas **`planos`** e **`pacotes`** do banco. É de lá que a função lê o valor a cobrar.

**O que existe no projeto**

| Parte | Arquivo |
|---|---|
| Banco (planos, da versão 8) | `supabase/migrations/20261021000000_perfil_e_pagamentos.sql` |
| Banco (pacotes, da versão 10) | `supabase/migrations/20261110000000_v10_pacotes.sql` |
| Cria o pedido e o link de pagamento | `supabase/functions/create-checkout/index.ts` |
| Confere ao voltar ao site | `supabase/functions/check-payment/index.ts` |
| Recebe o aviso do Mercado Pago | `supabase/functions/payment-webhook/index.ts` |
| Regras comuns (API, assinatura, liberação) | `supabase/functions/_shared/mercadopago.ts` |
| Vitrine, checkout e retorno no site | `js/views/billing.view.js`, `js/controllers/billing.controller.js` |

---

## 2. Passo a passo

### Passo 1 · Atualizar o banco
Siga o guia **[ATUALIZAR-BANCO-V10.md](ATUALIZAR-BANCO-V10.md)**: rode `20261110000000_v10_pacotes.sql` no SQL Editor do Supabase. Ela pode ser rodada mais de uma vez sem erro.

### Passo 2 · Criar a aplicação no Mercado Pago
1. Entre em **mercadopago.com.br** com a sua conta (crie uma se não tiver).
2. Abra o painel de desenvolvedores: **mercadopago.com.br/developers** > **Suas integrações** > **Criar aplicação**.
3. Nome: `Portfy`. Produto: **Checkout Pro**. Tipo de integração: *plataforma própria / site*. Aceite os termos e crie.
4. Dentro da aplicação, abra **Credenciais de teste** e copie o **Access Token**. Em teste ele começa com `TEST-`. Esse token é **secreto**: nunca vai no front-end, nem no GitHub.

> **Dica:** para testar sem dinheiro de verdade, use **Contas de teste** (no mesmo painel) para criar um *comprador* de teste.

### Passo 3 · Guardar os segredos no Supabase
No terminal, na pasta do projeto (já logado com `npx supabase login` e ligado ao projeto com `npx supabase link --project-ref SEU_REF`):

```bash
npx supabase secrets set MP_ACCESS_TOKEN="TEST-xxxxxxxx"
npx supabase secrets set SITE_URL="https://SEU-USUARIO.github.io"
npx supabase secrets set ALLOWED_RETURN_ORIGINS="http://127.0.0.1:5500,http://localhost:5500"
```

- `SITE_URL` é o **endereço do seu site publicado**, só o domínio (sem a pasta do projeto no fim). O servidor só devolve a pessoa a endereços dessa lista. Assim ninguém consegue usar o seu checkout para mandar clientes a outro site.
- `ALLOWED_RETURN_ORIGINS` (opcional) libera endereços de teste no seu computador. Ajuste a porta se for outra.
- `MP_WEBHOOK_SECRET` vem no Passo 5.

### Passo 4 · Publicar as funções
```bash
npx supabase functions deploy create-checkout
npx supabase functions deploy check-payment
npx supabase functions deploy payment-webhook --no-verify-jwt
```

- **Depois de atualizar para a versão 10, publique as três de novo**: o `create-checkout` passou a aceitar pacotes.
- `--no-verify-jwt` vale **só** para o `payment-webhook`, porque quem chama é o Mercado Pago, que não tem login. A proteção dele é a **assinatura** (Passo 5).
- Sempre que trocar o código de uma função, rode o `deploy` dela de novo. Trocar um *secret* não exige novo deploy.

### Passo 5 · Configurar o aviso automático (webhook)
1. Painel do Mercado Pago > sua aplicação > **Webhooks** > **Configurar notificações**.
2. **URL do modo de teste** (depois, a de produção):
   `https://SEU_REF.supabase.co/functions/v1/payment-webhook`
   O `SEU_REF` é o código do projeto, o mesmo do endereço do Supabase em `js/config.js`.
3. **Eventos:** marque **Pagamentos** (`payment`). Salve.
4. O painel mostra a **Assinatura secreta**. Copie e guarde no Supabase:
   ```bash
   npx supabase secrets set MP_WEBHOOK_SECRET="cole_a_assinatura_secreta"
   ```
5. O painel também tem o botão **Simular notificação**. Ele só testa se a URL responde. Um pagamento simulado não existe de verdade, então o servidor responde "pagamento desconhecido", e isso é esperado. O teste completo é o do Passo 6.

### Passo 6 · Testar do começo ao fim

**Teste de plano**

1. Abra o site, entre com uma conta e vá em **Planos** > **Assinar Pro** > **Ir para o pagamento**.

**Teste de pacote**

2. Na tela de Planos, em **Pacotes de elementos**, clique em **Comprar** no Pacote Startup > **Ir para o pagamento**.

**Pagamento de teste**

3. Com credencial de teste (`TEST-`), o servidor já devolve o link do **checkout de teste** do Mercado Pago, então nada é cobrado de verdade. Pague com um cartão de teste. Os números de cartão, o código de segurança e a validade ficam na documentação do Mercado Pago (procure por *cartões de teste*), e podem mudar.
   - Nome do titular define o resultado: `APRO` = aprovado, `OTHE` = recusado, `CONT` = pendente, `FUND` = saldo insuficiente.
   - Para os demais dados de identificação, use os valores de teste indicados na própria documentação.
4. Volte ao site. Aparece **"Pagamento aprovado!"** e o plano ou o pacote fica liberado. Se a volta demorar, o aviso do webhook libera do mesmo jeito.
5. Confira no Supabase (SQL Editor):

```sql
select tipo, status, codigo_plano, pacote_codigo, valor_centavos, meio_pagamento, criado_em
from public.pagamentos order by criado_em desc limit 5;

select codigo_pacote, criado_em from public.usuario_pacotes
 where usuario_id = (select id from auth.users where email = 'SEU_EMAIL');

select codigo_plano, status, fim_periodo_atual from public.assinaturas
 where usuario_id = (select id from auth.users where email = 'SEU_EMAIL');
```

6. Se algo não funcionar: Supabase > **Edge Functions** > escolha a função > **Logs**.

### Passo 7 · Ir para produção (dinheiro de verdade)
1. No Mercado Pago, ative as **credenciais de produção** da aplicação. O painel pede as informações do negócio e do site.
2. Troque os segredos. Em produção o token começa com `APP_USR-`, e o link de pagamento passa a ser o real automaticamente:
   ```bash
   npx supabase secrets set MP_ACCESS_TOKEN="APP_USR-xxxxxxxx"
   npx supabase secrets set MP_WEBHOOK_SECRET="assinatura_do_modo_producao"
   ```
3. Cadastre a **URL de produção** do webhook (a mesma do Passo 5, agora na aba **Produção**) e copie a assinatura secreta dela.
4. Faça uma compra real de um pacote (de preço baixo) com o seu próprio cartão ou Pix. Depois peça o reembolso no painel do Mercado Pago, para confirmar o ciclo completo: o pacote deve sair da conta.
5. Veja as **tarifas** do Mercado Pago na sua conta. Elas variam por meio de pagamento e prazo de recebimento.

---

## 3. Segurança

- **O preço nunca vem do navegador.** `create-checkout` lê o valor das tabelas `planos` e `pacotes`.
- **Assinatura do aviso** (`x-signature`, HMAC-SHA256 com a assinatura secreta). Aviso falso é recusado com erro 401.
- **Conferência direta:** mesmo com assinatura válida, o servidor consulta o pagamento na API do Mercado Pago e confere **valor, moeda e referência** antes de liberar qualquer coisa.
- **Sem liberação duplicada:** a troca de status é condicional. Aviso repetido, ou chegando junto com a checagem do navegador, libera **uma vez só**.
- **Cada pessoa só confirma o próprio pagamento** (`check-payment` compara o dono do pedido).
- **Endereço de retorno limitado** a `SITE_URL` e `ALLOWED_RETURN_ORIGINS`.
- **RLS:** o usuário só **lê** os próprios pagamentos e pacotes. Só o servidor (service role) escreve neles.
- **Access Token** fica só nos segredos do Supabase. Se vazar (por exemplo, colado no GitHub), gere outro no painel do Mercado Pago imediatamente.

**Limite desta versão (importante):** a compra do pacote é registrada e liberada pelo servidor, mas a regra que impede usar um elemento de pacote sem tê-lo comprado é conferida **no navegador**, dentro do editor. Isso segura o uso normal do site, mas quem mexer no código do próprio navegador consegue contornar. Para fechar essa brecha, o servidor precisaria entregar o conteúdo pago, por exemplo por uma função que devolve os elementos de um pacote só para contas liberadas. Isso não foi feito nesta versão.

---

## 4. Problemas comuns

| Sintoma | Causa provável e solução |
|---|---|
| "A função create-checkout ainda não foi publicada" | Faltou o `deploy` do Passo 4. |
| "Endereço de retorno não permitido" | O endereço do site não está em `SITE_URL` ou `ALLOWED_RETURN_ORIGINS`. Use só o domínio, sem a pasta. |
| "MP_ACCESS_TOKEN não configurado" | Faltou o `secrets set` do Passo 3. Depois de definir, não precisa refazer o deploy. |
| "O Mercado Pago não devolveu o link de pagamento." | Access Token errado, de outra aplicação, ou de teste trocado por produção. Veja os **Logs** de `create-checkout`. |
| "Este pacote já está liberado na sua conta." | Você já comprou esse pacote. Nenhuma cobrança nova foi criada. |
| "Pacote indisponível." | O código não existe na tabela `pacotes` ou está com `ativo = false`. |
| Pagou, mas o plano ou o pacote não apareceu | Veja os **Logs** de `payment-webhook`. Erro 401 = `MP_WEBHOOK_SECRET` errado ou de outro modo (teste x produção). Nenhuma chamada = URL do webhook errada. A volta ao site também confere o pagamento. |
| Nos Logs aparece "Valor divergente" | O valor no Mercado Pago não bate com o banco. Não altere o preço no meio do caminho: confira `planos.preco_centavos` e `pacotes.preco_centavos`, e refaça o pagamento. |
| Pix ou boleto demoram | Normal: fica "Aguardando" até compensar. A liberação acontece sozinha pelo webhook. |
| Voltou ao site, mas não redirecionou sozinho | Com o site em `http://` (teste local), o retorno automático é desligado de propósito: clique em "Voltar ao site". Em `https://` é automático. |
| O plano não voltou ao Gratuito depois de vencer | Isso acontece quando a pessoa entra no app (`sync_my_plan`). Confira se a migração da versão 8 foi aplicada. |
| "schema cache" ao comprar | Falta a migração da versão 10, ou a API ainda não atualizou. Veja [ATUALIZAR-BANCO-V10.md](ATUALIZAR-BANCO-V10.md). |

---

## 5. Pontos de atenção do negócio (não é aconselhamento jurídico)

- Para vender de verdade, informe **CPF ou CNPJ** corretos na conta do Mercado Pago. Considere formalizar um **MEI**. A emissão de nota fiscal depende do seu enquadramento.
- O **Código de Defesa do Consumidor** prevê arrependimento em 7 dias para compras online. Deixe a política de reembolso clara nos *Termos de uso* (`INFO.termos` em `js/models/constants.js`, que já menciona o pagamento pelo Mercado Pago).
- Quer cobrança **recorrente automática**? O Mercado Pago tem *Assinaturas* (API `preapproval`). É uma evolução futura: seria criar um plano de assinatura e tratar os eventos de assinatura no mesmo webhook.

---

## 6. Referências oficiais

Confirme valores e telas na documentação, porque o painel muda com o tempo:

- Mercado Pago: **mercadopago.com.br/developers** (Checkout Pro, Webhooks e cartões de teste).
- Supabase: documentação de Edge Functions e de *secrets* (supabase.com/docs).

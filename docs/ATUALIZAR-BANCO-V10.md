# Atualizar o banco de dados para a versão 10

A versão 10 acrescenta os **pacotes de elementos pagos** (Startup, Criativo e Dados e Tech). Para isso, a migração mexe em quatro partes do banco. **Nenhum dado existente é apagado.**

> **Tempo estimado:** 5 minutos. A migração **pode ser rodada mais de uma vez** sem erro.

---

## 1. Antes de começar

- Você precisa ter rodado as migrações anteriores, nesta ordem: `20261008000000_initial_schema.sql`, `20261008000100_email_reminders.sql`, `20261021000000_perfil_e_pagamentos.sql` e `20261105000000_projetos_anexos_modelos.sql`. Se você seguiu os guias das versões 8 e 9, elas já estão rodadas.
- Tenha o seu projeto do Supabase aberto no navegador.
- Se o seu projeto tiver backups (menu **Database > Backups**), faça um antes. A migração não apaga dados, mas backup nunca atrapalha.

---

## 2. O que a migração faz

| Parte | O que muda | Para que serve |
|---|---|---|
| **`pacotes`** (tabela nova) | Catálogo dos pacotes à venda: nome, descrição, **preço em centavos** e se está ativo. Os três pacotes entram sozinhos. | O preço fica no banco porque é o servidor que decide quanto cobrar. Mudar um preço é só atualizar esta tabela. |
| **`usuario_pacotes`** (tabela nova) | Quais pacotes cada conta já comprou. | É ela que libera os elementos do pacote na conta. Só o servidor escreve nela; o site apenas lê as próprias linhas. |
| **`pagamentos`** (tabela existente) | Ganha duas colunas: `tipo` (`plano` ou `pacote`) e `pacote_codigo`. | Uma única tabela guarda todas as compras, de plano ou de pacote. |
| **`planos`** (tabela existente) | O texto de recursos do Premium é atualizado. | Mostra só o que o Portfy realmente oferece. |

Todas as tabelas novas ficam com **RLS** (segurança por linha) ligada. Isso quer dizer que cada pessoa só enxerga as próprias compras.

---

## 3. Passo a passo no Supabase

1. Entre em **supabase.com/dashboard** e abra o seu projeto.
2. No menu da esquerda, clique em **SQL Editor**.
3. Clique em **+ New query** (nova consulta).
4. No seu computador, abra o arquivo `supabase/migrations/20261110000000_v10_pacotes.sql` do projeto. Selecione tudo (**Ctrl+A**) e copie (**Ctrl+C**).
5. Volte ao SQL Editor, clique na área de texto e cole (**Ctrl+V**).
6. Clique em **Run** (ou pressione **Ctrl+Enter**).
7. O resultado esperado é a mensagem **Success. No rows returned**. Se aparecer um erro em vermelho, veja a seção 5.

---

## 4. Conferir se deu certo

Cole cada consulta abaixo em uma nova aba do SQL Editor e clique em **Run**.

**a) Os três pacotes existem**

```sql
select codigo, nome, preco_centavos, ativo from public.pacotes order by codigo;
```

Resultado esperado: três linhas, todas com `ativo = true`:

| codigo | nome | preco_centavos |
|---|---|---|
| cv-criativo | Pacote Criativo | 1490 |
| dados | Pacote Dados e Tech | 2490 |
| startup | Pacote Startup | 1900 |

**b) As tabelas novas têm segurança (RLS) ligada**

```sql
select relname, relrowsecurity from pg_class
 where relname in ('pacotes', 'usuario_pacotes') and relnamespace = 'public'::regnamespace;
```

Resultado esperado: duas linhas, ambas com `relrowsecurity = true`.

**c) A tabela de pagamentos aceita pacote**

```sql
select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'pagamentos' and column_name in ('tipo', 'pacote_codigo');
```

Resultado esperado: duas linhas (`tipo` e `pacote_codigo`).

**d) O Premium está com os recursos corretos**

```sql
select codigo, preco_centavos, recursos from public.planos where codigo = 'C';
```

Resultado esperado: uma linha com `preco_centavos = 5900` e `recursos` contendo "Todos os pacotes de elementos".

**e) Quantos pacotes já foram liberados (no começo, zero)**

```sql
select count(*) from public.usuario_pacotes;
```

---

## 5. Se der erro

| Mensagem | O que fazer |
|---|---|
| `relation "public.pagamentos" does not exist` ou `... "public.planos" does not exist` | Você ainda não rodou as migrações anteriores. Rode `20261021000000_perfil_e_pagamentos.sql` (e as que vêm antes dela) e depois esta. |
| O site mostra "schema cache" ou "não encontrou a tabela" logo depois de rodar | A API do Supabase demora alguns segundos para enxergar tabelas novas. Espere um minuto e recarregue a página. Se continuar, rode no SQL Editor: `notify pgrst, 'reload schema';` |
| Erro de sintaxe colando o arquivo | Confirme que você copiou o arquivo inteiro, do primeiro ao último `;`, sem cortar nada. |

---

## 6. Depois da migração

A migração **não atualiza o código das funções de pagamento**. Publique de novo, pelo terminal, na pasta do projeto:

```bash
npx supabase functions deploy create-checkout
npx supabase functions deploy check-payment
npx supabase functions deploy payment-webhook --no-verify-jwt
```

O passo a passo completo (segredos, webhook e testes) está em [PAGAMENTOS-MERCADO-PAGO.md](PAGAMENTOS-MERCADO-PAGO.md).

---

## 7. Por que é seguro rodar de novo

Cada comando da migração foi escrito para não quebrar se já existir:

- `create table if not exists` cria a tabela só se ela não existir;
- `insert ... on conflict do update` atualiza os pacotes em vez de duplicá-los;
- `drop policy if exists` remove a regra antiga antes de criar a nova;
- `add column if not exists` adiciona a coluna só se faltar.

Por isso, rodar a migração duas vezes deixa o banco exatamente como ele deveria estar.

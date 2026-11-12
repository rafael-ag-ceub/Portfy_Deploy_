# Portfy
 
Organizador de carreira com currículo, portfólio, projetos, agenda, notas e um Agente de IA.
 
Projeto Integrador · CEUB · 2026 · versão 11

## Estrutura do projeto
 
```
Portfy/
├── .gitignore                arquivos que o Git ignora (como o .env)
├── .vscode/                  configurações do VS Code
├── README.md                 este arquivo
├── index.html                página principal, com as telas e os ícones
├── css/                      estilos: tokens (cores e medidas), base, componentes, shell, landing, auth, pages e editor
├── docs/                     guias passo a passo
├── js/
│   ├── config.js             URL e chave anon do Supabase
│   ├── main.js               ponto de entrada e versão (BUILD)
│   ├── utils.js              funções pequenas
│   ├── models/               dados e regras
│   ├── views/                desenham as telas
│   ├── controllers/          reagem aos cliques
│   └── services/             API do Supabase, IA, armazenamento e exportação
├── supabase/
│   ├── functions/            Edge Functions (ai-chat, create-checkout, check-payment, payment-webhook, send-reminders) e _shared/
│   ├── migrations/           as cinco migrações, na ordem
│   ├── templates/            modelos de e-mail do Supabase
│   └── tools/                verificar_banco.sql e outras ferramentas do banco
├── tests/
│   ├── capturas/             prints gerados pelo teste de navegador
│   ├── teste_navegador.py    teste de ponta a ponta no navegador
│   └── validate.js           validador rápido
└── tools/
    └── gerar-html-unico.py   gera um index.html só, que roda sem Supabase
```
 
Site feito com HTML, CSS e JavaScript puro, sem framework e sem build. Os dados ficam no Supabase. Sem ele, ficam só no navegador (modo demonstração).
 
## Funcionalidades
 
- Currículo, portfólio, carta, apresentação e LinkedIn, com 23 modelos e editor visual.
- Exportação em PDF, PNG, JPG ou HTML.
- Projetos ligados a arquivos, com anexos de imagens e PDFs.
- Agenda, tarefas, notas e painel inicial.
- Agente de IA com conversas salvas.
- Planos Gratuito, Pro e Premium, e pacotes de elementos pagos.
- Cadastro, confirmação por e-mail e recuperação de senha.
## Como rodar
 
```bash
cd Portfy
python3 -m http.server 8000
```
 
Abra http://localhost:8000. Se `js/config.js` estiver com os campos vazios, o site roda em modo demonstração.
 
## Configurar o Supabase
 
O guia completo, tela por tela, está em [docs/CONFIGURACAO-COMPLETA.md](docs/CONFIGURACAO-COMPLETA.md). Resumo:
 
1. Crie um projeto no [Supabase](https://supabase.com).
2. Em *Project Settings > API*, copie a **Project URL** e a chave **anon / publishable** para `js/config.js`.
3. Rode as cinco migrações de `supabase/migrations/`, uma por vez, nesta ordem:
```
   20261008000000_initial_schema.sql
   20261008000100_email_reminders.sql
   20261021000000_perfil_e_pagamentos.sql
   20261105000000_projetos_anexos_modelos.sql
   20261110000000_v10_pacotes.sql
```
 
   Elas podem ser rodadas de novo sem apagar dados.
 
4. Rode `supabase/tools/verificar_banco.sql` no SQL Editor. Devem aparecer 20 linhas, todas com status `OK`.
5. Publique as Edge Functions e cadastre os segredos (Etapas 5 e 6 do guia).
## Segredos
 
Ficam em *Edge Functions > Secrets* no Supabase, nunca no front-end nem no GitHub. Cada um só é necessário se você usar o recurso correspondente. A lista completa está na Etapa 6 do guia.
 
| Segredo | Para quê |
|---|---|
| `SITE_URL` | Endereço do site, só o domínio, sem caminho |
| `GEMINI_API_KEY` ou `ANTHROPIC_API_KEY` | Chave da IA |
| `AI_PROVIDER` e `AI_MODEL` | Provedor (`gemini`, `anthropic` ou `openai`) e modelo da IA. Opcionais |
| `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SECRET` | Pagamentos com Mercado Pago |
| `RESEND_API_KEY`, `MAIL_FROM` e `CRON_SECRET` | Lembretes por e-mail (Etapa 8 do guia) |
 
A chave `service_role` (ou `secret`) e a chave da IA nunca vão para o front-end, para `js/config.js` nem para o GitHub. A chave anon é pública por desenho: quem protege os dados é o RLS.
 
## Testes
 
```bash
node tests/validate.js
```
 
Precisa do Node.js. Rode depois de editar qualquer arquivo: ele confere arquivos, sintaxe, ids, funções dos `onclick`, cores do CSS e ícones.
 
Teste de navegador (opcional): instale com `pip install playwright` e `python -m playwright install chromium`. Ele roda o site em modo demonstração, sem Supabase. Depois rode:
 
```bash
python3 tools/gerar-html-unico.py
python3 tests/teste_navegador.py ../entregas/index.html
```
 
O primeiro comando cria `entregas/index.html` ao lado da pasta `Portfy`. O segundo testa esse arquivo e salva os prints em `tests/capturas/`.
 
## Publicação
 
- O site é estático: qualquer hospedagem serve. Para o GitHub Pages, siga a Etapa 9 do guia.
- Depois de mudar CSS ou JS, aumente o `?v=` dos arquivos no `index.html` e recarregue a página com Ctrl + F5 (no Mac, Cmd + Shift + R).
## Estrutura do projeto
 
```
Portfy/
├── .gitignore                arquivos que o Git ignora (como o .env)
├── .vscode/                  configurações do VS Code
├── README.md                 este arquivo
├── index.html                página principal, com as telas e os ícones
├── css/                      estilos: tokens (cores e medidas), base, componentes, shell, landing, auth, pages e editor
├── docs/                     guias passo a passo
├── js/
│   ├── config.js             URL e chave anon do Supabase
│   ├── main.js               ponto de entrada e versão (BUILD)
│   ├── utils.js              funções pequenas
│   ├── models/               dados e regras
│   ├── views/                desenham as telas
│   ├── controllers/          reagem aos cliques
│   └── services/             API do Supabase, IA, armazenamento e exportação
├── supabase/
│   ├── functions/            Edge Functions (ai-chat, create-checkout, check-payment, payment-webhook, send-reminders) e _shared/
│   ├── migrations/           as cinco migrações, na ordem
│   ├── templates/            modelos de e-mail do Supabase
│   └── tools/                verificar_banco.sql e outras ferramentas do banco
├── tests/
│   ├── capturas/             prints gerados pelo teste de navegador
│   ├── teste_navegador.py    teste de ponta a ponta no navegador
│   └── validate.js           validador rápido
└── tools/
    └── gerar-html-unico.py   gera um index.html só, que roda sem Supabase
```
 
## Documentação
 
- [CONFIGURACAO-COMPLETA.md](docs/CONFIGURACAO-COMPLETA.md): guia completo, do banco ao site publicado.
- [ATUALIZAR-BANCO-V9.md](docs/ATUALIZAR-BANCO-V9.md) e [ATUALIZAR-BANCO-V10.md](docs/ATUALIZAR-BANCO-V10.md): como atualizar o banco nas versões 9 e 10.
- [PAGAMENTOS-MERCADO-PAGO.md](docs/PAGAMENTOS-MERCADO-PAGO.md): pagamentos com Mercado Pago, passo a passo.
- [RECUPERACAO-DE-SENHA.md](docs/RECUPERACAO-DE-SENHA.md): configuração da recuperação de senha.
- [COMO-EDITAR.md](docs/COMO-EDITAR.md): como mudar cores, textos e ícones sem quebrar nada.
## Versões
 
- **11:** nova identidade visual e cadastro em uma tela só.
- **10:** pacotes de elementos pagos e pagamentos com Mercado Pago (Checkout Pro).
- **9:** projetos ligados a arquivos, anexos (imagens e PDFs) e 23 modelos novos.
- **8:** perfil completo e pagamentos.
## Créditos
 
Projeto Integrador · CEUB · 2026.
 

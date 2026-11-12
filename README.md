# Portfy

Organizador de carreira: currículo e portfólio, projetos, agenda, notas e Agente de IA.
Projeto Integrador · CEUB · 2026.

HTML + CSS + JavaScript puro (sem build), organizado em **MVC**, com **Supabase** (Auth, Postgres com RLS, Storage, Edge Functions) e IA (Gemini).

## Como rodar

1. Preencha `js/config.js` com a URL e a chave **anon** do Supabase (sem preencher, o app roda em *modo demonstração*, salvando no navegador).
2. Sirva a pasta: `python3 -m http.server 8000` e abra `http://localhost:8000`.
3. Depois de editar qualquer arquivo, rode `node tests/validate.js` (precisa do Node). Ele avisa se algo quebrou.
4. Teste de navegador (opcional; precisa de Python com `pip install playwright` e `python -m playwright install chromium`). Ele roda na versão de demonstração, então gere-a antes: `python3 tools/gerar-html-unico.py` e depois `python3 tests/teste_navegador.py ../entregas/index.html`. Percorre as telas, o editor, as compras simuladas e a IA, sem internet e sem Supabase.

## Estrutura

```
index.html                 páginas, ícones (sprite) e rodapé
css/   base · landing · auth · app          (cores e medidas em base.css)
js/
  config.js                chaves do Supabase
  utils.js                 funções pequenas ($, esc, ico, datas…)
  main.js                  ponto de entrada e atalhos
  models/                  dados e regras (state, constants, chat, document, activity)
  views/                   desenham HTML (ui, pages, billing, chat, modal, editor)
  controllers/             reagem aos cliques (auth, app, data, ai, remote, billing, profile, editor)
  services/                fala com fora (portfy-api = Supabase, ai, storage, export = baixar PDF/PNG/JPG/HTML)
supabase/                  migrations SQL, Edge Function ai-chat, ferramentas
tests/validate.js          validador rápido
docs/COMO-EDITAR.md        guia de edição segura
docs/RECUPERACAO-DE-SENHA.md  como funciona e o que configurar no Supabase
docs/ATUALIZAR-BANCO-V10.md  banco da versão 10 (pacotes): passo a passo e conferência
docs/PAGAMENTOS-MERCADO-PAGO.md  pagamento real de planos e pacotes: passo a passo, testes e produção
```

## Banco e IA

- Migrations: `supabase/migrations/`. Rode as cinco na ordem do nome (são idempotentes) e depois `supabase/tools/verificar_banco.sql`. As permissões do service_role já estão dentro da migração inicial, então não é preciso rodar `supabase/tools/permissoes_service_role.sql` à parte.
- Publicar a função de IA: `npx supabase functions deploy ai-chat`.
- Pagamentos e pacotes: rode as migrações na ordem (a versão 10 está em `docs/ATUALIZAR-BANCO-V10.md`), configure os segredos e publique `create-checkout`, `check-payment` e `payment-webhook --no-verify-jwt`. Tudo em `docs/PAGAMENTOS-MERCADO-PAGO.md`.
- Nunca coloque a chave `service_role` nem chaves de IA no front-end.

## Agente de IA

Pausar / Continuar / Parar durante a digitação, até 20 conversas salvas (lista lateral), título automático, limite diário por plano.

## Recuperação de senha

Esqueci a senha > e-mail do Supabase > volta ao site > tela própria **Criar nova senha**. Configuração no painel (URL Configuration e Email Templates): veja `docs/RECUPERACAO-DE-SENHA.md`.

## Novidades da versão 11 (`identidade e cadastro`)

- **Nova identidade:** logo com um envelope branco sobre um bloco azul em degradê. Paleta azul-marinho, com o verde só em detalhes. Títulos em Plus Jakarta Sans, texto em Inter e código em JetBrains Mono.
- **Landing:** saiu o botão "Ver os modelos" do topo. Fica só "Criar conta grátis".
- **Cadastro em uma tela só:** conta e as três perguntas do momento no mesmo formulário, com um botão. A tela de diagnóstico separada foi removida. No Supabase, as respostas vão para a conta; se a confirmação por e-mail estiver ligada, ficam guardadas no navegador até o primeiro acesso depois de confirmar.
- **Correção:** login, cadastro, recuperação e nova senha não aparecem mais todos juntos. Só o formulário ativo fica visível.
- **Tema escuro:** os botões brancos dos banners ficaram legíveis.

## Novidades da versão 10 (`pacotes v10`)

- **Pacotes de elementos pagos** (Startup, Criativo e Dados e Tech): compra única pelo Mercado Pago, liberada na conta e sem validade. O Premium já inclui todos.
- **Vitrine de pacotes** na Landing e na tela de Planos, com prévia dos elementos.
- **Editor:** elementos que o plano atual não libera aparecem apagados, com cadeado. Painel de propriedades, atalhos e zoom corrigidos.
- **Agente de IA:** as sugestões da Início abrem a conversa, e a lista de conversas mostra o horário.
- **Arquivo único:** `tools/gerar-html-unico.py` gera um `index.html` que roda sem Supabase e sem SQL, para ver todas as telas.
- Migração nova: `supabase/migrations/20261110000000_v10_pacotes.sql` (passo a passo em `docs/ATUALIZAR-BANCO-V10.md`).

## Novidades da versão 8 (`pagamentos-perfil-editor v8`)

- **Pagamento real** dos planos com Mercado Pago (Pix, cartão, boleto), validade de 30 dias e histórico na tela de Planos.
- **Perfil completo**: foto (com recorte automático), nome, profissão, cidade, LinkedIn, GitHub, habilidades e indicador de perfil completo.
- **Editor profissional**: desfazer/refazer, camadas (ocultar, travar, reordenar), alinhamento, ímã com guias, giro, 8 tipos de elemento, mais fontes, sombra, borda, transparência, tamanhos de página, zoom e atalhos (Ctrl+Z/Y/D/C/V/S).
- **Baixar** de verdade em PDF, PNG, JPG ou HTML, sem passar pela impressora (no editor e em *Meus arquivos*). O plano Premium baixa sem marca.
- **Projetos (v9)**: sem porcentagem; cada projeto é vinculado a um arquivo e abre direto nele. Novo botão **Anexos** (imagens e PDFs) em Projetos, Modelos e no editor, e **23 modelos** com assistente de personalização. Veja docs/ATUALIZAR-BANCO-V9.md.

/* =====================================================================
   PORTFY · js/main.js
   Camada: Inicialização
   Liga o Supabase (se o config.js estiver preenchido), monta a landing,
   trata os atalhos de teclado e abre a tela certa ao carregar.
   ===================================================================== */

// 1. Detecta, ANTES de o Supabase limpar o endereço, como a pessoa chegou:
//    - pelo link de "esqueci a senha" (token no endereço ou no #hash)
//    - por um link vencido ou já usado
const QS = new URLSearchParams(location.search);
const HS = new URLSearchParams(location.hash.replace(/^#/, ''));
const RECOVERY_TOKEN = QS.get('type') === 'recovery' ? QS.get('token_hash') : null; // ?token_hash=...&type=recovery
const RECOVERY_HASH = HS.get('type') === 'recovery'; // #access_token=...&type=recovery
const LINK_ERROR = HS.get('error_description') || QS.get('error_description'); // link vencido ou já usado

const BUILD = 'v11 · nova identidade e cadastro em uma tela';
const REDIRECT_URL = location.origin + location.pathname; // para onde o link do e-mail traz a pessoa de volta (precisa estar em Authentication > URL Configuration > Redirect URLs)

// 2. Conecta ao Supabase quando o config.js estiver preenchido; senão usa o localStorage
if (USE_SUPABASE) PortfyAPI.init(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

/* ---------- Atalhos de teclado ----------
   Ctrl/⌘ + K  busca e comandos      /  foca a busca da tela
   Esc         fecha janelas e menus */
document.addEventListener('keydown', (e) => {
  const mod = e.ctrlKey || e.metaKey,
    k = e.key.toLowerCase();
  if (mod && k === 'k' && me) {
    e.preventDefault();
    return cmdkOpen();
  }
  if (e.key === 'Escape') {
    if ($('#cmdk-ov').classList.contains('on')) return cmdkClose();
    closePops();
    closeM();
    closeInfo();
    closeWz();
    closeLib();
    closeDlMenus();
    if (me && $('#app').classList.contains('sb-open')) $('#app').classList.remove('sb-open');
  }
  if (
    e.key === '/' &&
    me &&
    !e.target.closest(
      'input,textarea,select,[contenteditable="true"],[contenteditable="plaintext-only"]'
    ) &&
    !$('#ed').classList.contains('on')
  ) {
    e.preventDefault();
    $('#q').focus();
  }
});

// Ao redimensionar a janela, as miniaturas acompanham a largura nova
addEventListener('resize', () => fitThumbs());

// Ordem ao abrir o site: tema e landing > modo (Supabase ou local) > links de recuperação > sessão já aberta.
(async function init() {
  const theme = ls.get('pf_theme', null);
  if (theme) document.documentElement.dataset.theme = theme;

  // A landing é montada com os mesmos modelos, elementos e pacotes do app
  renderLanding();
  fitThumbs();

  // Faixa que mostra em qual modo o site está (ajuda a saber se os dados vão para o banco)
  $('#mode-badge').textContent = USE_SUPABASE
    ? 'Conectado ao Supabase · ' + new URL(CONFIG.SUPABASE_URL).hostname.split('.')[0]
    : 'Modo demonstração: os dados ficam só neste navegador';

  // Selo "sistemas operacionais" do rodapé da landing
  if (USE_SUPABASE) PortfyAPI.ping().then((r) => setStatus(r.ok, r.message || ''));
  else setStatus(null, '');

  // Modo local: reabre a sessão guardada no navegador
  if (!USE_SUPABASE) {
    if (ls.get('pf_session', null)) enter();
    return;
  }

  // Diagnóstico (F12 > Console): mostra a versão do código e o endereço de retorno do e-mail
  console.info(
    '[Portfy] versão:',
    BUILD,
    '| endereço do site:',
    REDIRECT_URL,
    '| link de recuperação:',
    RECOVERY_TOKEN
      ? 'token_hash'
      : RECOVERY_HASH
        ? '#hash'
        : LINK_ERROR
          ? 'erro: ' + LINK_ERROR
          : 'nenhum'
  );

  // Modo Supabase: "esqueci a senha" só pede o e-mail (o resto vai por link)
  $('#f-pw-wrap').style.display = 'none';
  $('#a-forgot > p').textContent =
    'Informe seu e-mail e enviaremos um link para redefinir a senha.';
  $('#a-forgot button[type="submit"]').textContent = 'Enviar link';
  $('#f-redir').textContent = 'O link do e-mail voltará para: ' + REDIRECT_URL;

  // Aviso se o banco ainda não foi criado e atalho de diagnóstico: await portfyDiag()
  PortfyAPI.ping().then((r) => {
    if (!r.ok) {
      console.error(r.message);
      toast(r.message);
    }
  });
  globalThis.portfyDiag = async () => {
    const r = await PortfyAPI.diagnose();
    console.table(r);
    return r;
  };

  // Quando o supabase-js confirma um link de recuperação, abre a tela de nova senha
  PortfyAPI.onAuth((event) => {
    if (event === 'PASSWORD_RECOVERY') recoveryReady();
  });

  // Recuperação de senha: cada caso abre uma tela própria (nova senha, validando ou link inválido)
  if (LINK_ERROR) return recoveryFail(LINK_ERROR);
  if (RECOVERY_TOKEN) return recoveryFromToken(RECOVERY_TOKEN);
  if (RECOVERY_HASH) return recoveryFromHash();
  if (recFlag.has()) {
    // a página foi recarregada no meio da troca de senha
    if (await PortfyAPI.session()) return recoveryReady();
    recFlag.clear();
  }
  try {
    if (await PortfyAPI.session()) {
      await bootRemote();
      await handlePaymentReturn();
    }
  } catch (ex) {
    console.error(ex);
  }
})();

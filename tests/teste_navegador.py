#!/usr/bin/env python3
# =====================================================================
# PORTFY · tests/teste_navegador.py
# Teste de ponta a ponta no navegador (Playwright + Chromium).
# Roda o index.html em MODO DEMONSTRAÇÃO e percorre o site como uma pessoa:
# landing, cadastro, diagnóstico, todas as telas, editor, compra de pacote
# e de plano (simulada), Agente de IA, busca (Ctrl+K), tema, perfil e
# sair/entrar. Confere também estouro lateral em 1366, 820 e 390 px.
# Não precisa de internet nem de Supabase: bloqueia tudo que é externo.
#
# Uso:
#     pip install playwright && python -m playwright install chromium
#     python3 tests/teste_navegador.py [caminho/index.html] [pasta/das/capturas]
# =====================================================================
import pathlib
import re
import sys
import time

from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ARQ = (
    pathlib.Path(sys.argv[1]).resolve()
    if len(sys.argv) > 1
    else RAIZ.parent / 'entregas' / 'index.html'
)
SAIDA = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else RAIZ / 'tests' / 'capturas'
SAIDA.mkdir(parents=True, exist_ok=True)

EMAIL = f'teste{int(time.time())}@exemplo.com'
SENHA = 'Teste1234'
PAGINAS = ['dash', 'proj', 'mod', 'por', 'notas', 'cal', 'age', 'ia', 'plan', 'perf', 'cfg']

resultados = []   # (passou, nome, detalhe)
erros = []        # erros de JavaScript e do console


def ok(nome, cond, detalhe=''):
    resultados.append((bool(cond), nome, detalhe))


def bloqueia_externos(route):
    if route.request.url.startswith(('file:', 'data:', 'blob:')):
        route.continue_()
    else:
        route.abort()


def estouro(page):
    return page.evaluate(
        'document.documentElement.scrollWidth - document.documentElement.clientWidth'
    )


def icones_faltando(page):
    return page.evaluate("""() => [...document.querySelectorAll('use')]
        .map(u => u.getAttribute('href') || '')
        .filter(h => h.startsWith('#') && !document.getElementById(h.slice(1)))""")


def passo(nome, fn):
    """Roda um bloco do teste; se algo quebrar, registra e segue para o próximo."""
    try:
        fn()
    except Exception as e:  # noqa: BLE001 - o teste precisa continuar
        ok(f'{nome} (interrompido)', False, str(e).splitlines()[0][:220])


with sync_playwright() as p:
    navegador = p.chromium.launch()
    ctx = navegador.new_context(viewport={'width': 1366, 'height': 900}, locale='pt-BR')
    ctx.route('http*://*', bloqueia_externos)
    page = ctx.new_page()
    page.set_default_timeout(8000)
    page.on('pageerror', lambda e: erros.append('erro na página: ' + str(e)[:300]))
    page.on(
        'console',
        lambda m: erros.append('console: ' + m.text[:300])
        if m.type == 'error'
        and 'net::ERR' not in m.text
        and 'Failed to load resource' not in m.text
        else None,
    )
    page.goto(ARQ.as_uri())
    page.wait_for_load_state('load')

    # ---------------- 1. Landing ----------------
    def landing():
        ok('landing aparece', page.is_visible('#land'))
        ok(
            'landing: sem "Ver os modelos" no topo',
            page.locator('#land a', has_text='Ver os modelos').count() == 0,
        )
        ok('landing: modelos carregados', page.locator('#land-models > *').count() > 0,
           page.locator('#land-models > *').count())
        ok('landing: elementos carregados', page.locator('#land-els > *').count() >= 6)
        ok('landing: três pacotes à venda', page.locator('#land-packs > *').count() == 3)
        ok(
            'landing: mock do editor estilizado',
            page.evaluate("getComputedStyle(document.querySelector('.mk-hd')).position")
            == 'absolute',
        )
        ult = page.evaluate(
            "(() => { const c = document.querySelectorAll('.bento > .bc'); "
            "return [c[c.length - 1].getBoundingClientRect().width, "
            "document.querySelector('.bento').clientWidth]; })()"
        )
        ok(
            'landing: último cartão de recursos ocupa a linha',
            ult[0] >= 0.97 * ult[1],
            [round(v) for v in ult],
        )
        antes = page.get_attribute('html', 'data-theme')
        page.locator('#land .nav .ic').first.click()
        ok('tema alterna na landing', page.get_attribute('html', 'data-theme') != antes)
        page.locator('#land .nav .ic').first.click()
    passo('landing', landing)

    # ---------------- 2. Cadastro e diagnóstico ----------------
    def cadastro():
        page.locator('#land .nav button', has_text='Começar grátis').first.click()
        page.wait_for_selector('#a-reg', state='visible')
        ok(
            'cadastro: só o formulário de cadastro aparece (sem as outras telas ao lado)',
            page.evaluate(
                "[...document.querySelectorAll('.ac')]"
                ".filter(f => getComputedStyle(f).display !== 'none').map(f => f.id)"
            )
            == ['a-reg'],
        )
        page.fill('#r-nm', 'Ana Teste Silva')
        page.fill('#r-em', EMAIL)
        page.fill('#r-pw', SENHA)
        page.fill('#r-cf', SENHA)
        page.select_option('#d1', index=2)
        page.select_option('#d2', index=2)
        page.select_option('#d3', index=1)
        page.click('#a-reg button[type=submit]')
        page.wait_for_selector('#app', state='visible')
        ok('cadastro é uma tela só (sem etapa separada)', page.locator('#a-diag').count() == 0)
        ok(
            'respostas do cadastro ficam na conta',
            page.evaluate("Array.isArray(D.diag) && D.diag.length === 3"),
        )
        ok('cadastro leva ao painel', page.is_visible('#app'))
        ok('painel mostra o nome', 'Ana' in page.inner_text('.hc h2'), page.inner_text('.hc h2'))
        ok('início mostra os 4 indicadores', page.locator('.kpi').count() == 4)
    passo('cadastro', cadastro)

    # ---------------- 3. Todas as telas ----------------
    def telas(largura=None):
        for pid in PAGINAS:
            page.evaluate(f"go('{pid}')")
            page.wait_for_timeout(120)
            tam = page.evaluate("document.querySelector('#pc').innerHTML.length")
            ok(f'tela {pid} renderiza', tam > 300, tam)
            falt = icones_faltando(page)
            ok(f'tela {pid}: ícones existem', not falt, falt[:5])
            ok(f'tela {pid}: sem estouro lateral', estouro(page) <= 1, estouro(page))
            if largura is None or largura == 1366:
                page.screenshot(path=str(SAIDA / f'1366-{pid}.png'), full_page=True)
    passo('telas', telas)

    # ---------------- 4. Editor ----------------
    def editor():
        page.evaluate("go('mod')")
        page.locator('#pc button', has_text=re.compile(r'Personalizar|Usar')).first.click()
        page.wait_for_selector('#wz-ov.on')
        page.locator('#wz-md button', has_text=re.compile(r'Criar|Abrir|Usar|Começar')).last.click()
        page.wait_for_selector('#ed.on')
        n0 = page.locator('#ed-page .el').count()
        ok('editor abre com elementos do modelo', n0 >= 3, n0)
        escala = page.evaluate('Ed.scale')
        ok('editor: página com zoom legível (não encolhida)', escala >= 0.3, round(escala, 2))
        ok(
            'editor: área central com largura útil',
            page.evaluate("document.getElementById('ed-stage').clientWidth") > 600,
        )
        esq = page.evaluate(
            "document.querySelector('.ed-props').getBoundingClientRect().left"
        )
        ok('editor: propriedades à direita da página', esq > 1000)
        sobra = page.evaluate(
            "(() => { const p = document.getElementById('ed-panel'); "
            "return p.scrollWidth - p.clientWidth; })()"
        )
        ok('editor: painel de propriedades sem corte lateral', sobra <= 1)
        page.locator('.ed-tool[data-tool="el"]').click()
        liberados = page.locator('#ed-dr-b .ed-el:not(.lk-off)')
        ok('painel de elementos com itens liberados', liberados.count() > 0, liberados.count())
        liberados.first.click()
        page.wait_for_timeout(150)
        ok('adicionar elemento aumenta a página', page.locator('#ed-page .el').count() == n0 + 1)
        bloqueados = page.locator('#ed-dr-b .ed-el.lk-off')
        if bloqueados.count():
            bloqueados.first.click()
            page.wait_for_timeout(120)
            ok(
                'elemento bloqueado pelo plano não entra',
                page.locator('#ed-page .el').count() == n0 + 1,
            )
        page.locator('.ed-tool[data-tool="tx"]').click()
        page.locator('#ed-dr-b .ed-dr-sec button').first.click()
        page.wait_for_timeout(150)
        n1 = page.locator('#ed-page .el').count()
        ok('adicionar texto pronto', n1 == n0 + 2, n1)
        page.click('#ed-undo')
        page.wait_for_timeout(120)
        ok('desfazer remove o último elemento', page.locator('#ed-page .el').count() < n1)
        page.click('#ed-redo')
        page.click('.ed-tabs button[data-t="layers"]')
        ok('painel de camadas com conteúdo', len(page.inner_text('#ed-panel')) > 5)
        page.click('.ed-tabs button[data-t="props"]')
        page.click('#ed-zoom')
        ok('zoom sem erro', page.locator('#ed-zoom').count() == 1)
        page.click('#ed-dl .btn')
        ok('menu Baixar abre', page.locator('#ed-dl.open').count() == 1)
        page.keyboard.press('Escape')
        page.click('.ed-back')
        page.wait_for_selector('#app', state='visible')
        ok('voltar aos arquivos fecha o editor', not page.is_visible('#ed'))
    passo('editor', editor)

    # ---------------- 5. Pacote e plano (simulados) ----------------
    def compras():
        page.evaluate("go('plan')")
        ok('planos: três pacotes na vitrine', page.locator('.packs-g .pack').count() == 3)
        ok(
            'pacotes: preço e "pagamento único" em linhas separadas',
            page.evaluate(
                "(() => { const b = document.querySelector('.packs-g .pack .pk-p b'), "
                "s = document.querySelector('.packs-g .pack .pk-p small'); "
                "return !!b && !!s && s.getBoundingClientRect().top >= "
                "b.getBoundingClientRect().bottom - 1; })()"
            ),
        )
        page.locator('.packs-g .pack').first.locator('button', has_text='Comprar').click()
        page.wait_for_selector('#info-ov.on')
        page.click('#ck-go')
        page.wait_for_timeout(200)
        ok(
            'pacote liberado (simulação)',
            'startup' in page.evaluate('D.packs'),
            page.evaluate('D.packs'),
        )
        ok(
            'pacote aparece como liberado',
            page.locator('.packs-g .pack').first.locator('.chip.ok').count() == 1,
        )
        page.locator('#pc button', has_text='Assinar Pro').first.click()
        page.wait_for_selector('#info-ov.on')
        page.click('#ck-go')
        page.wait_for_timeout(200)
        ok('plano Pro ativado (simulação)', page.evaluate('D.plan') == 'B', page.evaluate('D.plan'))
        ok('histórico de pagamentos com as compras', page.locator('.pl-hist tbody tr').count() >= 2)
        ok('menu lateral mostra o plano Pro', 'Pro' in page.inner_text('#sb-plan'))
    passo('compras', compras)

    # ---------------- 6. Agente de IA ----------------
    def ia():
        page.evaluate("go('ia')")
        page.fill('#ci', 'Como destaco meu projeto no currículo?')
        page.press('#ci', 'Enter')
        page.wait_for_function("AIS.phase === 'type' || AIS.phase === 'pause'", timeout=10000)
        page.evaluate('aiPause()')
        ok(
            'IA: pausar a resposta',
            page.evaluate('AIS.phase') == 'pause',
            page.evaluate('AIS.phase'),
        )
        page.evaluate('aiPause()')
        page.wait_for_function("AIS.phase === 'idle'", timeout=30000)
        ok('IA: resposta chegou à conversa', page.evaluate('D.chat.length') >= 2)
        ok(
            'IA: a conversa aparece na tela',
            page.locator('#ms .msg, #ms .m-row, #ms [class*=msg]').count() >= 2,
        )
        ok(
            'IA: horário da conversa visível na lista',
            page.evaluate(
                "(() => { const s = document.querySelector('.cv-item small'); "
                "return s ? s.getBoundingClientRect().width : 0; })()"
            )
            > 20,
        )
        page.screenshot(path=str(SAIDA / '1366-ia-conversa.png'))
    passo('ia', ia)

    # ---------------- 7. Busca, novo e notificações ----------------
    def busca():
        page.keyboard.press('Control+k')
        page.wait_for_selector('#cmdk-ov.on')
        page.fill('#cmdk-q', 'planos')
        ok('Ctrl+K encontra "Planos"', page.locator('#cmdk-list .cmdk-i').count() > 0)
        page.keyboard.press('Escape')
        ok('Esc fecha a busca', page.locator('#cmdk-ov.on').count() == 0)
        page.click('#new-btn')
        ok('botão Novo abre o menu', page.is_visible('#pop-new'))
        page.keyboard.press('Escape')
        page.click('#bell')
        ok('sino abre as notificações', page.is_visible('#pop-notif'))
        page.keyboard.press('Escape')
    passo('busca', busca)

    # ---------------- 8. Perfil e configurações ----------------
    def perfil():
        page.evaluate("go('perf')")
        page.fill('#p0', 'Ana Teste Souza')
        page.locator('#pc button[type=submit]').first.click()
        page.wait_for_timeout(200)
        ok(
            'perfil: nome salvo na sessão',
            page.evaluate('me.name') == 'Ana Teste Souza',
            page.evaluate('me.name'),
        )
        ok('perfil: nome gravado na conta do navegador',
           'Ana Teste Souza' in (page.evaluate("localStorage.getItem('pf_users')") or ''))
        ok(
            'perfil: botão de biografia com IA',
            page.locator('button[onclick="bioAI()"]').count() == 1,
        )
        page.evaluate("go('cfg')")
        page.locator('#pc button', has_text='Escuro').first.click()
        ok('configurações: tema escuro', page.get_attribute('html', 'data-theme') == 'dark')
        page.locator('#pc button', has_text='Claro').first.click()
        ok('configurações: tema claro', page.get_attribute('html', 'data-theme') == 'light')
    passo('perfil', perfil)

    # ---------------- 9. Sair e entrar de novo ----------------
    def sair_entrar():
        page.click('#app .su button')
        page.wait_for_selector('#land', state='visible')
        page.locator('#land .nav button', has_text='Entrar').first.click()
        page.wait_for_selector('#a-login', state='visible')
        page.fill('#l-em', EMAIL)
        page.fill('#l-pw', SENHA)
        page.click('#a-login button[type=submit]')
        page.wait_for_selector('#app', state='visible')
        ok(
            'sair e entrar de novo mantém a conta',
            'Ana Teste' in page.inner_text('#u-nm'),
            page.inner_text('#u-nm'),
        )
        ok('o plano Pro continua depois de entrar de novo', 'Pro' in page.inner_text('#sb-plan'))
    passo('sair e entrar', sair_entrar)

    # ---------------- 10. Larguras menores ----------------
    def larguras():
        for largura, altura in ((820, 1000), (390, 844)):
            page.set_viewport_size({'width': largura, 'height': altura})
            page.wait_for_timeout(150)
            for pid in PAGINAS:
                page.evaluate(f"go('{pid}')")
                page.wait_for_timeout(90)
                e = estouro(page)
                ok(f'{largura}px · tela {pid} sem rolagem lateral', e <= 1, e)
            page.evaluate("go('dash')")
            page.screenshot(path=str(SAIDA / f'{largura}-inicio.png'), full_page=False)
        page.set_viewport_size({'width': 390, 'height': 844})
        # no celular o menu lateral fica fora da tela: a pessoa abre pelo botão ☰ antes de sair
        if page.evaluate("document.querySelector('#sb').getBoundingClientRect().left < 0"):
            page.click('.tb-menu')
            page.wait_for_timeout(250)
        page.click('#app .su button')
        page.wait_for_selector('#land', state='visible')
        e = estouro(page)
        ok('390px · landing sem rolagem lateral', e <= 1, e)
        page.screenshot(path=str(SAIDA / '390-landing.png'), full_page=False)
    passo('larguras', larguras)

    navegador.close()

# ---------------- Resultado ----------------
falhas = [r for r in resultados if not r[0]]
print(
    f'\nTestes: {len(resultados)} · OK: {len(resultados) - len(falhas)} · '
    f'FALHARAM: {len(falhas)}'
)
for passou, nome, detalhe in resultados:
    if not passou:
        print(f'  FALHOU  {nome}' + (f'  -> {detalhe}' if detalhe != '' else ''))
erros_unicos = list(dict.fromkeys(erros))
print(f'\nErros de JavaScript e do console: {len(erros_unicos)}')
for e in erros_unicos[:30]:
    print('  ', e)
print(f'\nCapturas em: {SAIDA}')
sys.exit(1 if falhas or erros_unicos else 0)

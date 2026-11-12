#!/usr/bin/env python3
# =====================================================================
# PORTFY · tools/gerar-html-unico.py
# Gera UM arquivo index.html com tudo dentro: CSS, JavaScript e ícones.
# Usa só a biblioteca padrão do Python, então não precisa instalar nada.
#
# Uso (dentro da pasta Portfy):
#     python3 tools/gerar-html-unico.py              -> cria ../entregas/index.html
#     python3 tools/gerar-html-unico.py caminho.html -> cria no caminho escolhido
#
# O arquivo gerado sai em MODO DEMONSTRAÇÃO: o js/config.js é trocado por uma
# configuração vazia. Ele não conecta ao Supabase e não precisa de nenhum SQL.
# A fonte da tipografia vem do Google Fonts quando há internet.
# =====================================================================
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SAIDA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ.parent / 'entregas' / 'index.html'

CONFIG_DEMO = """/* Versão de demonstração (arquivo único): sem Supabase. */
const CONFIG = { SUPABASE_URL: '', SUPABASE_ANON_KEY: '' };
const USE_SUPABASE = Boolean(CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY);
"""

SUPABASE_RE = re.compile(
    r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js[^"]*"></script>\s*'
)
CSS_RE = re.compile(r'<link rel="stylesheet" href="(css/[^"?]+)(?:\?[^"]*)?"\s*/?>')
JS_RE = re.compile(r'<script src="(js/[^"?]+)(?:\?[^"]*)?"></script>')


def ler(caminho):
    return (RAIZ / caminho).read_text(encoding='utf-8')


def css_inline(m):
    # uma tag </style> dentro do CSS fecharia o bloco antes da hora
    return '<style>\n' + ler(m.group(1)).replace('</style', '<\\/style') + '\n</style>'


def js_inline(m):
    caminho = m.group(1)
    codigo = CONFIG_DEMO if caminho == 'js/config.js' else ler(caminho)
    # um "</script" dentro do código fecharia a tag antes da hora
    return '<script>\n' + codigo.replace('</script', '<\\/script') + '\n</script>'


html = ler('index.html')
html = SUPABASE_RE.sub('', html)
html = CSS_RE.sub(css_inline, html)
html = JS_RE.sub(js_inline, html)

if 'src="js/' in html or 'href="css/' in html:
    sys.exit('ERRO: ainda há arquivos externos do projeto no HTML.')

SAIDA.parent.mkdir(parents=True, exist_ok=True)
SAIDA.write_text(html, encoding='utf-8')
print(f'Pronto: {SAIDA} ({SAIDA.stat().st_size // 1024} KB)')

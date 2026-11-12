/* =====================================================================
   PORTFY · js/models/elements.model.js
   Camada: Model
   Biblioteca de elementos do editor (estilo Canva): formas, ícones e
   adesivos. Cada item diz de que nível ("tier") ele é:
     free        → todos os planos
     pro         → planos Pro e Premium
     premium     → só o plano Premium (adesivos exclusivos)
     pack:<cod>  → pacote comprado à parte, ou plano Premium (que inclui todos)
   Também guarda os PACOTES à venda e a regra "o plano atual pode usar isto?".
   ===================================================================== */

/* ---------- Formas desenhadas (viewBox 0 0 100 100). Recebem a cor de preenchimento. ---------- */
const EL_POLY = (n, r, rot = -90, cx = 50, cy = 50) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((rot + (360 / n) * i) * Math.PI) / 180;
    return (cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2);
  }).join(' ');

const EL_SHAPES = {
  hex: () => `<polygon points="${EL_POLY(6, 50)}"/>`,
  chevron: () => '<path d="M0 22 L50 62 L100 22 L100 46 L50 86 L0 46Z"/>',
  burst: () =>
    `<polygon points="${Array.from({ length: 32 }, (_, i) => {
      const r = i % 2 ? 38 : 50,
        a = (((i * 360) / 32 - 90) * Math.PI) / 180;
      return (50 + r * Math.cos(a)).toFixed(2) + ',' + (50 + r * Math.sin(a)).toFixed(2);
    }).join(' ')}"/>`,
  sparkle: () =>
    '<path d="M50 0C54 36 64 46 100 50C64 54 54 64 50 100C46 64 36 54 0 50C36 46 46 36 50 0Z"/>',
  ribbon: () => '<path d="M0 12H100V70H0Z M14 70H30V98L22 90L14 98Z M70 70H86V98L78 90L70 98Z"/>',
  bubble: () =>
    '<path d="M10 8H90Q98 8 98 16V64Q98 72 90 72H46L24 92V72H10Q2 72 2 64V16Q2 8 10 8Z"/>',
  frame: () => '<path fill-rule="evenodd" d="M0 0H100V100H0Z M14 14V86H86V14Z"/>',
  cross: () => '<path d="M36 0H64V36H100V64H64V100H36V64H0V36H36Z"/>',
  semi: () => '<path d="M0 75A50 50 0 0 1 100 75Z"/>',
  pill: () => '<rect x="0" y="28" width="100" height="44" rx="22"/>',
  seal: () =>
    `<polygon points="${Array.from({ length: 120 }, (_, i) => {
      const t = (i * 2 * Math.PI) / 120,
        r = 44 + 5 * Math.cos(12 * t);
      return (50 + r * Math.cos(t)).toFixed(2) + ',' + (50 + r * Math.sin(t)).toFixed(2);
    }).join(' ')}"/>`,
  orbit: () =>
    '<path fill-rule="evenodd" d="M50 4A46 46 0 1 0 50.01 4Z M50 20A30 30 0 1 1 49.99 20Z"/><circle cx="84" cy="18" r="11"/>',
  stamp: () =>
    `<polygon points="${Array.from({ length: 160 }, (_, i) => {
      const t = (i * 2 * Math.PI) / 160,
        r = 46 + 3 * Math.cos(16 * t);
      return (50 + r * Math.cos(t)).toFixed(2) + ',' + (50 + r * Math.sin(t)).toFixed(2);
    }).join(' ')}"/>`,
  arch: () => '<path d="M0 100V50A50 50 0 0 1 100 50V100H80V50A30 30 0 0 0 20 50V100Z"/>',
  node: (c) =>
    `<circle cx="20" cy="50" r="16"/><circle cx="80" cy="20" r="13"/><circle cx="80" cy="80" r="13"/><path fill="none" stroke="${c}" stroke-width="5" d="M20 50L80 20M20 50L80 80"/>`,
  blob: () =>
    '<path d="M28 12C52-4 92 8 96 40C100 70 80 96 50 96C22 96 4 78 4 52C4 30 14 22 28 12Z"/>',
  wavy: () =>
    `<polygon points="${Array.from({ length: 96 }, (_, i) => {
      const t = (i * 2 * Math.PI) / 96,
        r = 44 + 5 * Math.sin(10 * t);
      return (50 + r * Math.cos(t)).toFixed(2) + ',' + (50 + r * Math.sin(t)).toFixed(2);
    }).join(' ')}"/>`,
  splash: () =>
    '<path d="M50 6C70 2 96 14 94 40C92 66 98 80 78 92C60 102 40 96 26 90C10 84 2 68 6 48C10 26 30 10 50 6Z"/>',
  tag: () => '<path d="M0 14Q0 0 14 0H66L100 50L66 100H14Q0 100 0 86Z"/>',
  heartshape: () =>
    '<path d="M50 88C20 66 4 48 4 30C4 14 16 4 30 4C40 4 46 10 50 18C54 10 60 4 70 4C84 4 96 14 96 30C96 48 80 66 50 88Z"/>',
  bars: () =>
    '<rect x="8" y="50" width="20" height="42" rx="4"/><rect x="40" y="20" width="20" height="72" rx="4"/><rect x="72" y="34" width="20" height="58" rx="4"/>',
  ring: () =>
    '<path fill-rule="evenodd" d="M50 0A50 50 0 1 0 50.01 0Z M50 16A34 34 0 1 1 49.99 16Z"/>',
  dots: () =>
    [20, 50, 80]
      .flatMap((y) => [20, 50, 80].map((x) => `<circle cx="${x}" cy="${y}" r="9"/>`))
      .join(''),
  cube: () =>
    '<path d="M50 4L94 28L50 52L6 28Z"/><path fill-opacity=".72" d="M6 28L50 52V96L6 72Z"/><path fill-opacity=".45" d="M94 28L50 52V96L94 72Z"/>',
};

/* Nomes legíveis das formas desenhadas */
const EL_SHAPE_NAME = {
  hex: 'Hexágono',
  chevron: 'Chevron',
  burst: 'Explosão',
  sparkle: 'Brilho',
  ribbon: 'Faixa',
  bubble: 'Balão de fala',
  frame: 'Moldura',
  cross: 'Cruz',
  semi: 'Meio círculo',
  pill: 'Pílula',
  seal: 'Selo',
  orbit: 'Órbita',
  stamp: 'Carimbo',
  arch: 'Arco',
  node: 'Conexão',
  blob: 'Blob',
  wavy: 'Círculo ondulado',
  splash: 'Respingo',
  tag: 'Etiqueta',
  heartshape: 'Coração',
  bars: 'Barras',
  ring: 'Anel de progresso',
  dots: 'Pontos',
  cube: 'Cubo',
};

/* Desenha o conteúdo de um ícone do sprite (usado no editor e na exportação) */
function iconInner(name) {
  const s = document.getElementById('i-' + name);
  return s ? s.innerHTML : '';
}

/** Marcação <svg> de um elemento do tipo "svg". ref = "icon:nome" ou "shape:nome". */
function elSVG(ref, color) {
  const [type, name] = String(ref || '').split(':');
  if (type === 'icon') {
    return `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" style="display:block;overflow:visible">${iconInner(name)}</svg>`;
  }
  const f = EL_SHAPES[name];
  if (!f) return '';
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" fill="${color}" style="display:block;overflow:visible">${f(color)}</svg>`;
}

/* ---------- Pacotes à venda (preços em centavos) ---------- */
const PACKS = [
  {
    code: 'startup',
    name: 'Pacote Startup',
    price: 1900,
    desc: 'Órbitas, carimbos e ícones de lançamento para apresentações e portfólios de produto.',
  },
  {
    code: 'cv-criativo',
    name: 'Pacote Criativo',
    price: 1490,
    desc: 'Manchas, ondas, etiquetas e corações para currículos e portfólios de design.',
  },
  {
    code: 'dados',
    name: 'Pacote Dados e Tech',
    price: 2490,
    desc: 'Gráficos, anéis de progresso, cubos e ícones de código para projetos técnicos.',
  },
];
const PACK_BY = Object.fromEntries(PACKS.map((p) => [p.code, p]));

/* ---------- Catálogo ----------
   spec = o que é criado ao clicar (k de elemento ou svg com ref); w/h = tamanho inicial. */
const EL_CATS = [
  ['formas', 'Formas'],
  ['icones', 'Ícones'],
  ['adesivos', 'Adesivos'],
];
const EL_CAT_LABEL = Object.fromEntries(EL_CATS);

const EL_LIB = [
  /* Formas básicas (gratuitas) */
  {
    id: 'rect',
    cat: 'formas',
    name: 'Retângulo',
    tier: 'free',
    spec: { k: 'rect', bg: '#2F5BEA', r: 14 },
    w: 260,
    h: 150,
  },
  {
    id: 'ellipse',
    cat: 'formas',
    name: 'Círculo',
    tier: 'free',
    spec: { k: 'ellipse', bg: '#2EC4B6' },
    w: 170,
    h: 170,
  },
  {
    id: 'tri',
    cat: 'formas',
    name: 'Triângulo',
    tier: 'free',
    spec: { k: 'tri', bg: '#F59E0B' },
    w: 170,
    h: 170,
  },
  {
    id: 'star',
    cat: 'formas',
    name: 'Estrela',
    tier: 'free',
    spec: { k: 'star', bg: '#FACC15' },
    w: 170,
    h: 170,
  },
  {
    id: 'diamond',
    cat: 'formas',
    name: 'Losango',
    tier: 'free',
    spec: { k: 'diamond', bg: '#8B5CF6' },
    w: 170,
    h: 170,
  },
  {
    id: 'arrow',
    cat: 'formas',
    name: 'Seta',
    tier: 'free',
    spec: { k: 'arrow', bg: '#EF4444' },
    w: 220,
    h: 140,
  },
  {
    id: 'line',
    cat: 'formas',
    name: 'Linha',
    tier: 'free',
    spec: { k: 'rect', bg: '#0A1A3F', r: 2, name: 'Linha' },
    w: 320,
    h: 4,
  },
  {
    id: 'hex',
    cat: 'formas',
    name: EL_SHAPE_NAME.hex,
    tier: 'free',
    spec: { k: 'svg', ref: 'shape:hex', bg: '#4C8CF5' },
    w: 170,
    h: 170,
  },
  {
    id: 'chevron',
    cat: 'formas',
    name: EL_SHAPE_NAME.chevron,
    tier: 'free',
    spec: { k: 'svg', ref: 'shape:chevron', bg: '#2453D6' },
    w: 220,
    h: 140,
  },

  /* Ícones básicos (gratuitos) */
  ...[
    'check',
    'star',
    'heart',
    'mail',
    'globe',
    'link',
    'pin',
    'calendar',
    'clock',
    'user',
    'bulb',
    'target',
    'flag',
    'bolt',
    'arrow-right',
    'check-circle',
    'info',
    'tag',
    'message',
    'users',
  ].map((n) => ({
    id: 'ic-' + n,
    cat: 'icones',
    name: n.replace(/-/g, ' '),
    tier: 'free',
    spec: { k: 'svg', ref: 'icon:' + n, bg: '#2F5BEA' },
    w: 140,
    h: 140,
  })),

  /* Formas e ícones Pro */
  ...['burst', 'sparkle', 'ribbon', 'bubble', 'frame', 'cross', 'semi', 'pill'].map((n) => ({
    id: 'pf-' + n,
    cat: 'formas',
    name: EL_SHAPE_NAME[n],
    tier: 'pro',
    spec: { k: 'svg', ref: 'shape:' + n, bg: '#FF7A45' },
    w: 180,
    h: 180,
  })),
  ...[
    'rocket',
    'trophy',
    'shield',
    'trending',
    'gift',
    'palette',
    'mic',
    'calendar-check',
    'camera',
    'package',
  ].map((n) => ({
    id: 'pi-' + n,
    cat: 'icones',
    name: n.replace(/-/g, ' '),
    tier: 'pro',
    spec: { k: 'svg', ref: 'icon:' + n, bg: '#4C8CF5' },
    w: 150,
    h: 150,
  })),

  /* Adesivos exclusivos do Premium */
  {
    id: 'px-seal',
    cat: 'adesivos',
    name: EL_SHAPE_NAME.seal,
    tier: 'premium',
    spec: { k: 'svg', ref: 'shape:seal', bg: '#F59E0B' },
    w: 200,
    h: 200,
  },
  ...['crown', 'wand', 'sparkles', 'sticker'].map((n) => ({
    id: 'px-' + n,
    cat: 'adesivos',
    name: n,
    tier: 'premium',
    spec: { k: 'svg', ref: 'icon:' + n, bg: '#F59E0B' },
    w: 160,
    h: 160,
  })),

  /* Pacote Startup */
  {
    id: 'st-orbit',
    cat: 'formas',
    name: EL_SHAPE_NAME.orbit,
    tier: 'pack:startup',
    spec: { k: 'svg', ref: 'shape:orbit', bg: '#2453D6' },
    w: 200,
    h: 200,
  },
  {
    id: 'st-stamp',
    cat: 'adesivos',
    name: EL_SHAPE_NAME.stamp,
    tier: 'pack:startup',
    spec: { k: 'svg', ref: 'shape:stamp', bg: '#F2643A' },
    w: 200,
    h: 200,
  },
  {
    id: 'st-arch',
    cat: 'formas',
    name: EL_SHAPE_NAME.arch,
    tier: 'pack:startup',
    spec: { k: 'svg', ref: 'shape:arch', bg: '#1A3FA8' },
    w: 220,
    h: 150,
  },
  {
    id: 'st-node',
    cat: 'formas',
    name: EL_SHAPE_NAME.node,
    tier: 'pack:startup',
    spec: { k: 'svg', ref: 'shape:node', bg: '#2453D6' },
    w: 220,
    h: 160,
  },
  ...['hexagon', 'zap', 'refresh', 'sliders'].map((n) => ({
    id: 'st-' + n,
    cat: 'icones',
    name: n,
    tier: 'pack:startup',
    spec: { k: 'svg', ref: 'icon:' + n, bg: '#2453D6' },
    w: 150,
    h: 150,
  })),

  /* Pacote Criativo */
  {
    id: 'cr-blob',
    cat: 'formas',
    name: EL_SHAPE_NAME.blob,
    tier: 'pack:cv-criativo',
    spec: { k: 'svg', ref: 'shape:blob', bg: '#F472B6' },
    w: 220,
    h: 200,
  },
  {
    id: 'cr-wavy',
    cat: 'formas',
    name: EL_SHAPE_NAME.wavy,
    tier: 'pack:cv-criativo',
    spec: { k: 'svg', ref: 'shape:wavy', bg: '#1A3FA8' },
    w: 200,
    h: 200,
  },
  {
    id: 'cr-splash',
    cat: 'adesivos',
    name: EL_SHAPE_NAME.splash,
    tier: 'pack:cv-criativo',
    spec: { k: 'svg', ref: 'shape:splash', bg: '#FFB020' },
    w: 200,
    h: 190,
  },
  {
    id: 'cr-tag',
    cat: 'adesivos',
    name: EL_SHAPE_NAME.tag,
    tier: 'pack:cv-criativo',
    spec: { k: 'svg', ref: 'shape:tag', bg: '#2453D6' },
    w: 240,
    h: 130,
  },
  {
    id: 'cr-heart',
    cat: 'adesivos',
    name: EL_SHAPE_NAME.heartshape,
    tier: 'pack:cv-criativo',
    spec: { k: 'svg', ref: 'shape:heartshape', bg: '#F2643A' },
    w: 170,
    h: 170,
  },
  ...['pencil', 'text', 'image', 'filter'].map((n) => ({
    id: 'cr-' + n,
    cat: 'icones',
    name: n,
    tier: 'pack:cv-criativo',
    spec: { k: 'svg', ref: 'icon:' + n, bg: '#F472B6' },
    w: 150,
    h: 150,
  })),

  /* Pacote Dados e Tech */
  {
    id: 'dt-bars',
    cat: 'formas',
    name: EL_SHAPE_NAME.bars,
    tier: 'pack:dados',
    spec: { k: 'svg', ref: 'shape:bars', bg: '#2F5BEA' },
    w: 200,
    h: 170,
  },
  {
    id: 'dt-ring',
    cat: 'formas',
    name: EL_SHAPE_NAME.ring,
    tier: 'pack:dados',
    spec: { k: 'svg', ref: 'shape:ring', bg: '#4C8CF5' },
    w: 200,
    h: 200,
  },
  {
    id: 'dt-dots',
    cat: 'formas',
    name: EL_SHAPE_NAME.dots,
    tier: 'pack:dados',
    spec: { k: 'svg', ref: 'shape:dots', bg: '#0A1A3F' },
    w: 180,
    h: 180,
  },
  {
    id: 'dt-cube',
    cat: 'formas',
    name: EL_SHAPE_NAME.cube,
    tier: 'pack:dados',
    spec: { k: 'svg', ref: 'shape:cube', bg: '#2453D6' },
    w: 180,
    h: 180,
  },
  ...['code', 'database', 'layers', 'key', 'book', 'share'].map((n) => ({
    id: 'dt-' + n,
    cat: 'icones',
    name: n,
    tier: 'pack:dados',
    spec: { k: 'svg', ref: 'icon:' + n, bg: '#2F5BEA' },
    w: 150,
    h: 150,
  })),
];

const EL_BY = Object.fromEntries(EL_LIB.map((x) => [x.id, x]));

/** Nome curto do nível para os selos (Pro, Premium ou nome do pacote). */
function elTierLabel(tier) {
  if (!tier || tier === 'free') return '';
  if (tier === 'pro') return 'Pro';
  if (tier === 'premium') return 'Premium';
  const p = PACK_BY[tier.slice(5)];
  return p ? p.name.replace('Pacote ', '') : 'Pacote';
}

/** O plano atual (e os pacotes comprados) libera este nível? */
function elAllowed(tier) {
  if (!tier || tier === 'free') return true;
  const plan = (typeof D !== 'undefined' && D && D.plan) || 'A';
  const owned = (typeof D !== 'undefined' && D && D.packs) || [];
  if (tier === 'pro') return plan === 'B' || plan === 'C';
  if (tier === 'premium') return plan === 'C';
  if (tier.indexOf('pack:') === 0) return plan === 'C' || owned.indexOf(tier.slice(5)) !== -1;
  return false;
}

/** Quantos itens um pacote tem (para mostrar na vitrine). */
const packCount = (code) => EL_LIB.filter((x) => x.tier === 'pack:' + code).length;

/** Uma cor da paleta de elementos, em rodízio, para não repetir a mesma cor em tudo. */
const EL_COLORS = [
  '#2F5BEA',
  '#14A38B',
  '#F2643A',
  '#F59E0B',
  '#8B5CF6',
  '#0A1A3F',
  '#F472B6',
  '#2453D6',
];

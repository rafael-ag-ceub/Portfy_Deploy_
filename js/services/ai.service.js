/* =====================================================================
   PORTFY · js/services/ai.service.js
   Camada: Service
   IA de demonstração (modo local, sem servidor). A IA real fica na Edge
   Function ai-chat. Aqui também fica o gerador de rascunho da biografia,
   que roda no navegador nos dois modos e sempre pede revisão.
   ===================================================================== */

/** Respostas de exemplo por assunto. A ordem importa: a primeira que combinar vence. */
const AI_DEMO = [
  [
    /\b(oi|ol[áa]|bom dia|boa tarde|boa noite)\b/,
    'Oi{NOME}! Posso ajudar com currículo, portfólio, entrevistas e rotina de estudos. Em que você está trabalhando agora?',
  ],
  [
    /curr[ií]culo|\bcv\b|resumo profissional/,
    'Um currículo que passa na triagem costuma seguir cinco regras:\n\n1. **Uma página** (ou duas, na pós-graduação), com fonte legível e margens de pelo menos 2 cm.\n2. **Resumo de 2 a 3 linhas** no topo: quem você é, o que já fez e o que procura.\n3. **Resultados com número.** "Reduzi o tempo de entrega em 30%" vale mais que "fui responsável por entregas".\n4. **Palavras da vaga** nas habilidades, no mesmo formato em que o anúncio as escreve.\n5. **Links** para portfólio, LinkedIn ou GitHub.\n\nCole um trecho do seu currículo aqui que eu reviso com você.',
  ],
  [
    /portf[óo]lio|projeto|\bcase\b/,
    'Para um portfólio que convence, mostre de **3 a 5 projetos** e conte cada um em quatro partes:\n\n- **Problema:** o que precisava ser resolvido.\n- **Seu papel:** o que você fez, de fato.\n- **Ferramentas:** o que foi usado.\n- **Resultado:** um número, mesmo que pequeno.\n\nProjetos acadêmicos também contam, desde que tenham um resultado mensurável. O modelo "Case de Projeto" ajuda a documentar um deles.',
  ],
  [
    /entrevista|entrevistar|entrevistador/,
    'Para se preparar para uma entrevista:\n\n1. **Pesquise a empresa**: produtos, clientes e notícias recentes.\n2. **Prepare três histórias** no formato SITUAÇÃO, TAREFA, AÇÃO e RESULTADO.\n3. **Treine em voz alta** as respostas para "fale sobre você" e "por que essa vaga".\n4. **Tenha perguntas prontas** sobre a equipe e os desafios da função.\n\nQuer que eu faça algumas perguntas de simulação?',
  ],
  [
    /estud|prova|rotina|foco|procrastin/,
    'Uma rotina de estudos que se sustenta costuma ter:\n\n- **Blocos de 50 minutos** com pausas de 10.\n- **Uma tarefa por bloco**, com nome claro (ex.: "Revisar capítulo 3").\n- **Revisão no fim da semana**, de 30 minutos.\n\nAdicione os blocos como tarefas no Início para acompanhar o progresso.',
  ],
  [
    /linkedin|post|banner|perfil/,
    'No LinkedIn, o título e o resumo são o que as pessoas leem primeiro. Use palavras da sua área no título, escreva o resumo na primeira pessoa e publique, por exemplo, um post por semana sobre algo que você aprendeu. Os modelos "Post com Frase" e "Banner do LinkedIn" ajudam a montar a identidade visual.',
  ],
  [
    /sal[áa]rio|negocia|proposta/,
    'Antes de negociar, pesquise faixas salariais para o cargo e a cidade, e saiba o seu mínimo. Na conversa, fale de valor entregue ("consigo reduzir X") e não de necessidades pessoais. Se a proposta vier sem margem, peça tempo para pensar e responda por escrito.',
  ],
];

/** Resposta de demonstração para uma mensagem. */
const aiR = (v) => {
  const t = String(v || '').toLowerCase();
  const nome = typeof me !== 'undefined' && me && me.name ? ', ' + me.name.split(' ')[0] : '';
  const hit = AI_DEMO.find(([re]) => re.test(t));
  const txt = hit
    ? hit[1]
    : 'Posso ajudar com currículo, portfólio, entrevistas e rotina de estudos. Conte um pouco mais sobre o que você precisa que eu respondo com um exemplo prático.';
  return txt.replace('{NOME}', nome);
};

/**
 * Rascunho de biografia montado a partir do perfil (profissão, cidade e habilidades).
 * Não usa a IA: é um ponto de partida que a pessoa revisa antes de salvar.
 */
function bioDraft() {
  const P = (typeof D !== 'undefined' && D && D.prof) || {};
  const nome = typeof me !== 'undefined' && me && me.name ? me.name.split(' ')[0] : 'Eu';
  const role = (P.role || 'profissional em formação').trim();
  const cargo = role.charAt(0).toLowerCase() + role.slice(1);
  const local = P.loc ? ` em ${P.loc.split(',')[0].trim()}` : '';
  const sk = (P.skills || []).slice(0, 3);
  const habil = sk.length
    ? ` Trabalho com ${sk.length > 1 ? sk.slice(0, -1).join(', ') + ' e ' + sk[sk.length - 1] : sk[0]}.`
    : '';
  return `${nome} é ${cargo}${local}.${habil} Busco oportunidades em que possa transformar ideias em resultados mensuráveis e continuar aprendendo com o time.`.slice(
    0,
    500
  );
}

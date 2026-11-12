/* =====================================================================
   PORTFY · js/controllers/app.controller.js
   Camada: Controller
   Navegação entre as telas, menu lateral recolhível, busca da moldura e
   a troca de mês do calendário. O desenho do menu fica em views/shell.view.js.
   ===================================================================== */

/** Botão de menu: no computador recolhe a barra lateral; no celular abre e fecha. */
function menu() {
  if (innerWidth > 900) document.body.classList.toggle('nc');
  else $('#app').classList.toggle('sb-open');
  const b = $('.sb-tg-i') && $('.sb-tg-i').closest('button');
  if (b) b.setAttribute('aria-expanded', document.body.classList.contains('nc') ? 'false' : 'true');
}

/** Troca de tela. k (opcional) mantém o texto da busca ao trocar de página. */
function go(p, k) {
  if (page === 'ia' && p !== 'ia') aiFinish(); // termina a digitação da IA antes de sair
  if (page === 'notas' && p !== 'notas' && NT.timer) {
    clearTimeout(NT.timer);
    ntFlush();
  }
  if (p !== page) closePops();
  page = p;
  if (!k) $('#q').value = '';
  $('#app').classList.remove('sb-open');
  render();
  scrollTo(0, 0);
}

/** Mês anterior (-1) ou seguinte (+1) no calendário. */
function mon(n) {
  cal.setDate(1);
  cal.setMonth(cal.getMonth() + n);
  render();
}

/** Busca da moldura: filtra a tela aberta. Telas sem filtro ignoram. */
function search() {
  if (['ia', 'perf', 'cfg', 'plan'].includes(page)) return;
  render();
}

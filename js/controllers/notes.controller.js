/* =====================================================================
   PORTFY · js/controllers/notes.controller.js
   Camada: Controller
   Notas: criar, escolher, editar com salvamento automático e excluir.
   ===================================================================== */

const NT = { sel: null, timer: null };

/** Nota que aparece no editor: a escolhida, ou a primeira da lista. */
function noteCurrent() {
  return D.notes.find((n) => sameId(n.id, NT.sel)) || D.notes[0] || null;
}

/** Troca de nota: antes, salva o que estava sendo digitado. */
function ntOpen(id) {
  if (NT.timer) {
    clearTimeout(NT.timer);
    ntFlush();
  }
  NT.sel = id;
  render();
}

async function ntNew() {
  const base = { t: 'Nova nota', c: '' };
  try {
    if (USE_SUPABASE) {
      const saved = await PortfyAPI.notes.add(base);
      D.notes.unshift(saved);
      NT.sel = saved.id;
    } else {
      const n = { id: Date.now(), ...base, upd: Date.now() };
      D.notes.unshift(n);
      NT.sel = n.id;
      save();
    }
    lg('Nova nota criada');
    render();
    setTimeout(() => {
      const t = $('#nt-title');
      if (t) {
        t.focus();
        t.select();
      }
    }, 30);
  } catch (ex) {
    toast((ex && ex.message) || 'Não foi possível criar a nota.');
  }
}

/** Digitou: atualiza a lista na hora e agenda o salvamento. */
function ntInput() {
  const n = noteCurrent();
  if (!n) return;
  n.t = $('#nt-title').value;
  n.c = $('#nt-body').value;
  n.upd = Date.now();
  const item = $(`.nt-it[data-id="${n.id}"]`);
  if (item) {
    item.querySelector('b').textContent = n.t || 'Sem título';
    item.querySelector('span').textContent =
      (n.c || '').replace(/\s+/g, ' ').slice(0, 110) || 'Sem conteúdo';
    item.querySelector('small').textContent = 'agora';
  }
  $('#nt-st').textContent = 'Salvando…';
  clearTimeout(NT.timer);
  NT.timer = setTimeout(ntFlush, 500);
}

/** Grava a nota atual (local ou no Supabase). */
async function ntFlush() {
  NT.timer = null;
  const n = noteCurrent();
  if (!n) return;
  try {
    if (USE_SUPABASE) await PortfyAPI.notes.update(n.id, { t: n.t, c: n.c });
    else save();
    const st = $('#nt-st');
    if (st) st.textContent = 'Salvo';
  } catch (ex) {
    const st = $('#nt-st');
    if (st) st.textContent = 'Não salvo. Tente de novo';
    console.error(ex);
  }
}

function ntDel() {
  const n = noteCurrent();
  if (!n) return;
  clearTimeout(NT.timer);
  NT.timer = null;
  NT.sel = null;
  del('notes', n.id);
}

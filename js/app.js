import { clearSessionFlag, hasSessionOk, markSessionOk, verifyPassword } from "./auth.js";

const ICO_SOL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`;
const ICO_LUA = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>`;
const ICO_OLHO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICO_OLHO_OFF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2"/><path d="M6.1 6.1C3.7 7.8 2 12 2 12s3.5 7 10 7a10.3 10.3 0 0 0 4.3-.9"/></svg>`;
import { downloadJson, loadStore, mergeSeedData, saveStore, uid } from "./storage.js";
import {
  FRENTES,
  STEPS,
  emptyEbd,
  emptyMessage,
  emptyTranscription,
  mindBranches,
  progress,
  promptAnalise,
  stepDone,
} from "./study.js";

const state = {
  store: loadStore(),
  view: "inicio",
  editingId: null,
  editingType: "message",
  filterFrente: "todas",
  filterQ: "",
  publicOnly: false,
};

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function frenteLabel(id) {
  return FRENTES.find((f) => f.id === id)?.label || id;
}

function statusBadge(status, publicado) {
  if (publicado) return `<span class="badge badge-ok">publicado</span>`;
  const map = { rascunho: "badge", "em estudo": "badge-warn", pronto: "badge-accent" };
  return `<span class="badge ${map[status] || "badge"}">${esc(status)}</span>`;
}

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function syncTemaIcons() {
  const dark = document.documentElement.classList.contains("dark");
  const html = dark ? ICO_SOL : ICO_LUA;
  const label = dark ? "Usar modo claro" : "Usar modo escuro";
  ["#btn-tema-auth", "#btn-tema", "#btn-tema-mobile", "#btn-tema-cfg"].forEach((sel) => {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = html;
    el.setAttribute("aria-label", label);
    el.setAttribute("title", label);
    el.setAttribute("aria-pressed", dark ? "true" : "false");
  });
}

function toggleTema() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("painel_tema", document.documentElement.classList.contains("dark") ? "escuro" : "claro");
  syncTemaIcons();
}

function applyTema() {
  if (localStorage.getItem("painel_tema") === "escuro") document.documentElement.classList.add("dark");
  syncTemaIcons();
}

function persist() {
  saveStore(state.store);
}

/* —— Auth UI —— */
async function bootAuth() {
  applyTema();
  if (hasSessionOk()) {
    await enterApp(false);
    return;
  }
  $("#auth-screen").classList.remove("hidden");
  $("#app-screen").classList.add("hidden");
  $("#auth-login")?.classList.remove("hidden");
  syncTemaIcons();
}

function bindAuth() {
  $("#btn-tema-auth")?.addEventListener("click", toggleTema);

  const input = $("#login-password");
  const btnVer = $("#btn-ver-senha");
  const icoVer = $("#ico-ver-senha");
  if (icoVer) icoVer.innerHTML = ICO_OLHO;
  btnVer?.addEventListener("click", () => {
    if (!input) return;
    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    btnVer.setAttribute("aria-pressed", mostrar ? "true" : "false");
    btnVer.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
    btnVer.setAttribute("title", mostrar ? "Ocultar senha" : "Mostrar senha");
    if (icoVer) icoVer.innerHTML = mostrar ? ICO_OLHO_OFF : ICO_OLHO;
    input.focus();
  });
  input?.addEventListener("keyup", (e) => {
    const caps = e.getModifierState?.("Caps Lock") || e.getModifierState?.("CapsLock");
    $("#caps-aviso")?.classList.toggle("hidden", !caps);
  });

  $("#form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const raw = $("#login-password")?.value ?? "";
    const ok = verifyPassword(raw);
    const err = $("#login-error");
    if (!ok) {
      err.textContent = "Senha incorreta. Toque no olho para ver o que digitou.";
      err.classList.remove("hidden");
      return;
    }
    err.classList.add("hidden");
    markSessionOk();
    await enterApp(false);
  });
  $("#btn-public-only")?.addEventListener("click", async () => {
    state.publicOnly = true;
    await enterApp(false, true);
  });
}

async function enterApp(first, publicOnly = false) {
  state.publicOnly = publicOnly;
  state.store = await mergeSeedData(loadStore());
  $("#auth-screen").classList.add("hidden");
  $("#app-screen").classList.remove("hidden");
  buildNav();
  state.view = publicOnly ? "publicados" : "inicio";
  render();
}

function buildNav() {
  const items = state.publicOnly
    ? [{ id: "publicados", label: "Prontos", ico: "◎" }]
    : [
        { id: "inicio", label: "Início", ico: "✝" },
        { id: "biblioteca", label: "Acervo", ico: "☰" },
        { id: "nova", label: "Âncora", ico: "＋" },
        { id: "estudo", label: "Linha", ico: "◇" },
        { id: "mapa", label: "Mapa", ico: "✦" },
        { id: "transcricoes", label: "Vozes", ico: "✎" },
        { id: "ebd", label: "EBD", ico: "▣" },
        { id: "publicados", label: "Prontos", ico: "◎" },
        { id: "config", label: "Ajustes", ico: "⚙" },
      ];

  const side = $("#side-nav");
  side.innerHTML = items
    .map(
      (i) =>
        `<button type="button" class="nav-link ${state.view === i.id ? "active" : ""}" data-nav="${i.id}"><span class="ico">${i.ico}</span>${i.label}</button>`,
    )
    .join("");

  const bottomItems = state.publicOnly
    ? [{ id: "publicados", label: "Prontos", ico: "◎" }]
    : [
        { id: "inicio", label: "Início", ico: "✝" },
        { id: "biblioteca", label: "Acervo", ico: "☰" },
        { id: "nova", label: "Âncora", fab: true },
        { id: "estudo", label: "Linha", ico: "◇" },
        { id: "mais", label: "Mais", ico: "▦" },
      ];

  $("#bottom-nav").innerHTML = bottomItems
    .map((i) => {
      if (i.fab) {
        return `<div class="fab-wrap"><button type="button" class="fab" data-nav="nova" aria-label="Nova âncora">✝</button><span style="font-size:0.68rem;font-weight:600;color:#93aa9f">Âncora</span></div>`;
      }
      const active = state.view === i.id || (i.id === "mais" && ["mapa", "transcricoes", "ebd", "publicados", "config"].includes(state.view));
      return `<button type="button" class="bottom-item ${active ? "active" : ""}" data-nav="${i.id}"><span class="pill">${i.ico}</span>${i.label}</button>`;
    })
    .join("");

  $$("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-nav");
      if (id === "mais") {
        state.view = "mais";
      } else {
        state.view = id;
      }
      buildNav();
      render();
      window.scrollTo(0, 0);
    });
  });

  $("#btn-tema")?.addEventListener("click", toggleTema);
  $("#btn-tema-mobile")?.addEventListener("click", toggleTema);
  syncTemaIcons();
  $("#btn-sair")?.addEventListener("click", () => {
    clearSessionFlag();
    state.publicOnly = false;
    bootAuth();
  });
}

function go(view, opts = {}) {
  if (opts.id) state.editingId = opts.id;
  if (opts.type) state.editingType = opts.type;
  state.view = view;
  buildNav();
  render();
  window.scrollTo(0, 0);
}

/* —— Views —— */
function render() {
  const root = $("#view-root");
  const map = {
    inicio: viewInicio,
    biblioteca: viewBiblioteca,
    nova: viewNova,
    estudo: viewEstudo,
    mapa: viewMapa,
    transcricoes: viewTranscricoes,
    ebd: viewEbd,
    publicados: viewPublicados,
    config: viewConfig,
    mais: viewMais,
  };
  (map[state.view] || viewInicio)(root);
}

function viewInicio(root) {
  const msgs = state.store.messages;
  const estudo = msgs.filter((m) => m.status === "em estudo" || m.status === "rascunho").length;
  const pronto = msgs.filter((m) => m.publicado || m.status === "pronto").length;

  root.innerHTML = `
    <div class="page-head">
      <p class="muted">${saudacao()}</p>
      <h1>Estudo da <span class="accent">Palavra</span></h1>
    </div>
    <div class="quick no-print">
      <button type="button" data-go="nova"><span class="ico">✝</span>Âncora</button>
      <button type="button" data-go="estudo"><span class="ico">◇</span>Linha</button>
      <button type="button" data-go="mapa"><span class="ico">✦</span>Mapa</button>
      <button type="button" data-go="ebd"><span class="ico">▣</span>EBD</button>
    </div>
    <div class="grid-2" style="margin-bottom:1rem">
      <div class="card kpi"><span class="label">Em estudo</span><span class="value">${estudo}</span></div>
      <div class="card kpi"><span class="label">Prontos</span><span class="value">${pronto}</span></div>
    </div>
    <div class="card">
      <div class="card-title"><div><h2>Frentes</h2></div></div>
      <div class="grid-2">
        ${FRENTES.map(
          (f) => `
          <button type="button" class="card" style="padding:0.85rem;cursor:pointer;text-align:left" data-frente="${f.id}">
            <strong>${f.label}</strong>
            <p class="muted" style="margin:0.25rem 0 0;font-size:0.8rem">${f.hint}</p>
          </button>`,
        ).join("")}
      </div>
    </div>
  `;
  $$("[data-go]", root).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  $$("[data-frente]", root).forEach((b) => {
    b.addEventListener("click", () => {
      state.filterFrente = b.dataset.frente;
      go("biblioteca");
    });
  });
}

function messageCard(m) {
  const p = progress(m);
  return `
    <button type="button" class="card list-item" data-open="${m.id}" style="display:block;width:100%;text-align:left;cursor:pointer">
      <div style="display:flex;justify-content:space-between;gap:0.75rem;align-items:flex-start">
        <div style="min-width:0">
          <h3>${esc(m.tema || m.ideiaCentral || "Sem tema")}</h3>
          <p>${esc(m.textoBaseRef || "Sem texto-base")} · ${frenteLabel(m.frente)}</p>
          <div class="chips">${statusBadge(m.status, m.publicado)}<span class="badge">${p.done}/${p.total} etapas</span></div>
        </div>
        <span class="muted" style="font-size:0.75rem;flex-shrink:0">${p.pct}%</span>
      </div>
    </button>`;
}

function viewBiblioteca(root) {
  let list = [...state.store.messages].sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  if (state.filterFrente !== "todas") list = list.filter((m) => m.frente === state.filterFrente);
  if (state.filterQ) {
    const q = state.filterQ.toLowerCase();
    list = list.filter((m) => `${m.tema} ${m.ideiaCentral} ${m.textoBaseRef}`.toLowerCase().includes(q));
  }
  root.innerHTML = `
    <div class="page-head"><p class="muted">Mensagens</p><h1>Acervo</h1></div>
    <div class="filter-bar no-print">
      <select id="filtro-frente">
        <option value="todas">Todas as frentes</option>
        ${FRENTES.map((f) => `<option value="${f.id}" ${state.filterFrente === f.id ? "selected" : ""}>${f.label}</option>`).join("")}
      </select>
      <input type="search" id="filtro-q" placeholder="Buscar tema ou texto" value="${esc(state.filterQ)}" style="flex:1;min-width:10rem" />
      <button type="button" class="btn btn-primary btn-sm" data-go="nova">Nova</button>
    </div>
    <div class="list">${list.length ? list.map(messageCard).join("") : `<div class="card empty">Nenhuma mensagem ainda. Crie a primeira.</div>`}</div>
  `;
  $("#filtro-frente").addEventListener("change", (e) => {
    state.filterFrente = e.target.value;
    render();
  });
  $("#filtro-q").addEventListener("input", (e) => {
    state.filterQ = e.target.value;
    render();
  });
  $$("[data-go]", root).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  $$("[data-open]", root).forEach((b) =>
    b.addEventListener("click", () => {
      state.editingId = b.dataset.open;
      go("estudo");
    }),
  );
}

function getEditingMessage() {
  return state.store.messages.find((m) => m.id === state.editingId) || null;
}

function viewNova(root) {
  const edit = getEditingMessage();
  const m = edit || emptyMessage(state.filterFrente !== "todas" ? state.filterFrente : "igreja");
  root.innerHTML = `
    <div class="page-head"><p class="muted">${edit ? "Editar" : "Nova"}</p><h1>${edit ? "Ajustar âncora" : "Âncora bíblica"}</h1></div>
    <form id="form-nova" class="card stack">
      <div class="grid-2">
        <div class="field"><label>Frente</label>
          <select name="frente">${FRENTES.map((f) => `<option value="${f.id}" ${m.frente === f.id ? "selected" : ""}>${f.label} — ${f.hint}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Tom</label>
          <select name="tom">
            ${["pastoral", "impactante", "motivacional", "ensino", "corporativo"].map((t) => `<option ${m.tom === t ? "selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="field"><label>Tema</label><input name="tema" required value="${esc(m.tema)}" placeholder="Ex.: Perdão que restaura" /></div>
      <div class="field"><label>Ideia central (uma frase)</label><input name="ideiaCentral" value="${esc(m.ideiaCentral)}" placeholder="A frase que carrega tudo" /></div>
      <div class="grid-2">
        <div class="field"><label>Texto-base (referência)</label><input name="textoBaseRef" required value="${esc(m.textoBaseRef)}" placeholder="Ex.: Lucas 15:11-24" /></div>
        <div class="field"><label>Versão</label><input name="versaoBiblia" value="${esc(m.versaoBiblia || "NVI")}" /></div>
      </div>
      <div class="field"><label>Citação do texto-base</label><textarea name="textoBaseCitacao" rows="4" placeholder="Cole o texto bíblico">${esc(m.textoBaseCitacao)}</textarea></div>
      <div class="field"><label>Notas para a próxima análise</label><textarea name="notas" rows="2" placeholder="O que enfatizar nesta etapa">${esc(m.notas)}</textarea></div>
      <div class="btn-row">
        <button type="submit" class="btn btn-primary">${edit ? "Salvar base" : "Criar e ir ao estudo"}</button>
        ${edit ? `<button type="button" class="btn btn-secondary" id="btn-to-estudo">Ir ao estudo</button>` : ""}
      </div>
    </form>
  `;
  $("#form-nova").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (edit) {
      Object.assign(edit, data, { updatedAt: new Date().toISOString(), status: edit.status === "rascunho" ? "em estudo" : edit.status });
      state.editingId = edit.id;
    } else {
      const neu = { ...emptyMessage(data.frente), ...data, id: uid("msg"), status: "em estudo" };
      state.store.messages.unshift(neu);
      state.editingId = neu.id;
    }
    persist();
    go("estudo");
  });
  $("#btn-to-estudo")?.addEventListener("click", () => go("estudo"));
}

function viewEstudo(root) {
  const list = state.store.messages;
  if (!state.editingId && list[0]) state.editingId = list[0].id;
  const m = getEditingMessage();
  if (!m) {
    root.innerHTML = `<div class="page-head"><h1>Linha</h1></div><div class="card empty">Crie uma âncora primeiro.</div>
      <button type="button" class="btn btn-primary" style="margin-top:1rem" data-go="nova">Nova âncora</button>`;
    $("[data-go]", root)?.addEventListener("click", () => go("nova"));
    return;
  }
  if (!Array.isArray(m.analises)) m.analises = [];
  const step = STEPS[m.stepIndex] || STEPS[0];
  const p = progress(m);
  const prompt = promptAnalise({ mensagem: m, etapa: step.id, pedido: m.notas || "" });

  root.innerHTML = `
    <div class="page-head">
      <p class="muted">${frenteLabel(m.frente)} · ${esc(m.textoBaseRef || "sem texto")}</p>
      <h1>${esc(m.tema || "Mensagem")}</h1>
    </div>

    <div class="filter-bar no-print">
      <select id="sel-msg" style="flex:1;min-width:12rem">
        ${list.map((x) => `<option value="${x.id}" ${x.id === m.id ? "selected" : ""}>${esc(x.tema || x.id)}</option>`).join("")}
      </select>
      <span class="badge badge-accent">${p.done}/${p.total}</span>
    </div>

    <div class="card topic-board no-print">
      <div class="card-title"><div><h2>Tópicos</h2><p>Toque em um · trabalhe só ele</p></div></div>
      <div class="topic-grid">
        ${STEPS.map((s, i) => {
          const done = stepDone(m, s.id);
          const active = i === m.stepIndex;
          return `<button type="button" class="topic-item ${done ? "done" : ""} ${active ? "active" : ""}" data-step="${i}">
            <span class="topic-num">${i + 1}</span>
            <span class="topic-name">${esc(s.short)}</span>
            <span class="topic-state">${done ? "ok" : active ? "agora" : "—"}</span>
          </button>`;
        }).join("")}
      </div>
    </div>

    <div class="aviso ok no-print" style="margin-top:1rem">
      <strong>Agora:</strong>&nbsp;${esc(step.action)}
    </div>

    <form id="form-step" class="card step-panel" style="margin-top:0.75rem">
      <div class="card-title">
        <div>
          <h2 style="margin:0;font-size:1.05rem">${esc(step.title)}</h2>
          <p>${esc(step.hint)}</p>
        </div>
        <span class="badge badge-accent">1 tópico</span>
      </div>
      ${renderStepFields(m, step.id)}
      <div class="btn-row" style="margin-top:0.5rem">
        <button type="button" class="btn btn-secondary" id="btn-prev" ${m.stepIndex === 0 ? "disabled" : ""}>Anterior</button>
        <button type="submit" class="btn btn-primary">Salvar tópico</button>
        <button type="button" class="btn btn-secondary" id="btn-next" ${m.stepIndex >= STEPS.length - 1 ? "disabled" : ""}>Próximo</button>
      </div>
    </form>

    <details class="card" style="margin-top:1rem">
      <summary class="card-title" style="cursor:pointer;list-style:none;margin:0">
        <div><h2>Prompt desta análise</h2><p>Copie para pedir no chat · só este tópico</p></div>
      </summary>
      <pre class="prompt-box" id="prompt-box">${esc(`Rol:\n${prompt.rol}\n\nObjetivo/Ordem:\n${prompt.objetivoOrdem}\n\nContexto:\n${prompt.contexto}\n\nEspecificidade/Expectativas:\n${prompt.especificidade}`)}</pre>
      <div class="btn-row" style="margin-top:0.75rem">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-prompt">Copiar prompt</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-log-analise">Registrar análise</button>
      </div>
    </details>

    <div class="card" style="margin-top:1rem">
      <div class="card-title"><div><h2>Visão por tópicos</h2><p>Resumo objetivo do que já está pronto</p></div></div>
      ${renderReadout(m)}
    </div>

    ${
      m.analises.length
        ? `<div class="card" style="margin-top:1rem">
            <div class="card-title"><div><h2>Histórico de análises</h2><p>Uma entrada por pedido</p></div></div>
            <ul class="analise-list">
              ${[...m.analises]
                .reverse()
                .slice(0, 8)
                .map(
                  (a) =>
                    `<li><strong>${esc(a.topico)}</strong> · ${esc(a.data)}<br/><span class="muted">${esc(a.nota || "sem nota")}</span></li>`,
                )
                .join("")}
            </ul>
          </div>`
        : ""
    }

    <div class="btn-row no-print" style="margin-top:1rem">
      <button type="button" class="btn btn-secondary btn-sm" data-go="nova">Âncora</button>
      <button type="button" class="btn btn-secondary btn-sm" data-go="mapa">Mapa</button>
      <button type="button" class="btn btn-primary btn-sm" id="btn-pronto">Pronto</button>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-pub">${m.publicado ? "Despublicar" : "Publicar"}</button>
    </div>
  `;

  $("#sel-msg").addEventListener("change", (e) => {
    state.editingId = e.target.value;
    render();
  });
  $$("[data-step]", root).forEach((b) =>
    b.addEventListener("click", () => {
      m.stepIndex = Number(b.dataset.step);
      persist();
      render();
    }),
  );
  $("#btn-prev").addEventListener("click", () => {
    m.stepIndex = Math.max(0, m.stepIndex - 1);
    persist();
    render();
  });
  $("#btn-next").addEventListener("click", () => {
    saveStepFromForm(m, step.id);
    m.stepIndex = Math.min(STEPS.length - 1, m.stepIndex + 1);
    persist();
    render();
  });
  $("#form-step").addEventListener("submit", (e) => {
    e.preventDefault();
    saveStepFromForm(m, step.id);
    persist();
    render();
  });
  $("#btn-copy-prompt")?.addEventListener("click", async () => {
    const text = $("#prompt-box")?.textContent || "";
    await navigator.clipboard.writeText(text);
    const btn = $("#btn-copy-prompt");
    if (btn) {
      btn.textContent = "Copiado";
      setTimeout(() => (btn.textContent = "Copiar prompt"), 1200);
    }
  });
  $("#btn-log-analise")?.addEventListener("click", () => {
    m.analises.push({
      id: uid("an"),
      topico: step.title,
      nota: m.notas || step.action,
      data: new Date().toLocaleString("pt-BR"),
    });
    persist();
    render();
  });
  $$("[data-go]", root).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  $("#btn-pronto").addEventListener("click", () => {
    m.status = "pronto";
    persist();
    render();
  });
  $("#btn-pub").addEventListener("click", () => {
    m.publicado = !m.publicado;
    if (m.publicado) m.status = "pronto";
    persist();
    render();
  });
}

function renderStepFields(m, stepId) {
  const t = (name, label, val, rows = 3) =>
    `<div class="field"><label>${label}</label><textarea name="${name}" rows="${rows}" placeholder="Resuma em tópicos">${esc(val || "")}</textarea></div>`;
  const i = (name, label, val, ph = "") =>
    `<div class="field"><label>${label}</label><input name="${name}" value="${esc(val || "")}" placeholder="${esc(ph)}" /></div>`;

  switch (stepId) {
    case "tema":
      return i("tema", "Tema", m.tema, "Ex.: O Pai que corre") + i("ideiaCentral", "Ideia central (1 frase)", m.ideiaCentral, "A frase que carrega tudo");
    case "versiculos":
      return (
        `<div class="grid-2">${i("textoBaseRef", "Referência", m.textoBaseRef, "Lucas 15:20")}${i("versaoBiblia", "Versão", m.versaoBiblia, "NVI")}</div>` +
        t("textoBaseCitacao", "Citação", m.textoBaseCitacao, 4)
      );
    case "conexoes":
      return t("conexoes", "Textos ligados (1 por linha)", m.conexoes, 5);
    case "cenario_biblico":
      return (
        t("bib_antes", "Antes", m.cenarioBiblico?.antes, 2) +
        t("bib_durante", "No ponto", m.cenarioBiblico?.durante, 2) +
        t("bib_depois", "Depois", m.cenarioBiblico?.depois, 2)
      );
    case "cenario_vida":
      return (
        t("vida_anterior", "Anterior", m.cenarioVida?.anterior, 2) +
        t("vida_atual", "Atual", m.cenarioVida?.atual, 2) +
        t("vida_futuro", "Futuro", m.cenarioVida?.futuro, 2)
      );
    case "raciocinio":
      return t("abertura", "Abertura", m.abertura, 2) + t("raciocinio", "Pontos numerados", m.raciocinio, 6);
    case "frases":
      return t("frases", "Frases de efeito", m.frases, 3) + t("historias", "Histórias", m.historias, 3);
    case "resumo_curto":
      return t("resumoCurto", "3–5 tópicos", m.resumoCurto, 4);
    case "mapa":
      return `<p class="hint" style="margin-top:0">Confira o mapa. Se a linha estiver clara, salve.</p>
        <input type="hidden" name="mapa_ok" value="1" />
        ${renderMindmapHtml(m)}`;
    case "chamada":
      return t("chamada", "Decisão", m.chamada, 2) + t("oracao", "Oração", m.oracao, 2) + t("checklist", "Tempo", m.checklist, 2);
    default:
      return "";
  }
}

function saveStepFromForm(m, stepId) {
  const form = $("#form-step");
  const fd = new FormData(form);
  const g = (k) => fd.get(k)?.toString() ?? "";
  switch (stepId) {
    case "tema":
      m.tema = g("tema");
      m.ideiaCentral = g("ideiaCentral");
      break;
    case "versiculos":
      m.textoBaseRef = g("textoBaseRef");
      m.versaoBiblia = g("versaoBiblia");
      m.textoBaseCitacao = g("textoBaseCitacao");
      break;
    case "conexoes":
      m.conexoes = g("conexoes");
      break;
    case "cenario_biblico":
      m.cenarioBiblico = { antes: g("bib_antes"), durante: g("bib_durante"), depois: g("bib_depois") };
      break;
    case "cenario_vida":
      m.cenarioVida = { anterior: g("vida_anterior"), atual: g("vida_atual"), futuro: g("vida_futuro") };
      break;
    case "raciocinio":
      m.raciocinio = g("raciocinio");
      m.abertura = g("abertura");
      break;
    case "frases":
      m.frases = g("frases");
      m.historias = g("historias");
      break;
    case "resumo_curto":
      m.resumoCurto = g("resumoCurto");
      break;
    case "chamada":
      m.chamada = g("chamada");
      m.oracao = g("oracao");
      m.checklist = g("checklist");
      break;
    default:
      break;
  }
  m.updatedAt = new Date().toISOString();
  if (m.status === "rascunho") m.status = "em estudo";
}

function block(title, body) {
  if (!body?.trim()) return "";
  return `<div class="section-block"><h3>${title}</h3><p class="prose-line">${esc(body)}</p></div>`;
}

function topicBlock(num, title, bodyHtml, ok) {
  if (!bodyHtml) {
    return `<div class="topic-read ${ok ? "" : "pending"}"><div class="topic-read-h"><span>${num}</span><strong>${esc(title)}</strong><em>${ok ? "ok" : "vazio"}</em></div></div>`;
  }
  return `<div class="topic-read ${ok ? "ok" : ""}"><div class="topic-read-h"><span>${num}</span><strong>${esc(title)}</strong><em>${ok ? "ok" : ""}</em></div><div class="topic-read-b">${bodyHtml}</div></div>`;
}

function renderReadout(m) {
  const parts = [
    topicBlock(1, "Tema", m.ideiaCentral || m.tema ? `<p class="prose-line">${esc(m.ideiaCentral || m.tema)}</p>` : "", stepDone(m, "tema")),
    topicBlock(
      2,
      "Texto bíblico",
      m.textoBaseRef
        ? `<p><strong>${esc(m.textoBaseRef)}</strong> (${esc(m.versaoBiblia || "")})</p><p class="prose-line">${esc(m.textoBaseCitacao || "")}</p>`
        : "",
      stepDone(m, "versiculos"),
    ),
    topicBlock(3, "Conexões", m.conexoes ? `<p class="prose-line">${esc(m.conexoes)}</p>` : "", stepDone(m, "conexoes")),
    topicBlock(
      4,
      "Cenário bíblico",
      m.cenarioBiblico?.antes || m.cenarioBiblico?.durante
        ? `<ul>
            ${m.cenarioBiblico.antes ? `<li><strong>Antes:</strong> ${esc(m.cenarioBiblico.antes)}</li>` : ""}
            ${m.cenarioBiblico.durante ? `<li><strong>Ponto:</strong> ${esc(m.cenarioBiblico.durante)}</li>` : ""}
            ${m.cenarioBiblico.depois ? `<li><strong>Depois:</strong> ${esc(m.cenarioBiblico.depois)}</li>` : ""}
          </ul>`
        : "",
      stepDone(m, "cenario_biblico"),
    ),
    topicBlock(
      5,
      "Cenário de vida",
      m.cenarioVida?.anterior || m.cenarioVida?.atual
        ? `<ul>
            ${m.cenarioVida.anterior ? `<li><strong>Antes:</strong> ${esc(m.cenarioVida.anterior)}</li>` : ""}
            ${m.cenarioVida.atual ? `<li><strong>Agora:</strong> ${esc(m.cenarioVida.atual)}</li>` : ""}
            ${m.cenarioVida.futuro ? `<li><strong>Depois:</strong> ${esc(m.cenarioVida.futuro)}</li>` : ""}
          </ul>`
        : "",
      stepDone(m, "cenario_vida"),
    ),
    topicBlock(
      6,
      "Linha",
      m.raciocinio || m.abertura
        ? `${m.abertura ? `<p class="prose-line"><strong>Abertura:</strong> ${esc(m.abertura)}</p>` : ""}<p class="prose-line">${esc(m.raciocinio || "")}</p>`
        : "",
      stepDone(m, "raciocinio"),
    ),
    topicBlock(
      7,
      "Frases",
      m.frases || m.historias
        ? `${m.frases ? `<p class="prose-line">${esc(m.frases)}</p>` : ""}${m.historias ? `<p class="prose-line muted">${esc(m.historias)}</p>` : ""}`
        : "",
      stepDone(m, "frases"),
    ),
    topicBlock(8, "Resumo curto", m.resumoCurto ? `<p class="prose-line">${esc(m.resumoCurto)}</p>` : "", stepDone(m, "resumo_curto")),
    topicBlock(9, "Mapa", stepDone(m, "mapa") ? `<p class="muted">Estrutura pronta no Mapa.</p>` : "", stepDone(m, "mapa")),
    topicBlock(
      10,
      "Chamada",
      m.chamada || m.oracao
        ? `${m.chamada ? `<p class="prose-line">${esc(m.chamada)}</p>` : ""}${m.oracao ? `<p class="prose-line muted">${esc(m.oracao)}</p>` : ""}`
        : "",
      stepDone(m, "chamada"),
    ),
  ];
  return `<div class="topic-read-list">${parts.join("")}</div>`;
}

function renderMindmapHtml(m) {
  const root = m.ideiaCentral || m.tema || "Ideia central";
  const branches = mindBranches(m);
  return `
    <div class="mindmap">
      <div class="mind-root">${esc(root)}</div>
      <div class="mind-branches">
        ${branches
          .map(
            (b) => `
          <div class="mind-branch">
            <h4>${esc(b.title)}</h4>
            ${b.items.length ? `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : `<p class="muted" style="margin:0;font-size:0.8rem">Ainda vazio</p>`}
          </div>`,
          )
          .join("")}
      </div>
    </div>`;
}

function viewMapa(root) {
  const list = state.store.messages;
  if (!state.editingId && list[0]) state.editingId = list[0].id;
  const m = getEditingMessage();
  if (!m) {
    root.innerHTML = `<div class="page-head"><h1>Mapa mental</h1></div><div class="card empty">Crie uma mensagem para gerar o mapa.</div>`;
    return;
  }
  root.innerHTML = `
    <div class="page-head"><p class="muted">Gravar a linha · ${frenteLabel(m.frente)}</p><h1>Mapa mental</h1></div>
    <div class="filter-bar no-print">
      <select id="sel-msg" style="flex:1">${list.map((x) => `<option value="${x.id}" ${x.id === m.id ? "selected" : ""}>${esc(x.tema || x.id)}</option>`).join("")}</select>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-print">Imprimir / PDF</button>
    </div>
    <div class="card">${renderMindmapHtml(m)}</div>
    <div class="card" style="margin-top:1rem">
      <div class="card-title"><div><h2>Resumo curto</h2><p>Para oportunidades rápidas</p></div></div>
      <p class="prose-line">${esc(m.resumoCurto || "Preencha a etapa Resumo curto no Estudo.")}</p>
    </div>
  `;
  $("#sel-msg").addEventListener("change", (e) => {
    state.editingId = e.target.value;
    render();
  });
  $("#btn-print").addEventListener("click", () => window.print());
}

function viewTranscricoes(root) {
  const list = state.store.transcriptions;
  const edit = list.find((t) => t.id === state.editingId && state.editingType === "tr") || emptyTranscription();
  root.innerHTML = `
    <div class="page-head"><p class="muted">Base de frases e histórias</p><h1>Transcrições</h1></div>
    <form id="form-tr" class="card">
      <div class="card-title"><div><h2>${edit.id ? "Editar" : "Nova"} transcrição</h2><p>Cole o texto e destaque frases</p></div></div>
      <div class="grid-2">
        <div class="field"><label>Título</label><input name="titulo" required value="${esc(edit.titulo)}" /></div>
        <div class="field"><label>Fonte / pastor</label><input name="fonte" value="${esc(edit.fonte)}" /></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Data</label><input name="data" type="date" value="${esc(edit.data)}" /></div>
        <div class="field"><label>Tags</label><input name="tags" value="${esc(edit.tags)}" placeholder="perdão, família" /></div>
      </div>
      <div class="field"><label>Texto completo</label><textarea name="texto" rows="5">${esc(edit.texto)}</textarea></div>
      <div class="field"><label>Frases de efeito</label><textarea name="frases" rows="2">${esc(edit.frases)}</textarea></div>
      <div class="field"><label>Histórias</label><textarea name="historias" rows="2">${esc(edit.historias)}</textarea></div>
      <div class="field"><label>Textos citados</label><textarea name="textosCitados" rows="2">${esc(edit.textosCitados)}</textarea></div>
      <div class="btn-row">
        <button type="submit" class="btn btn-primary">Salvar</button>
        ${edit.id ? `<button type="button" class="btn btn-ghost" id="btn-new-tr">Limpar</button>` : ""}
      </div>
    </form>
    <div class="list" style="margin-top:1rem">
      ${
        list.length
          ? list
              .map(
                (t) => `
        <button type="button" class="card list-item" data-tr="${t.id}">
          <h3>${esc(t.titulo)}</h3>
          <p>${esc(t.fonte || "Sem fonte")} · ${esc(t.tags || "")}</p>
        </button>`,
              )
              .join("")
          : `<div class="card empty">Nenhuma transcrição ainda.</div>`
      }
    </div>
  `;
  $("#form-tr").addEventListener("submit", (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    if (edit.id) {
      Object.assign(edit, data, { updatedAt: new Date().toISOString() });
    } else {
      state.store.transcriptions.unshift({ ...emptyTranscription(), ...data, id: uid("tr") });
    }
    state.editingType = "message";
    state.editingId = getEditingMessage()?.id || null;
    persist();
    render();
  });
  $$("[data-tr]", root).forEach((b) =>
    b.addEventListener("click", () => {
      state.editingType = "tr";
      state.editingId = b.dataset.tr;
      render();
    }),
  );
  $("#btn-new-tr")?.addEventListener("click", () => {
    state.editingType = "message";
    render();
  });
}

function viewEbd(root) {
  const list = state.store.ebd;
  const edit = list.find((t) => t.id === state.editingId && state.editingType === "ebd") || emptyEbd();
  root.innerHTML = `
    <div class="page-head"><p class="muted">Plano de aula por lição</p><h1>EBD</h1></div>
    <form id="form-ebd" class="card">
      <div class="grid-2">
        <div class="field"><label>Série</label><input name="serie" value="${esc(edit.serie)}" /></div>
        <div class="field"><label>Lição</label><input name="licao" required value="${esc(edit.licao)}" /></div>
      </div>
      <div class="grid-2">
        <div class="field"><label>Data</label><input name="data" type="date" value="${esc(edit.data)}" /></div>
        <div class="field"><label>Faixa etária</label><input name="faixa" value="${esc(edit.faixa)}" /></div>
      </div>
      <div class="field"><label>Objetivos</label><textarea name="objetivos" rows="2">${esc(edit.objetivos)}</textarea></div>
      <div class="field"><label>Abertura</label><textarea name="abertura" rows="2">${esc(edit.abertura)}</textarea></div>
      <div class="field"><label>Leitura</label><textarea name="leitura" rows="2">${esc(edit.leitura)}</textarea></div>
      <div class="field"><label>Explicação</label><textarea name="explicacao" rows="3">${esc(edit.explicacao)}</textarea></div>
      <div class="field"><label>Perguntas</label><textarea name="perguntas" rows="2">${esc(edit.perguntas)}</textarea></div>
      <div class="field"><label>Aplicação</label><textarea name="aplicacao" rows="2">${esc(edit.aplicacao)}</textarea></div>
      <div class="field"><label>Atividade</label><textarea name="atividade" rows="2">${esc(edit.atividade)}</textarea></div>
      <div class="field"><label>Conclusão</label><textarea name="conclusao" rows="2">${esc(edit.conclusao)}</textarea></div>
      <div class="field"><label>Recursos</label><textarea name="recursos" rows="2">${esc(edit.recursos)}</textarea></div>
      <label class="field" style="display:flex;align-items:center;gap:0.5rem">
        <input type="checkbox" name="publicado" ${edit.publicado ? "checked" : ""} /> Publicar aula
      </label>
      <button type="submit" class="btn btn-primary">Salvar aula</button>
    </form>
    <div class="list" style="margin-top:1rem">
      ${
        list.length
          ? list
              .map(
                (a) => `
        <button type="button" class="card list-item" data-ebd="${a.id}">
          <h3>${esc(a.licao)}</h3>
          <p>${esc(a.serie || "")} · ${esc(a.data || "")} ${a.publicado ? "· publicado" : ""}</p>
        </button>`,
              )
              .join("")
          : `<div class="card empty">Nenhuma aula EBD ainda.</div>`
      }
    </div>
  `;
  $("#form-ebd").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.publicado = fd.get("publicado") === "on";
    if (edit.id) Object.assign(edit, data, { updatedAt: new Date().toISOString() });
    else state.store.ebd.unshift({ ...emptyEbd(), ...data, id: uid("ebd") });
    state.editingType = "message";
    persist();
    render();
  });
  $$("[data-ebd]", root).forEach((b) =>
    b.addEventListener("click", () => {
      state.editingType = "ebd";
      state.editingId = b.dataset.ebd;
      render();
    }),
  );
}

function viewPublicados(root) {
  const msgs = state.store.messages.filter((m) => m.publicado);
  const aulas = state.store.ebd.filter((a) => a.publicado);
  root.innerHTML = `
    <div class="page-head"><p class="muted">Acervo</p><h1>Prontos</h1></div>
    ${
      !msgs.length && !aulas.length
        ? `<div class="card empty">Nada publicado ainda. No Estudo, use Publicar quando estiver pronto.</div>`
        : ""
    }
    <div class="list">
      ${msgs
        .map(
          (m) => `
        <article class="card">
          <div class="chips"><span class="badge badge-accent">${frenteLabel(m.frente)}</span></div>
          <h2 style="margin:0.5rem 0 0.25rem;font-size:1.1rem">${esc(m.tema)}</h2>
          <p class="muted" style="margin:0;font-size:0.85rem">${esc(m.ideiaCentral)}</p>
          <div style="margin-top:0.75rem">${renderReadout(m)}</div>
          <div style="margin-top:1rem">${renderMindmapHtml(m)}</div>
        </article>`,
        )
        .join("")}
      ${aulas
        .map(
          (a) => `
        <article class="card">
          <span class="badge badge-ok">EBD</span>
          <h2 style="margin:0.5rem 0;font-size:1.1rem">${esc(a.licao)}</h2>
          ${block("Objetivos", a.objetivos)}
          ${block("Leitura", a.leitura)}
          ${block("Explicação", a.explicacao)}
          ${block("Perguntas", a.perguntas)}
          ${block("Aplicação", a.aplicacao)}
        </article>`,
        )
        .join("")}
    </div>
  `;
}

function viewMais(root) {
  const items = [
    { id: "mapa", label: "Mapa", desc: "Estrutura visual" },
    { id: "transcricoes", label: "Vozes", desc: "Frases e histórias" },
    { id: "ebd", label: "EBD", desc: "Plano de aula" },
    { id: "publicados", label: "Prontos", desc: "Acervo publicado" },
    { id: "config", label: "Ajustes", desc: "Backup e tema" },
  ];
  root.innerHTML = `
    <div class="page-head"><p class="muted">Mais</p><h1>Menu</h1></div>
    <div class="list">
      ${items
        .map(
          (i) => `
        <button type="button" class="card list-item" data-go="${i.id}">
          <h3>${i.label}</h3>
          <p>${i.desc}</p>
        </button>`,
        )
        .join("")}
    </div>
  `;
  $$("[data-go]", root).forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
}

function viewConfig(root) {
  root.innerHTML = `
    <div class="page-head"><p class="muted">Backup e tema</p><h1>Ajustes</h1></div>
    <div class="stack">
      <div class="card">
        <div class="card-title"><div><h2>Tema</h2><p>Claro ou escuro</p></div>
          <button type="button" class="btn-icon" id="btn-tema-cfg" aria-label="Usar modo escuro"></button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><div><h2>Exportar</h2><p>Backup do acervo</p></div></div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="btn-export-all">Pacote completo</button>
          <button type="button" class="btn btn-secondary" id="btn-export-msg">Mensagens</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><div><h2>Importar</h2><p>JSON do acervo</p></div></div>
        <input type="file" id="import-file" accept="application/json" />
      </div>
    </div>
  `;
  syncTemaIcons();
  $("#btn-tema-cfg").addEventListener("click", toggleTema);
  $("#btn-export-all").addEventListener("click", () => {
    downloadJson("painel-data-pack.json", {
      messages: state.store.messages,
      transcriptions: state.store.transcriptions,
      ebd: state.store.ebd,
      exportedAt: new Date().toISOString(),
    });
  });
  $("#btn-export-msg").addEventListener("click", () => downloadJson("messages.json", state.store.messages));
  $("#import-file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (Array.isArray(json)) state.store.messages = json;
      else {
        if (json.messages) state.store.messages = json.messages;
        if (json.transcriptions) state.store.transcriptions = json.transcriptions;
        if (json.ebd) state.store.ebd = json.ebd;
      }
      persist();
      alert("Importado.");
      go("biblioteca");
    } catch {
      alert("JSON inválido.");
    }
  });
}

/* boot */
bindAuth();
bootAuth();

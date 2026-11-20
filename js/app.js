import {
  clearSessionFlag,
  exportAuthHash,
  generatePassword,
  getStoredHash,
  hasSessionOk,
  loadDeployedHash,
  markSessionOk,
  savePassword,
  verifyPassword,
} from "./auth.js";
import { downloadJson, loadStore, mergeSeedData, saveStore, uid } from "./storage.js";
import {
  FRENTES,
  STEPS,
  emptyEbd,
  emptyMessage,
  emptyTranscription,
  mindBranches,
  progress,
  stepDone,
} from "./study.js";

const state = {
  store: loadStore(),
  view: "inicio",
  editingId: null,
  editingType: "message",
  draftPass: "",
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

function toggleTema() {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("painel_tema", document.documentElement.classList.contains("dark") ? "escuro" : "claro");
}

function applyTema() {
  if (localStorage.getItem("painel_tema") === "escuro") document.documentElement.classList.add("dark");
}

function persist() {
  saveStore(state.store);
}

/* —— Auth UI —— */
async function bootAuth() {
  applyTema();
  await loadDeployedHash();
  const hash = getStoredHash();
  if (hasSessionOk() && hash) {
    await enterApp(false);
    return;
  }
  $("#auth-screen").classList.remove("hidden");
  $("#app-screen").classList.add("hidden");
  if (!hash) {
    $("#auth-setup").classList.remove("hidden");
    $("#auth-login").classList.add("hidden");
    state.draftPass = generatePassword();
    $("#generated-password").textContent = state.draftPass;
  } else {
    $("#auth-setup").classList.add("hidden");
    $("#auth-login").classList.remove("hidden");
  }
}

function bindAuth() {
  $("#btn-tema-auth")?.addEventListener("click", toggleTema);
  $("#btn-regen-pass")?.addEventListener("click", () => {
    state.draftPass = generatePassword();
    $("#generated-password").textContent = state.draftPass;
  });
  $("#btn-copy-pass")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(state.draftPass);
    $("#btn-copy-pass").textContent = "Copiado!";
    setTimeout(() => ($("#btn-copy-pass").textContent = "Copiar"), 1500);
  });
  $("#confirm-saved")?.addEventListener("change", (e) => {
    $("#btn-save-access").disabled = !e.target.checked;
  });
  $("#btn-save-access")?.addEventListener("click", async () => {
    await savePassword(state.draftPass);
    const pack = exportAuthHash();
    downloadJson("auth-hash.json", pack);
    markSessionOk();
    await enterApp(true);
  });
  $("#form-login")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ok = await verifyPassword($("#login-password").value);
    if (!ok) {
      $("#login-error").textContent = "Senha incorreta.";
      $("#login-error").classList.remove("hidden");
      return;
    }
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
    ? [{ id: "publicados", label: "Publicados", ico: "◎" }]
    : [
        { id: "inicio", label: "Início", ico: "⌂" },
        { id: "biblioteca", label: "Biblioteca", ico: "☰" },
        { id: "nova", label: "Nova", ico: "+" },
        { id: "estudo", label: "Estudo", ico: "◇" },
        { id: "mapa", label: "Mapa", ico: "✦" },
        { id: "transcricoes", label: "Transcrições", ico: "✎" },
        { id: "ebd", label: "EBD", ico: "▣" },
        { id: "publicados", label: "Publicados", ico: "◎" },
        { id: "config", label: "Config", ico: "⚙" },
      ];

  const side = $("#side-nav");
  side.innerHTML = items
    .map(
      (i) =>
        `<button type="button" class="nav-link ${state.view === i.id ? "active" : ""}" data-nav="${i.id}"><span class="ico">${i.ico}</span>${i.label}</button>`,
    )
    .join("");

  const bottomItems = state.publicOnly
    ? [{ id: "publicados", label: "Publicados", ico: "◎" }]
    : [
        { id: "inicio", label: "Início", ico: "⌂" },
        { id: "biblioteca", label: "Lista", ico: "☰" },
        { id: "nova", label: "Nova", fab: true },
        { id: "estudo", label: "Estudo", ico: "◇" },
        { id: "mais", label: "Mais", ico: "▦" },
      ];

  $("#bottom-nav").innerHTML = bottomItems
    .map((i) => {
      if (i.fab) {
        return `<div class="fab-wrap"><button type="button" class="fab" data-nav="nova" aria-label="Nova">+</button><span style="font-size:0.68rem;font-weight:600;color:#93aa9f">Nova</span></div>`;
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
  const pub = msgs.filter((m) => m.publicado).length;
  const estudo = msgs.filter((m) => m.status === "em estudo" || m.status === "rascunho").length;
  const byFrente = FRENTES.map((f) => ({ ...f, n: msgs.filter((m) => m.frente === f.id).length }));

  root.innerHTML = `
    <div class="page-head">
      <p class="muted">${new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p>
      <h1>${saudacao()}. <span class="accent">Vamos estudar.</span></h1>
    </div>
    <div class="quick no-print">
      <button type="button" data-go="nova"><span class="ico">＋</span>Nova</button>
      <button type="button" data-go="biblioteca"><span class="ico">☰</span>Lista</button>
      <button type="button" data-go="estudo"><span class="ico">◇</span>Etapas</button>
      <button type="button" data-go="ebd"><span class="ico">▣</span>EBD</button>
    </div>
    <div class="grid-4" style="margin-bottom:1rem">
      <div class="card kpi"><span class="label">Mensagens</span><span class="value">${msgs.length}</span></div>
      <div class="card kpi"><span class="label">Em estudo</span><span class="value">${estudo}</span></div>
      <div class="card kpi"><span class="label">Publicadas</span><span class="value">${pub}</span></div>
      <div class="card kpi"><span class="label">Transcrições</span><span class="value">${state.store.transcriptions.length}</span></div>
    </div>
    <div class="card">
      <div class="card-title"><div><h2>Frentes</h2><p>Onde cada mensagem será usada</p></div></div>
      <div class="grid-2">
        ${byFrente
          .map(
            (f) => `
          <button type="button" class="card" style="padding:0.85rem;cursor:pointer;text-align:left" data-frente="${f.id}">
            <strong>${f.label}</strong>
            <p class="muted" style="margin:0.25rem 0 0;font-size:0.8rem">${f.hint} · ${f.n}</p>
          </button>`,
          )
          .join("")}
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <div class="card-title"><div><h2>Como estudar</h2><p>Uma etapa por vez — clareza sem poluir</p></div></div>
      <ol style="margin:0;padding-left:1.2rem;font-size:0.9rem;line-height:1.55;color:var(--muted)">
        <li>Escolha a frente e o tema.</li>
        <li>Avance no Estudo etapa a etapa.</li>
        <li>Use o mapa mental para gravar.</li>
        <li>Marque pronto e publique só o necessário.</li>
      </ol>
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
    <div class="page-head"><p class="muted">Acervo</p><h1>Biblioteca</h1></div>
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
    <div class="page-head"><p class="muted">${edit ? "Editar âncora" : "Nova mensagem"}</p><h1>${edit ? "Ajustar base" : "Começar pelo essencial"}</h1></div>
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
    root.innerHTML = `<div class="page-head"><h1>Estudo</h1></div><div class="card empty">Crie uma mensagem primeiro.</div>
      <button type="button" class="btn btn-primary" style="margin-top:1rem" data-go="nova">Nova mensagem</button>`;
    $("[data-go]", root)?.addEventListener("click", () => go("nova"));
    return;
  }
  const step = STEPS[m.stepIndex] || STEPS[0];
  const p = progress(m);

  root.innerHTML = `
    <div class="page-head">
      <p class="muted">Estudo · ${frenteLabel(m.frente)} · etapa ${m.stepIndex + 1}/${STEPS.length}</p>
      <h1>${esc(m.tema || "Mensagem")}</h1>
    </div>
    <div class="filter-bar no-print">
      <select id="sel-msg" style="flex:1;min-width:12rem">
        ${list.map((x) => `<option value="${x.id}" ${x.id === m.id ? "selected" : ""}>${esc(x.tema || x.id)} (${frenteLabel(x.frente)})</option>`).join("")}
      </select>
      <span class="badge badge-accent">${p.pct}% completo</span>
    </div>
    <div class="stepper no-print">
      ${STEPS.map((s, i) => {
        const done = stepDone(m, s.id);
        const active = i === m.stepIndex;
        return `<button type="button" class="step-pill ${done ? "done" : ""} ${active ? "active" : ""}" data-step="${i}">${i + 1}. ${s.title.split(" ")[0]}</button>`;
      }).join("")}
    </div>
    <form id="form-step" class="card step-panel">
      <h3>${step.title}</h3>
      <p class="hint">${step.hint}</p>
      ${renderStepFields(m, step.id)}
      <div class="btn-row" style="margin-top:0.5rem">
        <button type="button" class="btn btn-secondary" id="btn-prev" ${m.stepIndex === 0 ? "disabled" : ""}>Anterior</button>
        <button type="submit" class="btn btn-primary">Salvar etapa</button>
        <button type="button" class="btn btn-secondary" id="btn-next" ${m.stepIndex >= STEPS.length - 1 ? "disabled" : ""}>Próxima</button>
      </div>
    </form>
    <div class="card" style="margin-top:1rem">
      <div class="card-title"><div><h2>Leitura objetiva</h2><p>O que já está sólido</p></div></div>
      ${renderReadout(m)}
    </div>
    <div class="btn-row no-print" style="margin-top:1rem">
      <button type="button" class="btn btn-secondary btn-sm" data-go="nova">Editar base</button>
      <button type="button" class="btn btn-secondary btn-sm" data-go="mapa">Mapa mental</button>
      <button type="button" class="btn btn-primary btn-sm" id="btn-pronto">Marcar pronto</button>
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
  const t = (name, label, val, rows = 4) =>
    `<div class="field"><label>${label}</label><textarea name="${name}" rows="${rows}">${esc(val || "")}</textarea></div>`;
  const i = (name, label, val) =>
    `<div class="field"><label>${label}</label><input name="${name}" value="${esc(val || "")}" /></div>`;

  switch (stepId) {
    case "tema":
      return i("tema", "Tema", m.tema) + i("ideiaCentral", "Ideia central", m.ideiaCentral);
    case "versiculos":
      return (
        i("textoBaseRef", "Referência", m.textoBaseRef) +
        i("versaoBiblia", "Versão", m.versaoBiblia) +
        t("textoBaseCitacao", "Citação", m.textoBaseCitacao, 5)
      );
    case "conexoes":
      return t("conexoes", "Textos conectados (um por linha)", m.conexoes, 6);
    case "cenario_biblico":
      return (
        t("bib_antes", "Antes", m.cenarioBiblico?.antes, 3) +
        t("bib_durante", "No ponto do texto", m.cenarioBiblico?.durante, 3) +
        t("bib_depois", "Depois / cumprimento", m.cenarioBiblico?.depois, 3)
      );
    case "cenario_vida":
      return (
        t("vida_anterior", "Vida — anterior", m.cenarioVida?.anterior, 3) +
        t("vida_atual", "Vida — atual", m.cenarioVida?.atual, 3) +
        t("vida_futuro", "Vida — futuro", m.cenarioVida?.futuro, 3)
      );
    case "raciocinio":
      return t("raciocinio", "Pontos numerados da linha de raciocínio", m.raciocinio, 7) + t("abertura", "Abertura / gancho", m.abertura, 3);
    case "frases":
      return t("frases", "Frases de efeito", m.frases, 4) + t("historias", "Histórias / exemplos", m.historias, 4);
    case "resumo_curto":
      return t("resumoCurto", "3–5 tópicos (oportunidade curta)", m.resumoCurto, 5);
    case "mapa":
      return `<p class="hint">O mapa é montado automaticamente. Use o botão Mapa mental para estudar visualmente. Salve para confirmar esta etapa.</p>
        <input type="hidden" name="mapa_ok" value="1" />
        ${renderMindmapHtml(m)}`;
    case "chamada":
      return t("chamada", "Chamada / decisão", m.chamada, 3) + t("oracao", "Oração", m.oracao, 3) + t("checklist", "Checklist de tempo / lembretes", m.checklist, 3);
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

function renderReadout(m) {
  const parts = [
    block("Ideia central", m.ideiaCentral || m.tema),
    m.textoBaseRef
      ? `<div class="section-block"><h3>Texto-base</h3><p><strong>${esc(m.textoBaseRef)}</strong> (${esc(m.versaoBiblia || "")})</p><p class="prose-line">${esc(m.textoBaseCitacao)}</p></div>`
      : "",
    block("Conexões", m.conexoes),
    m.cenarioBiblico?.antes || m.cenarioBiblico?.durante
      ? `<div class="section-block"><h3>Cenário bíblico</h3><ul>
          ${m.cenarioBiblico.antes ? `<li><strong>Antes:</strong> ${esc(m.cenarioBiblico.antes)}</li>` : ""}
          ${m.cenarioBiblico.durante ? `<li><strong>Ponto:</strong> ${esc(m.cenarioBiblico.durante)}</li>` : ""}
          ${m.cenarioBiblico.depois ? `<li><strong>Depois:</strong> ${esc(m.cenarioBiblico.depois)}</li>` : ""}
        </ul></div>`
      : "",
    m.cenarioVida?.anterior || m.cenarioVida?.atual
      ? `<div class="section-block"><h3>Cenário de vida</h3><ul>
          ${m.cenarioVida.anterior ? `<li><strong>Anterior:</strong> ${esc(m.cenarioVida.anterior)}</li>` : ""}
          ${m.cenarioVida.atual ? `<li><strong>Atual:</strong> ${esc(m.cenarioVida.atual)}</li>` : ""}
          ${m.cenarioVida.futuro ? `<li><strong>Futuro:</strong> ${esc(m.cenarioVida.futuro)}</li>` : ""}
        </ul></div>`
      : "",
    block("Linha de raciocínio", m.raciocinio),
    block("Resumo curto", m.resumoCurto),
    block("Frases", m.frases),
    block("Chamada", m.chamada),
  ].filter(Boolean);
  return parts.length ? parts.join("") : `<p class="empty">Preencha as etapas para ver o resumo aqui.</p>`;
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
    <div class="page-head"><p class="muted">Acervo online</p><h1>Publicados</h1></div>
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
    { id: "mapa", label: "Mapa mental", desc: "Visual para gravar" },
    { id: "transcricoes", label: "Transcrições", desc: "Frases e histórias" },
    { id: "ebd", label: "EBD", desc: "Plano de aula" },
    { id: "publicados", label: "Publicados", desc: "Acervo pronto" },
    { id: "config", label: "Config", desc: "Senha, export, tema" },
  ];
  root.innerHTML = `
    <div class="page-head"><p class="muted">Mais opções</p><h1>Menu</h1></div>
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
    <div class="page-head"><p class="muted">Segurança e publicação</p><h1>Config</h1></div>
    <div class="stack">
      <div class="card">
        <div class="card-title"><div><h2>Senha</h2><p>Mesma senha na WEB após enviar o hash</p></div></div>
        <div class="btn-row">
          <button type="button" class="btn btn-secondary" id="btn-export-auth">Baixar auth-hash.json</button>
          <button type="button" class="btn btn-danger" id="btn-reset-auth">Trocar senha (novo 1º acesso)</button>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><div><h2>Exportar acervo</h2><p>Para commit no GitHub / backup</p></div></div>
        <div class="btn-row">
          <button type="button" class="btn btn-primary" id="btn-export-all">Baixar pacote data</button>
          <button type="button" class="btn btn-secondary" id="btn-export-msg">Só mensagens</button>
        </div>
        <p class="muted" style="margin:0.75rem 0 0;font-size:0.8rem">Fluxo: monte aqui → exporte → substitua arquivos em <code>data/</code> → push → Vercel atualiza.</p>
      </div>
      <div class="card">
        <div class="card-title"><div><h2>Importar JSON</h2><p>Mensagens, transcrições ou EBD</p></div></div>
        <input type="file" id="import-file" accept="application/json" />
      </div>
      <div class="card">
        <div class="card-title"><div><h2>Tema</h2><p>Claro ou escuro</p></div></div>
        <button type="button" class="btn btn-secondary" id="btn-tema-cfg">Alternar claro / escuro</button>
      </div>
    </div>
  `;
  $("#btn-export-auth").addEventListener("click", () => {
    const pack = exportAuthHash();
    if (!pack) return alert("Nenhuma senha configurada.");
    downloadJson("auth-hash.json", pack);
  });
  $("#btn-reset-auth").addEventListener("click", () => {
    if (!confirm("Isso apaga a senha atual deste aparelho. Continuar?")) return;
    localStorage.removeItem("painel_ministracao_auth_hash");
    clearSessionFlag();
    bootAuth();
  });
  $("#btn-export-all").addEventListener("click", () => {
    downloadJson("painel-data-pack.json", {
      messages: state.store.messages,
      transcriptions: state.store.transcriptions,
      ebd: state.store.ebd,
      exportedAt: new Date().toISOString(),
    });
  });
  $("#btn-export-msg").addEventListener("click", () => downloadJson("messages.json", state.store.messages));
  $("#btn-tema-cfg").addEventListener("click", toggleTema);
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
      alert("Importado com sucesso.");
      go("biblioteca");
    } catch {
      alert("JSON inválido.");
    }
  });
}

/* boot */
bindAuth();
bootAuth();

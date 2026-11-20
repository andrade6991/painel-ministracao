export const FRENTES = [
  { id: "igreja", label: "Igreja", hint: "Púlpito · completa" },
  { id: "empresa", label: "Empresa", hint: "Momento de fé · curto" },
  { id: "evangelismo", label: "Evangelismo", hint: "Cristo · convite" },
  { id: "ebd", label: "EBD", hint: "Aula · lição" },
];

/** Tópicos do estudo — um por vez. Simples, resumido, objetivo. */
export const STEPS = [
  {
    id: "tema",
    short: "Tema",
    title: "1. Tema",
    action: "Defina o título e a ideia central em uma frase.",
    hint: "Só o núcleo. Sem desenvolver ainda.",
  },
  {
    id: "versiculos",
    short: "Texto",
    title: "2. Texto bíblico",
    action: "Informe referência, versão e a citação do texto-base.",
    hint: "Âncora da mensagem.",
  },
  {
    id: "conexoes",
    short: "Conexões",
    title: "3. Conexões",
    action: "Liste 2 a 4 textos ligados (um por linha).",
    hint: "Antes / depois na Escritura.",
  },
  {
    id: "cenario_biblico",
    short: "Bíblia",
    title: "4. Cenário bíblico",
    action: "Preencha: antes → no ponto → depois.",
    hint: "O que aconteceu no texto.",
  },
  {
    id: "cenario_vida",
    short: "Vida",
    title: "5. Cenário de vida",
    action: "Preencha: anterior → atual → futuro do ouvinte.",
    hint: "Espelho da vida real.",
  },
  {
    id: "raciocinio",
    short: "Linha",
    title: "6. Linha de raciocínio",
    action: "Numere os pontos do fio (e a abertura).",
    hint: "Ordem que não pode quebrar.",
  },
  {
    id: "frases",
    short: "Frases",
    title: "7. Frases e histórias",
    action: "Separe frases de efeito e histórias curtas.",
    hint: "Tempero, não o prato.",
  },
  {
    id: "resumo_curto",
    short: "Resumo",
    title: "8. Resumo curto",
    action: "Escreva 3 a 5 tópicos para momento rápido.",
    hint: "Empresa / abertura.",
  },
  {
    id: "mapa",
    short: "Mapa",
    title: "9. Mapa mental",
    action: "Revise o mapa. Confirme se a linha está clara.",
    hint: "Para gravar.",
  },
  {
    id: "chamada",
    short: "Chamada",
    title: "10. Chamada",
    action: "Defina decisão, oração e checklist de tempo.",
    hint: "Fechamento.",
  },
];

export function emptyMessage(frente = "igreja") {
  return {
    id: null,
    frente,
    tema: "",
    ideiaCentral: "",
    textoBaseRef: "",
    textoBaseCitacao: "",
    versaoBiblia: "NVI",
    tom: "pastoral",
    status: "rascunho",
    publicado: false,
    conexoes: "",
    cenarioBiblico: { antes: "", durante: "", depois: "" },
    cenarioVida: { anterior: "", atual: "", futuro: "" },
    raciocinio: "",
    frases: "",
    historias: "",
    resumoCurto: "",
    abertura: "",
    chamada: "",
    oracao: "",
    checklist: "",
    transcriptionIds: [],
    notas: "",
    analises: [],
    stepIndex: 0,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
}

export function stepDone(msg, stepId) {
  switch (stepId) {
    case "tema":
      return !!(msg.ideiaCentral || msg.tema);
    case "versiculos":
      return !!(msg.textoBaseRef && msg.textoBaseCitacao);
    case "conexoes":
      return !!msg.conexoes?.trim();
    case "cenario_biblico":
      return !!(msg.cenarioBiblico?.antes || msg.cenarioBiblico?.durante || msg.cenarioBiblico?.depois);
    case "cenario_vida":
      return !!(msg.cenarioVida?.anterior || msg.cenarioVida?.atual || msg.cenarioVida?.futuro);
    case "raciocinio":
      return !!msg.raciocinio?.trim();
    case "frases":
      return !!(msg.frases?.trim() || msg.historias?.trim());
    case "resumo_curto":
      return !!msg.resumoCurto?.trim();
    case "mapa":
      return stepDone(msg, "tema") && stepDone(msg, "raciocinio");
    case "chamada":
      return !!(msg.chamada?.trim() || msg.oracao?.trim());
    default:
      return false;
  }
}

export function progress(msg) {
  const done = STEPS.filter((s) => stepDone(msg, s.id)).length;
  return { done, total: STEPS.length, pct: Math.round((done / STEPS.length) * 100) };
}

export function mindBranches(msg) {
  const lines = (t) =>
    String(t || "")
      .split(/\n|•|;/)
      .map((s) => s.replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 6);

  return [
    { title: "Texto", items: [msg.textoBaseRef, ...(msg.conexoes ? lines(msg.conexoes) : [])].filter(Boolean) },
    {
      title: "Bíblia",
      items: [
        msg.cenarioBiblico?.antes && `Antes: ${msg.cenarioBiblico.antes}`,
        msg.cenarioBiblico?.durante && `Ponto: ${msg.cenarioBiblico.durante}`,
        msg.cenarioBiblico?.depois && `Depois: ${msg.cenarioBiblico.depois}`,
      ].filter(Boolean),
    },
    {
      title: "Vida",
      items: [
        msg.cenarioVida?.anterior && `Antes: ${msg.cenarioVida.anterior}`,
        msg.cenarioVida?.atual && `Agora: ${msg.cenarioVida.atual}`,
        msg.cenarioVida?.futuro && `Depois: ${msg.cenarioVida.futuro}`,
      ].filter(Boolean),
    },
    { title: "Linha", items: lines(msg.raciocinio) },
    { title: "Frases", items: [...lines(msg.frases), ...lines(msg.historias)].slice(0, 6) },
    { title: "Curto", items: [...lines(msg.resumoCurto), msg.chamada && `Chamada: ${msg.chamada}`].filter(Boolean) },
  ];
}

export function emptyEbd() {
  return {
    id: null,
    serie: "",
    licao: "",
    data: "",
    faixa: "",
    objetivos: "",
    abertura: "",
    leitura: "",
    explicacao: "",
    perguntas: "",
    aplicacao: "",
    atividade: "",
    conclusao: "",
    recursos: "",
    messageId: null,
    status: "rascunho",
    publicado: false,
    updatedAt: new Date().toISOString(),
  };
}

export function emptyTranscription() {
  return {
    id: null,
    titulo: "",
    fonte: "",
    data: "",
    tags: "",
    texto: "",
    frases: "",
    historias: "",
    textosCitados: "",
    updatedAt: new Date().toISOString(),
  };
}

/** Modelo padrão de pedido de análise (uma etapa por vez). */
export function promptAnalise({ mensagem, etapa, pedido = "" }) {
  const step = STEPS.find((s) => s.id === etapa) || STEPS[mensagem?.stepIndex || 0];
  return {
    rol: "Especialista em ministração bíblica e linha de raciocínio pastoral.",
    objetivoOrdem: `Analisar SOMENTE o tópico «${step.title}». Não reescrever os outros tópicos.`,
    contexto: [
      `Frente: ${mensagem?.frente || "—"}`,
      `Tema: ${mensagem?.tema || "—"}`,
      `Ideia central: ${mensagem?.ideiaCentral || "—"}`,
      `Texto-base: ${mensagem?.textoBaseRef || "—"} (${mensagem?.versaoBiblia || "NVI"})`,
      `Tópico atual: ${step.title}`,
      `O que fazer neste tópico: ${step.action}`,
    ].join("\n"),
    especificidade: [
      "Resposta curta, objetiva e pronta para colar no painel.",
      "Usar tópicos claros (bullets).",
      "Manter linguagem bíblica segura (referências corretas).",
      "Se faltar dado, pedir só o mínimo necessário.",
      pedido ? `Pedido desta análise: ${pedido}` : "Aprofundar este tópico com clareza e impacto.",
    ].join("\n"),
  };
}

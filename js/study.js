export const FRENTES = [
  { id: "igreja", label: "Igreja", hint: "Ministração completa" },
  { id: "empresa", label: "Empresa", hint: "Momento de fé curto" },
  { id: "evangelismo", label: "Evangelismo", hint: "Gancho + Cristo + convite" },
  { id: "ebd", label: "EBD", hint: "Plano conforme a lição" },
];

export const STEPS = [
  { id: "tema", title: "Tema / ideia central", hint: "Uma frase que carrega a mensagem. Só isso nesta etapa." },
  { id: "versiculos", title: "Versículos", hint: "Texto-base: referência + citação (versão da Bíblia)." },
  { id: "conexoes", title: "Conexões", hint: "2 a 4 textos ligados (antes/depois na Escritura)." },
  { id: "cenario_biblico", title: "Cenário bíblico", hint: "Antes → no ponto → depois do texto." },
  { id: "cenario_vida", title: "Cenário de vida", hint: "Anterior → atual → futuro do ouvinte." },
  { id: "raciocinio", title: "Linha de raciocínio", hint: "Pontos numerados — o fio que não pode quebrar." },
  { id: "frases", title: "Frases e histórias", hint: "Frases de efeito e histórias (transcrição / pesquisa)." },
  { id: "resumo_curto", title: "Resumo curto", hint: "3–5 tópicos para oportunidade curta (empresa/abertura)." },
  { id: "mapa", title: "Mapa mental", hint: "Revise a estrutura visual para gravar." },
  { id: "chamada", title: "Chamada e checklist", hint: "Decisão, oração e lembretes de tempo." },
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
    {
      title: "Versículos",
      items: [msg.textoBaseRef, ...(msg.conexoes ? lines(msg.conexoes) : [])].filter(Boolean),
    },
    {
      title: "Cenário bíblico",
      items: [msg.cenarioBiblico?.antes && `Antes: ${msg.cenarioBiblico.antes}`, msg.cenarioBiblico?.durante && `Ponto: ${msg.cenarioBiblico.durante}`, msg.cenarioBiblico?.depois && `Depois: ${msg.cenarioBiblico.depois}`].filter(Boolean),
    },
    {
      title: "Cenário de vida",
      items: [msg.cenarioVida?.anterior && `Anterior: ${msg.cenarioVida.anterior}`, msg.cenarioVida?.atual && `Atual: ${msg.cenarioVida.atual}`, msg.cenarioVida?.futuro && `Futuro: ${msg.cenarioVida.futuro}`].filter(Boolean),
    },
    {
      title: "Raciocínio",
      items: lines(msg.raciocinio),
    },
    {
      title: "Frases",
      items: [...lines(msg.frases), ...lines(msg.historias)].slice(0, 6),
    },
    {
      title: "Formato",
      items: [...lines(msg.resumoCurto), msg.chamada && `Chamada: ${msg.chamada}`].filter(Boolean),
    },
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

# Modelo de pedido de análise

Use **um tópico por vez**. No painel: Acervo → Foco/Linha → escolha o tópico → Copiar prompt.

```
Rol:
Especialista em ministração bíblica e linha de raciocínio pastoral.

Objetivo/Ordem:
Analisar SOMENTE o tópico «[N. Nome]». Não reescrever os outros tópicos.

Contexto:
Frente: [igreja|empresa|evangelismo|ebd]
Tema: [...]
Ideia central: [...]
Texto-base: [ref] ([versão])
Tópico atual: [N. Nome]
O que fazer neste tópico: [ação do painel]

Especificidade/Expectativas:
- Resposta curta, objetiva e pronta para colar no painel.
- Usar tópicos claros (bullets).
- Manter referências bíblicas corretas.
- Se faltar dado, pedir só o mínimo.
- Transcrições: usar só como input local neste chat (Cursor). Não publicar na WEB.
- Pedido desta análise: [sua ênfase]
```

## Nova = só a âncora

Base online: **Frente + Tema + Ideia central + Texto-base**.  
O restante (conexões, cenários, frases, mapa, imagens) nasce da análise aqui e depois sobe para a WEB.

## Mapa com imagens

No tópico Mapa (ou após a análise), pedir 3–6 ilustrações da história (antes → ponto → depois / vida).  
Salvar em `assets/mindmaps/{messageId}/` e listar em `mapaImagens: [{ titulo, arquivo, legenda }]`.

## EBD

Fluxo separado da ministração: objetivos, dinâmica, perguntas, atividade.  
Publicar só a aula montada.

## Bíblia (WEB)

Versões livres (sem custo): EN **BSB**, PT **Open Nova Bíblia Viva** (`por_onbv`).  
Troca de idioma/versão na aba Bíblia. NVT/NVI exigem licença — não inclusos.

## Regra de ouro

Simples · resumido · objetivo · **uma análise = um tópico** · **só o montado vai online**.

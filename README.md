# Âncora · Painel de Ministração

Painel estático para montar e estudar mensagens bíblicas (Igreja · Empresa · Evangelismo · EBD), com Bíblia EN/PT gratuita e planos de leitura.

**Online:** https://painel-ministracao.vercel.app  
**Repo:** `andrade6991/painel-ministracao`

## O que tem

- **Acervo** com modo foco numa ministração
- **Nova = âncora** (Frente + Tema + Texto-base); o resto vem da análise no Cursor
- **Linha** tópicos 1–10 + prompt Rol/Objetivo/Contexto/Especificidade
- **Mapa mental** com imagens ilustrativas
- **EBD** separada (aula didática; só o montado publicado)
- **Bíblia** multi-idioma (API AO Lab, sem custo): defaults **BSB** (EN) + **Open Nova Bíblia Viva** (PT), cache IndexedDB, paralelo EN|PT, favoritos, copiar, usar na âncora, mini-aula de inglês, planos de leitura
- Transcrições **não** ficam na WEB (só input local no Cursor)

## Senha

Senha fixa configurada em `js/auth.js` / `data/auth-hash.json`. Há opção “Ver publicados” sem login completo.

## Stack

HTML + CSS + JS (sem build). Deploy Vercel: Framework **Other**, raiz do projeto.

## Análise no Cursor

Ver [`docs/PROMPT-ANALISE.md`](docs/PROMPT-ANALISE.md).

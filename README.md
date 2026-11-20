# Painel Ministração

Painel estático para montar e estudar mensagens bíblicas nas frentes **Igreja**, **Empresa**, **Evangelismo** e **EBD**.

Layout inspirado no Arjus (sidebar no desktop, menu inferior no celular, cards limpos).

## Uso

1. Abra o site (local ou Vercel).
2. No **primeiro acesso**, gere e guarde a senha → baixe `auth-hash.json`.
3. Coloque o hash em `data/auth-hash.json` e faça push (mesma senha na WEB).
4. Crie mensagens → estude **uma etapa por vez** → mapa mental → publique só o pronto.
5. Em **Config**, exporte o pacote `data` para backup/commit.

## Stack

HTML + CSS + JS (sem build). Deploy Vercel: Framework **Other**, output na raiz.

## Repo

`andrade6991/painel-ministracao`

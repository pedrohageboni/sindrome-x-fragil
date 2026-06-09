# SXF Triagem — Protótipo (React + Flask + MySQL)

Protótipo de sistema de triagem clínica para suspeita de **Síndrome do X Frágil (SXF)**.
Este pacote cobre o **fluxo de acesso**: cadastro de usuários com administração
multinível, login com senha protegida por hash, e um **dashboard** com conteúdo
que varia conforme o nível do usuário.

O login usa a **sessão do Flask** (cookie de sessão) — simples e sem bibliotecas
extras de autenticação.

```
sxf-triagem/
├── backend/                 # API Flask + MySQL
│   ├── Em breve             # Criando
└── frontend/                # React + Vite (JavaScript)
    ├── src/
    │   ├── pages/           # Login, Register, Dashboard
    │   ├── context/         # AuthContext (estado de sessão)
    │   ├── components/      # ProtectedRoute
    │   ├── api.js           # cliente HTTP
    │   └── styles.css       # CSS aqui depois
    ├── index.html
    ├── package.json
    └── vite.config.js
```

## Como funciona o login

rascunho

## Administração multinível (regra de negócio)

rascunho

---

# Setup passo a passo (do zero)

rascunho

## 1. MySQL — criar o banco

rascunho

## 2. Backend — Flask

rascunho

## 3. Frontend — React + Vite

rascunho

## 4. Primeiro acesso

rascunho

---

# Mapa de endpoints

rascunho

---

# Requisitos atendidos neste protótipo

rascunho

# Próximos passos (fora do escopo deste protótipo)

rascunho

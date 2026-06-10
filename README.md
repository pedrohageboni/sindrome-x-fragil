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

1. O usuário envia e-mail e senha para `/api/auth/login`.
2. O backend confere a senha (comparando com o hash salvo) e, se estiver correta,
   guarda os dados do usuário na **sessão do Flask**. O Flask devolve um cookie
   de sessão assinado.
3. Nas próximas requisições o navegador reenvia esse cookie automaticamente, e o
   backend sabe quem está logado. Para sair, `/api/auth/logout` limpa a sessão.

Sem tokens, sem armazenamento manual de credenciais no frontend.

## Administração multinível (regra de negócio)

rascunho

---

# Setup passo a passo (do zero)

> Pré-requisitos: **Python 3.10+**, **Node.js 18+** e **MySQL 8+** instalados.
> Os comandos abaixo assumem Linux/macOS. No Windows, troque
> `source .venv/bin/activate` por `.venv\Scripts\activate`.

## 1. MySQL — criar o banco

Garanta que o serviço do MySQL está rodando. Depois rode o schema (ele já cria o
database `sxf_triagem`):

```bash
cd backend
mysql -u root -p < schema.sql
```

Isso cria todas as tabelas e popula `sintomas` e `limiares` com os dados do protocolo.

## 2. Backend — Flask

```bash
cd backend

# 2.1 Ambiente virtual
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2.2 Dependências
pip install -r requirements.txt

# 2.3 Variáveis de ambiente
cp .env.example .env
#   abra .env e ajuste DB_USER / DB_PASSWORD para o seu MySQL.
#   gere uma SECRET_KEY forte:
python -c "import secrets; print(secrets.token_hex(32))"
#   cole o valor em SECRET_KEY dentro do .env

# 2.4 Subir a API
python app.py
```

A API sobe em **http://localhost:5000**. Teste:

```bash
curl http://localhost:5000/api/health
# {"servico":"SXF Triagem API","status":"ok"}
```

## 3. Frontend — React + Vite

Em **outro terminal**:

```bash
cd frontend
npm install
npm run dev
```

Abra **http://localhost:5173**. O Vite faz proxy de `/api` para o Flask, então o
cookie de sessão funciona sem complicação de CORS em desenvolvimento.

## 4. Primeiro acesso

1. Vá em **Criar conta** → cadastre o primeiro usuário.
   Ele vira **admin** automaticamente (bootstrap).
2. Faça **login** com esse usuário.
3. No dashboard, use **Cadastrar usuário** para criar contas `medico` e `recepcao`.

---

# Mapa de endpoints

rascunho

---

# Requisitos atendidos neste protótipo

rascunho

# Próximos passos (fora do escopo deste protótipo)

rascunho

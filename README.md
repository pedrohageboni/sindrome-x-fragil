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
│   ├── app.py               # rotas (login, cadastro, usuários, dashboard)
│   ├── auth.py              # hash de senha + decorators de permissão
│   ├── config.py            # configuração via .env
│   ├── db.py                # conexão MySQL
│   ├── schema.sql           # banco de dados (seu schema + CREATE DATABASE)
│   ├── requirements.txt
│   └── .env.example
└── frontend/                # React + Vite (JavaScript)
    ├── src/
    │   ├── pages/           # Login, Register, Dashboard
    │   ├── context/         # AuthContext (estado de sessão)
    │   ├── components/      # ProtectedRoute
    │   ├── api.js           # cliente HTTP
    │   └── styles.css       # CSS minimalista
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

Três níveis, conforme o `ENUM` da tabela `usuarios`:

| Nível      | O que vê no dashboard                                   |
|------------|--------------------------------------------------------|
| `admin`    | Métricas + **gestão de usuários** (criar, mudar nível, ativar/desativar) |
| `medico`   | Métricas + painel de avaliação clínica                 |
| `recepcao` | Métricas + painel de cadastro de pacientes             |

**Bootstrap do primeiro usuário:** enquanto não existe nenhum usuário, o primeiro
cadastro é promovido automaticamente a `admin`. Depois disso, **apenas um admin
logado** pode cadastrar novos usuários e definir o nível deles.

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

| Método | Rota                       | Acesso        | Descrição                          |
|--------|----------------------------|---------------|------------------------------------|
| GET    | `/api/health`              | público       | Status da API                      |
| POST   | `/api/auth/registrar`      | público*/admin| Cadastra usuário (*1º = admin)     |
| POST   | `/api/auth/login`          | público       | Autentica e cria a sessão          |
| POST   | `/api/auth/logout`         | autenticado   | Encerra a sessão                   |
| GET    | `/api/auth/me`             | autenticado   | Dados do usuário logado            |
| GET    | `/api/dashboard`           | autenticado   | Métricas resumidas                 |
| GET    | `/api/usuarios`            | admin         | Lista usuários                     |
| PATCH  | `/api/usuarios/<id>`       | admin         | Altera nível / ativa-desativa      |

---

# Requisitos atendidos neste protótipo

- **RF11** — autenticação antes do acesso (login + sessão).
- **RF08 / RNF08** — limiares e pesos configuráveis (tabelas `limiares` e `sintomas`).
- **RNF01** — senha armazenada com hash (nunca em texto puro).
- **RNF02** — controle de acesso por perfil (`admin`/`medico`/`recepcao`).
- **RNF03** — auditoria de ações em `historico_acesso` (login, cadastro, edição).
- **RNF06 / RNF07** — interface enxuta e responsiva.

# Próximos passos (fora do escopo deste protótipo)

- Telas de cadastro de paciente, checklist clínico, cálculo de score e laudo
  (tabelas `pacientes`, `avaliacoes`, `respostas_avaliacao`, `laudos` já existem no schema).
- Endpoint de cálculo de score somando os pesos dos sintomas presentes e
  comparando com o limiar do sexo (RF06/RF07).

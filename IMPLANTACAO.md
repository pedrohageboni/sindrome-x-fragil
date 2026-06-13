# Documento Técnico de Implantação — SXF Triagem

Este documento descreve o que é preciso para instalar e rodar o sistema, do zero, em uma máquina nova. Serve tanto para o ambiente de desenvolvimento quanto para uma implantação simples.

## Visão geral

O sistema tem três partes:

- Back-end: API em Flask (Python), na porta 5000.
- Front-end: aplicação React servida pelo Vite, na porta 5173 em desenvolvimento.
- Banco de dados: MySQL.

O front-end conversa com o back-end pelas rotas que começam com `/api`. Em desenvolvimento, o Vite redireciona essas chamadas para o Flask, então as duas partes rodam ao mesmo tempo, em terminais separados.

## Requisitos

- Sistema operacional: Windows 10/11, Linux ou macOS.
- Python 3.10 ou mais novo.
- Node.js 18 ou mais novo (vem com o npm).
- MySQL 8.0 ou mais novo (o MySQL Workbench ajuda a rodar o script).

Para conferir as versões instaladas:

```
python --version
node --version
npm --version
mysql --version
```

## Bibliotecas do back-end

Estão no arquivo `backend/requirements.txt`:

- Flask (servidor web e rotas)
- flask-cors (libera o acesso do front-end)
- python-dotenv (lê o arquivo .env)
- mysql-connector-python (conexão com o MySQL)
- Werkzeug (hash das senhas)
- fpdf2 (geração do laudo em PDF)

Para travar as versões exatas que você usou, depois de instalar tudo rode:

```
pip freeze > requirements.txt
```

## Bibliotecas do front-end

Ficam no `frontend/package.json` e são instaladas com `npm install`. As principais são React, React Router e Vite.

## Passo a passo da instalação

### 1. Banco de dados

1. Abra o MySQL (ou o MySQL Workbench).
2. Rode o arquivo `backend/schema.sql`. Ele cria o banco `sxf_triagem`, todas as tabelas e já insere os sintomas e os limiares.
3. Para confirmar, verifique se o banco `sxf_triagem` apareceu com as tabelas dentro.

Se já existia um banco de uma versão anterior, rode `backend/migration_v2.sql` em vez do schema. Ele ajusta as tabelas e recarrega os sintomas sem apagar usuários e pacientes.

### 2. Back-end

Na pasta `backend`:

```
python -m venv venv
venv\Scripts\activate        (Windows)
source venv/bin/activate     (Linux ou macOS)
pip install -r requirements.txt
```

Crie o arquivo `.env` na mesma pasta, com o conteúdo abaixo, ajustando usuário e senha do seu MySQL:

```
SECRET_KEY=coloque-uma-frase-secreta-aqui
FRONTEND_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_NAME=sxf_triagem
```

Suba a API:

```
python app.py
```

Para testar se está no ar, abra http://localhost:5000/api/health no navegador. Deve aparecer uma resposta com `"status": "ok"`.

### 3. Front-end

Em outro terminal, na pasta `frontend`:

```
npm install
npm run dev
```

Abra http://localhost:5173.

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| SECRET_KEY | Chave usada para assinar o cookie de sessão. Use um valor longo e secreto. |
| FRONTEND_ORIGIN | Endereço do front-end, liberado no CORS. |
| DB_HOST | Endereço do MySQL (geralmente localhost). |
| DB_PORT | Porta do MySQL (padrão 3306). |
| DB_USER | Usuário do banco. |
| DB_PASSWORD | Senha do banco. |
| DB_NAME | Nome do banco (sxf_triagem). |

## Observações para um ambiente de produção

O projeto está configurado para desenvolvimento. Se for colocar no ar de verdade, vale ajustar alguns pontos:

- O Flask roda com `debug=True` no `app.py`. Em produção, desligue o debug e use um servidor como Waitress (Windows) ou Gunicorn (Linux) no lugar do servidor embutido.
- Gere a versão final do front-end com `npm run build`. Isso cria a pasta `dist`, que pode ser servida por um servidor web (Nginx, Apache) ou pelo próprio back-end.
- Configure o cookie de sessão como seguro (Secure, HttpOnly, SameSite) quando o site estiver em HTTPS.
- Troque a SECRET_KEY por um valor forte e não a deixe no repositório.

## Problemas comuns

A API não conecta no banco. Confira usuário, senha e nome do banco no `.env`, e veja se o MySQL está rodando.

O front-end não acha a API. Confira se o back-end está rodando na porta 5000 e se o proxy do Vite aponta para ela.

Erro ao baixar o PDF. Confirme que o `fpdf2` foi instalado (`pip install fpdf2`).

Caracteres acentuados estranhos no banco. Garanta que o banco está em utf8mb4 (o `schema.sql` já cria assim).

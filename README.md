# SXF Triagem

Sistema web para apoiar a triagem clínica da Síndrome do X Frágil (SXF). A ideia é simples: o profissional marca os sinais que o paciente apresenta, o sistema soma uma pontuação e diz se vale a pena encaminhar para teste genético ou apenas acompanhar.

A parte clínica (lista de sintomas, pesos e limiares) foi tirada do artigo de Romero et al. (2025), que validou um checklist de triagem para a população brasileira.

Projeto desenvolvido para a disciplina de Experiência Criativa, no curso de Ciência da Computação da PUCPR.

## O que o sistema faz

- Login e cadastro de usuários com três níveis de acesso: recepção, médico e administrador.
- A recepção cadastra os pacientes.
- O médico aplica o checklist e gera o laudo. Só o médico consegue criar avaliações.
- O administrador gerencia os usuários (ativa, desativa e muda o nível de acesso).
- O cálculo da pontuação é feito no servidor, com pesos diferentes para homens e mulheres, do jeito que o artigo descreve.
- O laudo pode ser baixado em PDF.

## Tecnologias usadas

- Front-end: React (com Vite)
- Back-end: Flask (Python)
- Banco de dados: MySQL

A autenticação é por sessão do Flask (cookie assinado), sem token.

## Como rodar

Você vai precisar de Python 3.10 ou mais novo, Node 18 ou mais novo, e MySQL instalado.

### 1. Banco de dados

Abra o MySQL e rode o arquivo `backend/schema.sql`. Ele cria o banco `sxf_triagem`, as tabelas, e já preenche os sintomas e os limiares.

Se você já tinha uma versão antiga do banco com dados, rode o `backend/migration_v2.sql` no lugar. Ele atualiza as tabelas sem apagar usuários e pacientes.

### 2. Back-end

Dentro da pasta `backend`:

```
python -m venv venv
venv\Scripts\activate        (Windows)
source venv/bin/activate     (Linux ou Mac)
pip install -r requirements.txt
```

Crie um arquivo `.env` na pasta `backend` com os dados do seu banco (tem um exemplo logo abaixo). Depois é só rodar:

```
python app.py
```

A API sobe em http://localhost:5000.

Exemplo de `.env`:

```
SECRET_KEY=coloque-uma-frase-secreta-aqui
FRONTEND_ORIGIN=http://localhost:5173
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_do_mysql
DB_NAME=sxf_triagem
```

### 3. Front-end

Dentro da pasta `frontend`:

```
npm install
npm run dev
```

Abre em http://localhost:5173. O Vite já redireciona as chamadas de `/api` para o Flask, então não precisa configurar mais nada para o dev.

## Primeiro acesso

O primeiro usuário que se cadastrar vira administrador automaticamente. A partir daí, só o admin cria novos usuários e escolhe o nível de cada um.

Para testar o fluxo completo:

1. Vá em /cadastro e crie o primeiro usuário (ele vira admin).
2. Logado como admin, cadastre um médico e uma recepção.
3. Cadastre um paciente na tela de Pacientes.
4. Entre como médico e preencha o CRM em "Meu perfil".
5. Crie uma avaliação, veja o resultado e baixe o laudo em PDF.

## Como funciona o cálculo

Cada sintoma tem um peso para o sexo masculino e outro para o feminino. O score é a soma dos pesos dos sintomas marcados como presentes. Se o score chega no limiar do sexo (0,56 para homens e 0,55 para mulheres), o resultado é "encaminhar". Se fica abaixo, é "monitorar". O macroorquidismo só aparece e só conta para pacientes do sexo masculino, como no artigo.

A conta é sempre refeita no servidor a partir dos pesos guardados no banco. O navegador só envia quais sintomas foram marcados.

## Estrutura das pastas

```
backend/    API em Flask, scripts do banco e requirements
frontend/   aplicação React
docs/       tutorial de uso e documento de implantação
```

## Aviso

Este é um projeto acadêmico e funciona como ferramenta de apoio à decisão. Ele não substitui a avaliação de um médico nem o diagnóstico, que depende de teste genético (PCR ou Southern blot).

## Licença

MIT. O texto completo está no arquivo LICENSE.

## Equipe

Victor Silveira Portelinha, GUstavo Henrique Levis, Pedro Henrique Hage Bonicontro

Disciplina de Experiência Criativa, PUCPR.

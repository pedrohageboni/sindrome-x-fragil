"""SXF Triagem — API Flask (protótipo).

Login simples baseado em sessão (cookie do Flask). Sem tokens.

Foco deste protótipo:
  - Autenticação (login/cadastro) com hash de senha
  - Administração multinível: admin | medico | recepcao
  - Dados resumidos para o dashboard
  - Auditoria de ações em historico_acesso
"""
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()  # carrega .env antes de importar Config

from config import Config
from db import get_cursor
from auth import hash_senha, verificar_senha, login_required, roles_required

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY
CORS(
    app,
    resources={r"/api/*": {"origins": Config.FRONTEND_ORIGIN}},
    supports_credentials=True,
)

NIVEIS_VALIDOS = ("admin", "medico", "recepcao")


# --------------------------- Utilitários ---------------------------------
def registrar_log(id_usuario, acao, entidade=None, entidade_id=None):
    """Grava auditoria. Falha silenciosa para não quebrar o fluxo."""
    try:
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT INTO historico_acesso
                       (id_usuario, acao, entidade, entidade_id, ip)
                   VALUES (%s, %s, %s, %s, %s)""",
                (id_usuario, acao, entidade, entidade_id, request.remote_addr),
            )
    except Exception as exc:  # pragma: no cover
        app.logger.warning("Falha ao registrar log: %s", exc)


# ------------------------------ Health -----------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "servico": "SXF Triagem API"}


# ----------------------------- Cadastro ----------------------------------
@app.post("/api/auth/registrar")
def registrar():
    """Cadastra um novo usuário.

    Regra de negócio (multinível):
      - Se ainda NÃO existe nenhum usuário, o primeiro cadastro vira 'admin'
        automaticamente (bootstrap inicial do sistema).
      - A partir daí, apenas um usuário 'admin' logado pode cadastrar outros
        usuários e definir o nível deles.
    """
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""
    nivel = (dados.get("nivel") or "recepcao").strip()

    if not nome or not email or not senha:
        return jsonify({"erro": "nome, email e senha são obrigatórios"}), 400
    if len(senha) < 6:
        return jsonify({"erro": "A senha deve ter ao menos 6 caracteres"}), 400
    if nivel not in NIVEIS_VALIDOS:
        return jsonify({"erro": "Nível inválido"}), 400

    # Existe algum usuário?
    with get_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS total FROM usuarios")
        total = cur.fetchone()["total"]

    if total == 0:
        # Bootstrap: primeiro usuário vira admin
        nivel = "admin"
        criador = None
    else:
        # Apenas admin logado pode criar novos usuários
        if "usuario" not in session:
            return (
                jsonify(
                    {
                        "erro": "Cadastro restrito. Faça login como admin para "
                        "criar novos usuários."
                    }
                ),
                401,
            )
        if session["usuario"]["nivel"] != "admin":
            return jsonify({"erro": "Apenas administradores cadastram usuários"}), 403
        criador = session["usuario"]["id_usuario"]

    # E-mail único?
    with get_cursor() as cur:
        cur.execute("SELECT id_usuario FROM usuarios WHERE email = %s", (email,))
        if cur.fetchone():
            return jsonify({"erro": "E-mail já cadastrado"}), 409

    with get_cursor(commit=True) as cur:
        cur.execute(
            """INSERT INTO usuarios (nome, email, senha_hash, nivel)
               VALUES (%s, %s, %s, %s)""",
            (nome, email, hash_senha(senha), nivel),
        )
        novo_id = cur.lastrowid

    registrar_log(criador or novo_id, "cadastro_usuario", "usuarios", novo_id)
    return (
        jsonify(
            {
                "mensagem": "Usuário cadastrado com sucesso",
                "id_usuario": novo_id,
                "nivel": nivel,
                "bootstrap_admin": total == 0,
            }
        ),
        201,
    )


# ------------------------------- Login -----------------------------------
@app.post("/api/auth/login")
def login():
    dados = request.get_json(silent=True) or {}
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    if not email or not senha:
        return jsonify({"erro": "Informe e-mail e senha"}), 400

    with get_cursor() as cur:
        cur.execute(
            """SELECT id_usuario, nome, email, senha_hash, nivel, ativo
               FROM usuarios WHERE email = %s""",
            (email,),
        )
        usuario = cur.fetchone()

    if not usuario or not verificar_senha(senha, usuario["senha_hash"]):
        return jsonify({"erro": "Credenciais inválidas"}), 401
    if not usuario["ativo"]:
        return jsonify({"erro": "Usuário inativo"}), 403

    # Atualiza último acesso
    with get_cursor(commit=True) as cur:
        cur.execute(
            "UPDATE usuarios SET ultimo_acesso = CURRENT_TIMESTAMP WHERE id_usuario = %s",
            (usuario["id_usuario"],),
        )

    # Guarda o usuário na sessão (cookie assinado pelo Flask)
    session["usuario"] = {
        "id_usuario": usuario["id_usuario"],
        "nome": usuario["nome"],
        "email": usuario["email"],
        "nivel": usuario["nivel"],
    }

    registrar_log(usuario["id_usuario"], "login")
    return jsonify({"usuario": session["usuario"]})


# ------------------------------- Logout ----------------------------------
@app.post("/api/auth/logout")
def logout():
    session.clear()
    return jsonify({"mensagem": "Sessão encerrada"})


# ------------------------------- Perfil ----------------------------------
@app.get("/api/auth/me")
@login_required
def me():
    return jsonify({"usuario": session["usuario"]})


# ------------------------- Gestão de usuários ----------------------------
@app.get("/api/usuarios")
@roles_required("admin")
def listar_usuarios():
    with get_cursor() as cur:
        cur.execute(
            """SELECT id_usuario, nome, email, nivel, ativo, criado_em, ultimo_acesso
               FROM usuarios ORDER BY criado_em DESC"""
        )
        usuarios = cur.fetchall()
    for u in usuarios:
        for campo in ("criado_em", "ultimo_acesso"):
            if u[campo] is not None:
                u[campo] = u[campo].isoformat()
    return jsonify({"usuarios": usuarios})


@app.patch("/api/usuarios/<int:id_usuario>")
@roles_required("admin")
def atualizar_usuario(id_usuario):
    """Permite ao admin alterar nível ou ativar/desativar um usuário."""
    dados = request.get_json(silent=True) or {}
    campos, valores = [], []

    if "nivel" in dados:
        if dados["nivel"] not in NIVEIS_VALIDOS:
            return jsonify({"erro": "Nível inválido"}), 400
        campos.append("nivel = %s")
        valores.append(dados["nivel"])
    if "ativo" in dados:
        campos.append("ativo = %s")
        valores.append(1 if dados["ativo"] else 0)

    if not campos:
        return jsonify({"erro": "Nada para atualizar"}), 400

    valores.append(id_usuario)
    with get_cursor(commit=True) as cur:
        cur.execute(
            f"UPDATE usuarios SET {', '.join(campos)} WHERE id_usuario = %s", valores
        )

    registrar_log(session["usuario"]["id_usuario"], "editar_usuario", "usuarios", id_usuario)
    return jsonify({"mensagem": "Usuário atualizado"})


# --------------------------- Dashboard -----------------------------------
@app.get("/api/dashboard")
@login_required
def dashboard():
    """Métricas resumidas. O frontend decide o que exibir conforme o nível."""
    with get_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS total FROM pacientes")
        total_pacientes = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS total FROM avaliacoes")
        total_avaliacoes = cur.fetchone()["total"]

        cur.execute(
            "SELECT COUNT(*) AS total FROM avaliacoes WHERE resultado = 'encaminhar'"
        )
        total_encaminhamentos = cur.fetchone()["total"]

        cur.execute(
            "SELECT COUNT(*) AS total FROM avaliacoes WHERE resultado = 'monitorar'"
        )
        total_monitoramento = cur.fetchone()["total"]

        cur.execute("SELECT COUNT(*) AS total FROM usuarios WHERE ativo = 1")
        total_usuarios = cur.fetchone()["total"]

    return jsonify(
        {
            "metricas": {
                "pacientes": total_pacientes,
                "avaliacoes": total_avaliacoes,
                "encaminhamentos": total_encaminhamentos,
                "monitoramento": total_monitoramento,
                "usuarios_ativos": total_usuarios,
            }
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

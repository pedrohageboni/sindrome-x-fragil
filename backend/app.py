
from flask import Flask, request, jsonify, session, Response
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()  # carrega .env antes de importar Config

from config import Config
from db import get_cursor
from auth import hash_senha, verificar_senha, login_required, roles_required

import decimal

app = Flask(__name__)
app.secret_key = Config.SECRET_KEY
CORS(
    app,
    resources={r"/api/*": {"origins": Config.FRONTEND_ORIGIN}},
    supports_credentials=True,
)


# As colunas de peso/score são DECIMAL no MySQL e voltam como decimal.Decimal,
# que o jsonify não serializa por padrão. Convertendo para float na saída JSON.
try:  # Flask >= 2.2
    from flask.json.provider import DefaultJSONProvider

    class _DecimalJSONProvider(DefaultJSONProvider):
        def default(self, obj):
            if isinstance(obj, decimal.Decimal):
                return float(obj)
            return super().default(obj)

    app.json = _DecimalJSONProvider(app)
except ImportError:  # Flask < 2.2
    from flask.json import JSONEncoder

    class _DecimalJSONEncoder(JSONEncoder):
        def default(self, obj):
            if isinstance(obj, decimal.Decimal):
                return float(obj)
            return super().default(obj)

    app.json_encoder = _DecimalJSONEncoder


NIVEIS_VALIDOS = ("admin", "medico", "recepcao")



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


def iso(valor):
    """Converte datetime -> string ISO (ou devolve o valor original)."""
    return valor.isoformat() if valor is not None else None


def _latin1(texto):
    """Mantém apenas caracteres compatíveis com a fonte padrão do PDF."""
    return (str(texto) if texto is not None else "").encode("latin-1", "replace").decode("latin-1")


def _montar_laudo_pdf(av, respostas, laudo):
    """Monta o laudo da avaliação em PDF (fpdf2)."""
    from fpdf import FPDF
    from fpdf.enums import XPos, YPos

    sexo = "Masculino" if av["sexo_biologico"] == "M" else "Feminino"
    encaminhar = av["resultado"] == "encaminhar"
    data = av["data_avaliacao"]
    data_fmt = data.strftime("%d/%m/%Y %H:%M") if hasattr(data, "strftime") else str(data)

    pdf = FPDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    def titulo(txt):
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(40, 40, 90)
        pdf.cell(0, 8, _latin1(txt), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        pdf.set_text_color(0, 0, 0)

    def linha(rotulo, valor):
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(45, 6, _latin1(rotulo))
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(0, 6, _latin1(valor), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # Cabeçalho
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, _latin1("Laudo de Triagem - SXF"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(110, 110, 110)
    pdf.cell(0, 5, _latin1("Síndrome do X Frágil - Protocolo SXF-BR"),
             new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_text_color(0, 0, 0)
    pdf.ln(5)

    titulo("Paciente")
    linha("Nome:", av["paciente"])
    linha("Idade:", f"{av['idade']} anos")
    linha("Sexo biológico:", sexo)
    pdf.ln(3)

    titulo("Profissional responsável")
    linha("Nome:", av["profissional"])
    linha("CRM:", av["crm"])
    linha("Data:", data_fmt)
    pdf.ln(3)

    titulo("Resultado")
    linha("Score:", f"{float(av['score_obtido']):.2f}")
    linha("Limiar aplicado:", f"{float(av['limiar_aplicado']):.2f}")
    pdf.set_font("Helvetica", "B", 12)
    if encaminhar:
        pdf.set_text_color(160, 40, 40)
        pdf.cell(0, 8, _latin1("ENCAMINHAR PARA TESTE GENÉTICO"),
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    else:
        pdf.set_text_color(40, 110, 70)
        pdf.cell(0, 8, _latin1("MONITORAR / ACOMPANHAR"),
                 new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_text_color(0, 0, 0)
    if laudo.get("indicacao"):
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _latin1("Indicação: " + laudo["indicacao"]))
    pdf.ln(3)

    titulo("Sintomas avaliados")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_fill_color(235, 235, 235)
    pdf.cell(120, 7, _latin1("Sintoma"), fill=True)
    pdf.cell(35, 7, _latin1("Presença"), fill=True)
    pdf.cell(0, 7, _latin1("Peso"), fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("Helvetica", "", 9)
    for r in respostas:
        presente = "Presente" if r["presente"] else "Ausente"
        peso = f"{float(r['peso_aplicado']):.2f}" if r["presente"] else "-"
        pdf.cell(120, 6, _latin1(r["nome"]))
        pdf.cell(35, 6, _latin1(presente))
        pdf.cell(0, 6, _latin1(peso), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(3)

    if av.get("observacoes"):
        titulo("Observações")
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 5, _latin1(av["observacoes"]))
        pdf.ln(2)

    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(0, 4, _latin1(
        "Ferramenta de apoio à decisão clínica, de uso acadêmico. Não substitui "
        "avaliação médica nem o diagnóstico, que depende de teste genético "
        "(PCR ou Southern blot)."
    ))
    return pdf


# ------------------------------ Health -----------------------------------
@app.get("/api/health")
def health():
    return {"status": "ok", "servico": "SXF Triagem API"}


# ----------------------------- Cadastro ----------------------------------
@app.post("/api/auth/registrar")
def registrar():
    
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


# ----------------------------- Sintomas ----------------------------------
@app.get("/api/sintomas")
@login_required
def listar_sintomas():
    """Lista os sintomas ativos do checklist (com pesos por sexo)."""
    with get_cursor() as cur:
        cur.execute(
            """SELECT id_sintoma, nome, categoria, peso_masculino, peso_feminino
               FROM sintomas WHERE ativo = 1
               ORDER BY categoria, id_sintoma"""
        )
        sintomas = cur.fetchall()
    return jsonify({"sintomas": sintomas})


# ----------------------------- Limiares ----------------------------------
@app.get("/api/limiares")
@login_required
def listar_limiares():
    """Devolve os limiares por sexo no formato {'M': {...}, 'F': {...}}."""
    with get_cursor() as cur:
        cur.execute("SELECT sexo_biologico, valor, score_maximo FROM limiares")
        linhas = cur.fetchall()
    return jsonify({"limiares": {l["sexo_biologico"]: l for l in linhas}})


# ----------------------------- Pacientes ----------------------------------
@app.get("/api/pacientes")
@login_required
def listar_pacientes():
    with get_cursor() as cur:
        cur.execute(
            """SELECT p.id_paciente, p.nome_completo, p.idade, p.sexo_biologico,
                      p.responsavel, p.criado_em,
                      (SELECT COUNT(*) FROM avaliacoes a
                        WHERE a.id_paciente = p.id_paciente) AS total_avaliacoes
               FROM pacientes p
               ORDER BY p.criado_em DESC"""
        )
        pacientes = cur.fetchall()
    for p in pacientes:
        p["criado_em"] = iso(p["criado_em"])
    return jsonify({"pacientes": pacientes})


@app.post("/api/pacientes")
@roles_required("recepcao", "medico", "admin")
def criar_paciente():
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome_completo") or "").strip()
    idade = dados.get("idade")
    sexo = (dados.get("sexo_biologico") or "").strip().upper()
    responsavel = (dados.get("responsavel") or "").strip() or None

    if not nome:
        return jsonify({"erro": "Nome do paciente é obrigatório"}), 400
    try:
        idade = int(idade)
    except (TypeError, ValueError):
        return jsonify({"erro": "Idade inválida"}), 400
    if idade < 0 or idade > 120:
        return jsonify({"erro": "Idade deve estar entre 0 e 120"}), 400
    if sexo not in ("M", "F"):
        return jsonify({"erro": "Sexo biológico deve ser M ou F"}), 400

    with get_cursor(commit=True) as cur:
        cur.execute(
            """INSERT INTO pacientes
                   (nome_completo, idade, sexo_biologico, responsavel, criado_por)
               VALUES (%s, %s, %s, %s, %s)""",
            (nome, idade, sexo, responsavel, session["usuario"]["id_usuario"]),
        )
        novo_id = cur.lastrowid

    registrar_log(
        session["usuario"]["id_usuario"], "cadastro_paciente", "pacientes", novo_id
    )
    return jsonify({"mensagem": "Paciente cadastrado", "id_paciente": novo_id}), 201


@app.get("/api/pacientes/<int:id_paciente>")
@login_required
def obter_paciente(id_paciente):
    with get_cursor() as cur:
        cur.execute(
            """SELECT id_paciente, nome_completo, idade, sexo_biologico,
                      responsavel, criado_em
               FROM pacientes WHERE id_paciente = %s""",
            (id_paciente,),
        )
        paciente = cur.fetchone()
        if not paciente:
            return jsonify({"erro": "Paciente não encontrado"}), 404
        paciente["criado_em"] = iso(paciente["criado_em"])

        cur.execute(
            """SELECT a.id_avaliacao, a.score_obtido, a.limiar_aplicado,
                      a.resultado, a.data_avaliacao, pr.nome_completo AS profissional
               FROM avaliacoes a
               JOIN profissionais pr ON pr.id_profissional = a.id_profissional
               WHERE a.id_paciente = %s
               ORDER BY a.data_avaliacao DESC""",
            (id_paciente,),
        )
        avaliacoes = cur.fetchall()
    for a in avaliacoes:
        a["data_avaliacao"] = iso(a["data_avaliacao"])
    return jsonify({"paciente": paciente, "avaliacoes": avaliacoes})


# ------------------------- Perfil profissional ---------------------------
@app.get("/api/profissionais/me")
@roles_required("medico")
def obter_profissional():
    """Perfil profissional (CRM/especialidade) do médico logado."""
    uid = session["usuario"]["id_usuario"]
    with get_cursor() as cur:
        cur.execute(
            """SELECT id_profissional, nome_completo, crm, especialidade
               FROM profissionais WHERE id_usuario = %s""",
            (uid,),
        )
        prof = cur.fetchone()
    return jsonify({"profissional": prof})


@app.post("/api/profissionais/me")
@roles_required("medico")
def salvar_profissional():
    """Cria ou atualiza o perfil profissional do médico logado.

    É um pré-requisito para criar avaliações, pois `avaliacoes` referencia
    `profissionais` (e o CRM identifica o responsável pelo laudo).
    """
    uid = session["usuario"]["id_usuario"]
    dados = request.get_json(silent=True) or {}
    crm = (dados.get("crm") or "").strip()
    especialidade = (dados.get("especialidade") or "").strip() or None
    nome_completo = (dados.get("nome_completo") or session["usuario"]["nome"]).strip()

    if not crm:
        return jsonify({"erro": "CRM é obrigatório"}), 400

    with get_cursor() as cur:
        # CRM único entre profissionais (exceto o próprio registro)
        cur.execute(
            "SELECT id_profissional FROM profissionais WHERE crm = %s AND id_usuario <> %s",
            (crm, uid),
        )
        if cur.fetchone():
            return jsonify({"erro": "CRM já cadastrado para outro profissional"}), 409
        cur.execute(
            "SELECT id_profissional FROM profissionais WHERE id_usuario = %s", (uid,)
        )
        existente = cur.fetchone()

    with get_cursor(commit=True) as cur:
        if existente:
            cur.execute(
                """UPDATE profissionais
                       SET nome_completo = %s, crm = %s, especialidade = %s
                     WHERE id_usuario = %s""",
                (nome_completo, crm, especialidade, uid),
            )
        else:
            cur.execute(
                """INSERT INTO profissionais
                       (id_usuario, nome_completo, crm, especialidade)
                   VALUES (%s, %s, %s, %s)""",
                (uid, nome_completo, crm, especialidade),
            )

    registrar_log(uid, "salvar_perfil_profissional", "profissionais")
    return jsonify({"mensagem": "Perfil profissional salvo"})


# ----------------------------- Avaliações ---------------------------------
@app.get("/api/avaliacoes")
@login_required
def listar_avaliacoes():
    with get_cursor() as cur:
        cur.execute(
            """SELECT a.id_avaliacao, a.score_obtido, a.limiar_aplicado,
                      a.resultado, a.data_avaliacao,
                      p.nome_completo AS paciente, p.sexo_biologico,
                      pr.nome_completo AS profissional
               FROM avaliacoes a
               JOIN pacientes p ON p.id_paciente = a.id_paciente
               JOIN profissionais pr ON pr.id_profissional = a.id_profissional
               ORDER BY a.data_avaliacao DESC"""
        )
        avaliacoes = cur.fetchall()
    for a in avaliacoes:
        a["data_avaliacao"] = iso(a["data_avaliacao"])
    return jsonify({"avaliacoes": avaliacoes})


@app.get("/api/avaliacoes/<int:id_avaliacao>")
@login_required
def obter_avaliacao(id_avaliacao):
    with get_cursor() as cur:
        cur.execute(
            """SELECT a.id_avaliacao, a.score_obtido, a.limiar_aplicado,
                      a.resultado, a.observacoes, a.data_avaliacao,
                      p.id_paciente, p.nome_completo AS paciente,
                      p.idade, p.sexo_biologico,
                      pr.nome_completo AS profissional, pr.crm
               FROM avaliacoes a
               JOIN pacientes p ON p.id_paciente = a.id_paciente
               JOIN profissionais pr ON pr.id_profissional = a.id_profissional
               WHERE a.id_avaliacao = %s""",
            (id_avaliacao,),
        )
        avaliacao = cur.fetchone()
        if not avaliacao:
            return jsonify({"erro": "Avaliação não encontrada"}), 404
        avaliacao["data_avaliacao"] = iso(avaliacao["data_avaliacao"])

        cur.execute(
            """SELECT r.presente, r.peso_aplicado, s.nome, s.categoria
               FROM respostas_avaliacao r
               JOIN sintomas s ON s.id_sintoma = r.id_sintoma
               WHERE r.id_avaliacao = %s
               ORDER BY s.categoria, s.id_sintoma""",
            (id_avaliacao,),
        )
        respostas = cur.fetchall()

        cur.execute(
            """SELECT indicacao, resumo_diagnostico, gerado_em
               FROM laudos WHERE id_avaliacao = %s""",
            (id_avaliacao,),
        )
        laudo = cur.fetchone()
        if laudo:
            laudo["gerado_em"] = iso(laudo["gerado_em"])

    return jsonify({"avaliacao": avaliacao, "respostas": respostas, "laudo": laudo})


@app.get("/api/avaliacoes/<int:id_avaliacao>/laudo.pdf")
@login_required
def laudo_pdf(id_avaliacao):
    """Gera o laudo da avaliação em PDF para download/impressão."""
    with get_cursor() as cur:
        cur.execute(
            """SELECT a.id_avaliacao, a.score_obtido, a.limiar_aplicado,
                      a.resultado, a.observacoes, a.data_avaliacao,
                      p.nome_completo AS paciente, p.idade, p.sexo_biologico,
                      pr.nome_completo AS profissional, pr.crm
               FROM avaliacoes a
               JOIN pacientes p ON p.id_paciente = a.id_paciente
               JOIN profissionais pr ON pr.id_profissional = a.id_profissional
               WHERE a.id_avaliacao = %s""",
            (id_avaliacao,),
        )
        av = cur.fetchone()
        if not av:
            return jsonify({"erro": "Avaliação não encontrada"}), 404

        cur.execute(
            """SELECT r.presente, r.peso_aplicado, s.nome
               FROM respostas_avaliacao r
               JOIN sintomas s ON s.id_sintoma = r.id_sintoma
               WHERE r.id_avaliacao = %s
               ORDER BY s.id_sintoma""",
            (id_avaliacao,),
        )
        respostas = cur.fetchall()

        cur.execute(
            "SELECT indicacao, resumo_diagnostico FROM laudos WHERE id_avaliacao = %s",
            (id_avaliacao,),
        )
        laudo = cur.fetchone() or {}

    try:
        pdf = _montar_laudo_pdf(av, respostas, laudo)
    except ImportError:
        return jsonify({"erro": "Biblioteca de PDF ausente. Rode: pip install fpdf2"}), 500

    pdf_bytes = bytes(pdf.output())
    nome = f"laudo_avaliacao_{id_avaliacao}.pdf"
    return Response(
        pdf_bytes,
        mimetype="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{nome}"'},
    )


@app.post("/api/avaliacoes")
@roles_required("medico")
def criar_avaliacao():
    """Cria uma avaliação clínica. RESTRITO ao nível 'medico'.

    O cálculo do score é feito SEMPRE no servidor a partir dos pesos
    cadastrados em `sintomas`, usando a coluna correspondente ao sexo
    biológico do paciente. O cliente nunca envia o score — apenas a lista
    de sintomas marcados como presentes.
    """
    uid = session["usuario"]["id_usuario"]
    dados = request.get_json(silent=True) or {}
    id_paciente = dados.get("id_paciente")
    presentes = dados.get("sintomas") or []  # lista de id_sintoma marcados
    observacoes = (dados.get("observacoes") or "").strip() or None

    # 1. O médico precisa ter perfil profissional (CRM) cadastrado
    with get_cursor() as cur:
        cur.execute(
            "SELECT id_profissional FROM profissionais WHERE id_usuario = %s", (uid,)
        )
        prof = cur.fetchone()
    if not prof:
        return (
            jsonify(
                {
                    "erro": "Complete seu perfil profissional (CRM) antes de avaliar.",
                    "perfil_incompleto": True,
                }
            ),
            400,
        )
    id_profissional = prof["id_profissional"]

    # 2. Paciente válido
    try:
        id_paciente = int(id_paciente)
    except (TypeError, ValueError):
        return jsonify({"erro": "Selecione um paciente"}), 400

    with get_cursor() as cur:
        cur.execute(
            "SELECT id_paciente, sexo_biologico FROM pacientes WHERE id_paciente = %s",
            (id_paciente,),
        )
        paciente = cur.fetchone()
    if not paciente:
        return jsonify({"erro": "Paciente não encontrado"}), 404

    sexo = paciente["sexo_biologico"]
    coluna_peso = "peso_masculino" if sexo == "M" else "peso_feminino"  # whitelist

    # 3. Sintomas ativos + limiar do sexo
    with get_cursor() as cur:
        cur.execute(
            f"""SELECT id_sintoma, {coluna_peso} AS peso
                FROM sintomas WHERE ativo = 1"""
        )
        sintomas = cur.fetchall()
        cur.execute("SELECT valor FROM limiares WHERE sexo_biologico = %s", (sexo,))
        lim = cur.fetchone()
    if not lim:
        return jsonify({"erro": "Limiar não configurado para este sexo"}), 500
    limiar = lim["valor"]

    presentes_set = {int(s) for s in presentes}
    score = 0
    score_maximo = 0
    respostas = []
    for s in sintomas:
        # Sintomas com peso 0 não se aplicam a este sexo
        # (ex.: macroorquidismo em pacientes do sexo feminino) → ignorados.
        if s["peso"] == 0:
            continue
        score_maximo += s["peso"]
        presente = 1 if s["id_sintoma"] in presentes_set else 0
        peso_aplicado = s["peso"] if presente else 0
        score += peso_aplicado
        respostas.append((s["id_sintoma"], presente, peso_aplicado))

    resultado = "encaminhar" if score >= limiar else "monitorar"

    # 4. Laudo (indicação clínica derivada do resultado)
    if resultado == "encaminhar":
        indicacao = "Encaminhar para teste genético (PCR/Southern blot)"
    else:
        indicacao = "Monitoramento clínico — reavaliar periodicamente"
    resumo = (
        f"Score {score} de {score_maximo} (limiar {limiar}, sexo {sexo}). "
        f"Resultado: {resultado}."
    )

    # 5. Persistência (avaliacao → respostas → laudo)
    with get_cursor(commit=True) as cur:
        cur.execute(
            """INSERT INTO avaliacoes
                   (id_paciente, id_profissional, score_obtido,
                    limiar_aplicado, resultado, observacoes)
               VALUES (%s, %s, %s, %s, %s, %s)""",
            (id_paciente, id_profissional, score, limiar, resultado, observacoes),
        )
        id_avaliacao = cur.lastrowid

        cur.executemany(
            """INSERT INTO respostas_avaliacao
                   (id_avaliacao, id_sintoma, presente, peso_aplicado)
               VALUES (%s, %s, %s, %s)""",
            [(id_avaliacao, sid, pres, peso) for (sid, pres, peso) in respostas],
        )

        cur.execute(
            """INSERT INTO laudos
                   (id_avaliacao, indicacao, resumo_diagnostico, gerado_por)
               VALUES (%s, %s, %s, %s)""",
            (id_avaliacao, indicacao, resumo, uid),
        )

    registrar_log(uid, "criar_avaliacao", "avaliacoes", id_avaliacao)
    return (
        jsonify(
            {
                "mensagem": "Avaliação registrada",
                "id_avaliacao": id_avaliacao,
                "score": score,
                "limiar": limiar,
                "resultado": resultado,
                "indicacao": indicacao,
            }
        ),
        201,
    )


# --------------------------- Dashboard -----------------------------------
@app.get("/api/dashboard")
@login_required
def dashboard():
    
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

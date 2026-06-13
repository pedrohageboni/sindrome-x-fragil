
from functools import wraps

from flask import session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash


# ----------------------------- Senhas ------------------------------------
def hash_senha(senha: str) -> str:
    return generate_password_hash(senha, method="pbkdf2:sha256")


def verificar_senha(senha: str, senha_hash: str) -> bool:
    return check_password_hash(senha_hash, senha)


# ---------------------------- Decorators ---------------------------------
def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if "usuario" not in session:
            return jsonify({"erro": "Não autenticado"}), 401
        return fn(*args, **kwargs)

    return wrapper


def roles_required(*niveis):
    """Restringe a rota aos níveis informados (ex.: roles_required('admin'))."""

    def decorator(fn):
        @wraps(fn)
        @login_required
        def wrapper(*args, **kwargs):
            if session["usuario"]["nivel"] not in niveis:
                return jsonify({"erro": "Permissão insuficiente"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator

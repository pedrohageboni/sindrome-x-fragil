
from contextlib import contextmanager
import mysql.connector
from config import Config


def get_connection():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
    )


@contextmanager
def get_cursor(commit=False, dictionary=True):
    """Abre conexão + cursor e garante fechamento.

    Uso:
        with get_cursor(commit=True) as cur:
            cur.execute("INSERT ...")
    """
    conn = get_connection()
    cur = conn.cursor(dictionary=dictionary)
    try:
        yield cur
        if commit:
            conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

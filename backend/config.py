import os


class Config:
    # Banco de dados MySQL
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "3306"))
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_NAME = os.getenv("DB_NAME", "sxf_triagem")

    # Chave usada para assinar o cookie de sessão do Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "troque-esta-chave-em-producao")

    # Origem do frontend Vite (para liberar o CORS)
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const isAdmin = usuario?.nivel === "admin";

  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    nivel: "recepcao",
  });
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  function update(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function handleSubmit() {
    setErro("");
    setOk("");
    setEnviando(true);
    try {
      // Se um admin estiver logado, a sessão permite definir o nível.
      const res = await api.registrar(form);
      if (res.bootstrap_admin) {
        setOk(
          "Conta de administrador criada (primeiro usuário do sistema). Faça login."
        );
      } else {
        setOk("Usuário cadastrado com sucesso.");
      }
      setForm({ nome: "", email: "", senha: "", nivel: "recepcao" });
      if (!isAdmin) {
        setTimeout(() => navigate("/login"), 1200);
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>{isAdmin ? "Cadastrar usuário" : "Criar conta"}</h1>
        <p className="sub">
          {isAdmin
            ? "Defina os dados e o nível de acesso do novo usuário."
            : "O primeiro usuário do sistema será o administrador."}
        </p>

        {erro && <div className="alert alert-error">{erro}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <div className="field">
          <label>Nome completo</label>
          <input
            value={form.nome}
            onChange={(e) => update("nome", e.target.value)}
            placeholder="Nome do profissional"
          />
        </div>

        <div className="field">
          <label>E-mail</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="seu@email.com"
          />
        </div>

        <div className="field">
          <label>Senha (mín. 6 caracteres)</label>
          <input
            type="password"
            value={form.senha}
            onChange={(e) => update("senha", e.target.value)}
            placeholder="••••••"
          />
        </div>

        {/* O seletor de nível só faz efeito real quando um admin cadastra.
            Para o primeiro usuário, o backend força 'admin'. */}
        <div className="field">
          <label>Nível de acesso</label>
          <select
            value={form.nivel}
            onChange={(e) => update("nivel", e.target.value)}
            disabled={!isAdmin}
          >
            <option value="recepcao">Recepção</option>
            <option value="medico">Médico</option>
            <option value="admin">Administrador</option>
          </select>
          {!isAdmin && (
            <span className="muted" style={{ fontSize: 12 }}>
              Apenas administradores definem o nível de outros usuários.
            </span>
          )}
        </div>

        <button className="btn" onClick={handleSubmit} disabled={enviando}>
          {enviando ? "Salvando..." : isAdmin ? "Cadastrar" : "Criar conta"}
        </button>

        <p className="switch">
          {isAdmin ? (
            <Link to="/dashboard">← Voltar ao dashboard</Link>
          ) : (
            <>
              Já tem conta? <Link to="/login">Entrar</Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

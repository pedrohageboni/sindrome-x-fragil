import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, carregando } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  async function handleSubmit() {
    setErro("");
    try {
      await login(email, senha);
      navigate("/dashboard");
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1>SXF Triagem</h1>
        <p className="sub">Acesse com suas credenciais</p>

        {erro && <div className="alert alert-error">{erro}</div>}

        <div className="field">
          <label>E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <div className="field">
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        <button className="btn" onClick={handleSubmit} disabled={carregando}>
          {carregando ? "Entrando..." : "Entrar"}
        </button>

        <p className="switch">
          Primeiro acesso? <Link to="/cadastro">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}

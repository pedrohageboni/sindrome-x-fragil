import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const LABEL_NIVEL = { admin: "Administrador", medico: "Médico", recepcao: "Recepção" };

export default function Topbar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!usuario) return null;

  async function sair() {
    await logout();
    navigate("/login");
  }

  const link = (to, label) => (
    <Link
      to={to}
      className={`nav-link ${pathname.startsWith(to) ? "nav-link-active" : ""}`}
    >
      {label}
    </Link>
  );

  return (
    <div className="topbar">
      <div className="brand">
        SXF Triagem <small>Protocolo SXF·BR · v1.0.0</small>
      </div>

      <nav className="nav">
        {link("/dashboard", "Dashboard")}
        {link("/pacientes", "Pacientes")}
        {link("/avaliacoes", "Avaliações")}
        {usuario.nivel === "medico" && link("/perfil-profissional", "Meu perfil")}
      </nav>

      <div className="user">
        <span>{usuario.nome}</span>
        <span className={`badge badge-${usuario.nivel}`}>
          {LABEL_NIVEL[usuario.nivel]}
        </span>
        <button className="btn btn-sm btn-ghost" onClick={sair}>
          Sair
        </button>
      </div>
    </div>
  );
}

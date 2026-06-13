import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Topbar from "../components/Topbar.jsx";

export default function Dashboard() {
  const { usuario } = useAuth();
  const [metricas, setMetricas] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const isAdmin = usuario?.nivel === "admin";

  useEffect(() => {
    async function carregar() {
      try {
        const d = await api.dashboard();
        setMetricas(d.metricas);
        if (usuario.nivel === "admin") {
          const u = await api.listarUsuarios();
          setUsuarios(u.usuarios);
        }
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function alternarAtivo(u) {
    try {
      await api.atualizarUsuario(u.id_usuario, { ativo: !u.ativo });
      setUsuarios((lista) =>
        lista.map((x) =>
          x.id_usuario === u.id_usuario ? { ...x, ativo: u.ativo ? 0 : 1 } : x
        )
      );
    } catch (e) {
      setErro(e.message);
    }
  }

  async function mudarNivel(u, nivel) {
    try {
      await api.atualizarUsuario(u.id_usuario, { nivel });
      setUsuarios((lista) =>
        lista.map((x) => (x.id_usuario === u.id_usuario ? { ...x, nivel } : x))
      );
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <>
      <Topbar />

      <div className="container">
        <h2>Dashboard</h2>
        <p className="desc">Visão geral da triagem clínica · Síndrome do X Frágil</p>

        {erro && <div className="alert alert-error">{erro}</div>}
        {carregando && <div className="loading">Carregando...</div>}

        {!carregando && metricas && (
          <>
            <div className="grid">
              <Metric label="Pacientes" value={metricas.pacientes} />
              <Metric label="Avaliações" value={metricas.avaliacoes} />
              <Metric label="Encaminhamentos" value={metricas.encaminhamentos} />
              <Metric label="Monitoramento" value={metricas.monitoramento} />
              {isAdmin && (
                <Metric label="Usuários ativos" value={metricas.usuarios_ativos} />
              )}
            </div>

            {metricas.avaliacoes > 0 && (
              <div className="panel">
                <h3>Resultados das avaliações</h3>
                <BarRow
                  label="Encaminhar"
                  value={metricas.encaminhamentos}
                  total={metricas.avaliacoes}
                  color="var(--danger)"
                />
                <BarRow
                  label="Monitorar"
                  value={metricas.monitoramento}
                  total={metricas.avaliacoes}
                  color="var(--ok)"
                />
              </div>
            )}

            {/* Conteúdo condicional por nível */}
            {usuario.nivel === "recepcao" && (
              <div className="panel">
                <h3>Recepção</h3>
                <p className="muted">
                  Cadastro e consulta de pacientes. As avaliações clínicas são
                  feitas pelos profissionais médicos.
                </p>
                <Link to="/pacientes" className="btn btn-sm">
                  Gerenciar pacientes
                </Link>
              </div>
            )}

            {usuario.nivel === "medico" && (
              <div className="panel">
                <h3>Avaliação clínica</h3>
                <p className="muted">
                  Aplique o checklist clínico, calcule o score por sexo e gere o
                  laudo de encaminhamento.
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Link to="/avaliacoes/nova" className="btn btn-sm">
                    + Nova avaliação
                  </Link>
                  <Link to="/pacientes" className="btn btn-sm btn-ghost">
                    Pacientes
                  </Link>
                </div>
              </div>
            )}

            {isAdmin && (
              <div className="panel">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <h3 style={{ margin: 0 }}>Gestão de usuários</h3>
                  <Link to="/cadastro" className="btn btn-sm btn-ghost">
                    + Cadastrar usuário
                  </Link>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>E-mail</th>
                      <th>Nível</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => (
                      <tr key={u.id_usuario}>
                        <td>{u.nome}</td>
                        <td className="muted">{u.email}</td>
                        <td>
                          <select
                            value={u.nivel}
                            onChange={(e) => mudarNivel(u, e.target.value)}
                            disabled={u.id_usuario === usuario.id_usuario}
                          >
                            <option value="recepcao">Recepção</option>
                            <option value="medico">Médico</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </td>
                        <td>
                          {u.ativo ? (
                            <span className="badge badge-medico">Ativo</span>
                          ) : (
                            <span className="badge badge-recepcao">Inativo</span>
                          )}
                        </td>
                        <td>
                          {u.id_usuario !== usuario.id_usuario && (
                            <button
                              className="btn btn-sm btn-ghost"
                              onClick={() => alternarAtivo(u)}
                            >
                              {u.ativo ? "Desativar" : "Ativar"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function BarRow({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="chart-row">
      <div className="chart-label">{label}</div>
      <div className="chart-track">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="chart-value">
        {value} ({pct}%)
      </div>
    </div>
  );
}

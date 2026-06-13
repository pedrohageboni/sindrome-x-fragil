import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Topbar from "../components/Topbar.jsx";

const SEXO_LABEL = { M: "M", F: "F" };

function formatarData(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Avaliacoes() {
  const { usuario } = useAuth();
  const isMedico = usuario?.nivel === "medico";

  const [avaliacoes, setAvaliacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const d = await api.listarAvaliacoes();
        setAvaliacoes(d.avaliacoes);
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  return (
    <>
      <Topbar />
      <div className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2>Avaliações</h2>
            <p className="desc">Histórico de triagens realizadas.</p>
          </div>
          {isMedico && (
            <Link to="/avaliacoes/nova" className="btn btn-sm">
              + Nova avaliação
            </Link>
          )}
        </div>

        {erro && <div className="alert alert-error">{erro}</div>}

        <div className="panel">
          {carregando ? (
            <div className="loading">Carregando...</div>
          ) : avaliacoes.length === 0 ? (
            <p className="muted">Nenhuma avaliação registrada ainda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Sexo</th>
                  <th>Score</th>
                  <th>Resultado</th>
                  <th>Profissional</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {avaliacoes.map((a) => (
                  <tr key={a.id_avaliacao}>
                    <td>{a.paciente}</td>
                    <td>{SEXO_LABEL[a.sexo_biologico]}</td>
                    <td>
                      {Number(a.score_obtido).toFixed(2)} /{" "}
                      {Number(a.limiar_aplicado).toFixed(2)}
                      <span className="muted" style={{ fontSize: 11 }}>
                        {" "}
                        (limiar)
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${a.resultado}`}>
                        {a.resultado === "encaminhar" ? "Encaminhar" : "Monitorar"}
                      </span>
                    </td>
                    <td className="muted">{a.profissional}</td>
                    <td className="muted">{formatarData(a.data_avaliacao)}</td>
                    <td>
                      <Link
                        to={`/avaliacoes/${a.id_avaliacao}`}
                        className="btn btn-sm btn-ghost"
                      >
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

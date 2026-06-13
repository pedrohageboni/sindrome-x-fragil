import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import Topbar from "../components/Topbar.jsx";

const SEXO_LABEL = { M: "Masculino", F: "Feminino" };

function formatarData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function AvaliacaoDetalhe() {
  const { id } = useParams();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const d = await api.obterAvaliacao(id);
        setDados(d);
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, [id]);

  return (
    <>
      <Topbar />
      <div className="container">
        <Link to="/avaliacoes" className="nav-link" style={{ paddingLeft: 0 }}>
          ← Voltar
        </Link>

        {erro && <div className="alert alert-error">{erro}</div>}
        {carregando && <div className="loading">Carregando...</div>}

        {dados && (
          <>
            <h2>Laudo da avaliação #{dados.avaliacao.id_avaliacao}</h2>

            <div style={{ marginBottom: 16 }}>
              <a
                href={`/api/avaliacoes/${dados.avaliacao.id_avaliacao}/laudo.pdf`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
                style={{ display: "inline-block", width: "auto", textDecoration: "none" }}
              >
                Baixar laudo (PDF)
              </a>
            </div>

            <div className="panel">
              <h3>Paciente</h3>
              <p style={{ margin: "0 0 4px" }}>
                <strong>{dados.avaliacao.paciente}</strong> ·{" "}
                {dados.avaliacao.idade} anos ·{" "}
                {SEXO_LABEL[dados.avaliacao.sexo_biologico]}
              </p>
              <p className="muted" style={{ margin: 0 }}>
                Avaliado por {dados.avaliacao.profissional} (CRM{" "}
                {dados.avaliacao.crm}) em{" "}
                {formatarData(dados.avaliacao.data_avaliacao)}
              </p>
            </div>

            <div className="panel">
              <h3>Resultado</h3>
              <p style={{ margin: "0 0 8px", fontSize: 16 }}>
                Score <strong>{Number(dados.avaliacao.score_obtido).toFixed(2)}</strong>{" "}
                · limiar {Number(dados.avaliacao.limiar_aplicado).toFixed(2)} ·{" "}
                <span className={`badge badge-${dados.avaliacao.resultado}`}>
                  {dados.avaliacao.resultado === "encaminhar"
                    ? "Encaminhar"
                    : "Monitorar"}
                </span>
              </p>
              {dados.laudo && (
                <p className="muted" style={{ margin: 0 }}>
                  <strong>Indicação:</strong> {dados.laudo.indicacao}
                </p>
              )}
              {dados.avaliacao.observacoes && (
                <p style={{ marginTop: 12 }}>
                  <strong>Observações:</strong> {dados.avaliacao.observacoes}
                </p>
              )}
            </div>

            <div className="panel">
              <h3>Sintomas avaliados</h3>
              <table>
                <thead>
                  <tr>
                    <th>Sintoma</th>
                    <th>Presença</th>
                    <th>Peso aplicado</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.respostas.map((r, i) => (
                    <tr key={i}>
                      <td className={r.presente ? "resp-presente" : "resp-ausente"}>
                        {r.nome}
                      </td>
                      <td>
                        {r.presente ? (
                          <span className="badge badge-medico">Presente</span>
                        ) : (
                          <span className="muted">Ausente</span>
                        )}
                      </td>
                      <td>{Number(r.peso_aplicado).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { api } from "../api.js";
import Topbar from "../components/Topbar.jsx";

const CATEGORIA_LABEL = {
  cognitivo: "Sinais cognitivos e comportamentais",
  fisico: "Sinais físicos",
};
const SEXO_LABEL = { M: "Masculino", F: "Feminino" };

export default function NovaAvaliacao() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // perfil: undefined = carregando | null = sem CRM | objeto = ok
  const [perfil, setPerfil] = useState(undefined);
  const [pacientes, setPacientes] = useState([]);
  const [sintomas, setSintomas] = useState([]);
  const [limiares, setLimiares] = useState({});

  const [idPaciente, setIdPaciente] = useState(params.get("paciente") || "");
  const [marcados, setMarcados] = useState({});
  const [observacoes, setObservacoes] = useState("");

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    async function carregar() {
      try {
        const p = await api.perfilProfissional();
        setPerfil(p.profissional);
        const [lp, ls, ll] = await Promise.all([
          api.listarPacientes(),
          api.sintomas(),
          api.limiares(),
        ]);
        setPacientes(lp.pacientes);
        setSintomas(ls.sintomas);
        setLimiares(ll.limiares);
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const paciente = useMemo(
    () => pacientes.find((p) => String(p.id_paciente) === String(idPaciente)),
    [pacientes, idPaciente]
  );
  const sexo = paciente?.sexo_biologico;

  // Sintomas aplicáveis ao sexo do paciente (peso > 0), com o peso já resolvido.
  const aplicaveis = useMemo(() => {
    if (!sexo) return [];
    return sintomas
      .map((s) => ({
        ...s,
        peso: sexo === "M" ? s.peso_masculino : s.peso_feminino,
      }))
      .filter((s) => s.peso > 0);
  }, [sintomas, sexo]);

  const porCategoria = useMemo(() => {
    const grupos = {};
    for (const s of aplicaveis) {
      (grupos[s.categoria] = grupos[s.categoria] || []).push(s);
    }
    return grupos;
  }, [aplicaveis]);

  const limiar = sexo ? limiares[sexo]?.valor ?? null : null;
  const scoreMax = useMemo(
    () => aplicaveis.reduce((acc, s) => acc + s.peso, 0),
    [aplicaveis]
  );
  const score = useMemo(
    () => aplicaveis.reduce((acc, s) => acc + (marcados[s.id_sintoma] ? s.peso : 0), 0),
    [aplicaveis, marcados]
  );
  const resultadoPrevisto =
    limiar != null ? (score >= limiar ? "encaminhar" : "monitorar") : null;
  const pct = scoreMax > 0 ? Math.round((score / scoreMax) * 100) : 0;

  function selecionarPaciente(valor) {
    setIdPaciente(valor);
    setMarcados({}); // reinicia o checklist ao trocar de paciente
    setResultado(null);
  }

  function alternar(id) {
    setMarcados((m) => ({ ...m, [id]: !m[id] }));
  }

  async function enviar() {
    setErro("");
    if (!idPaciente) {
      setErro("Selecione um paciente.");
      return;
    }
    setEnviando(true);
    try {
      const r = await api.criarAvaliacao({
        id_paciente: Number(idPaciente),
        sintomas: aplicaveis
          .filter((s) => marcados[s.id_sintoma])
          .map((s) => s.id_sintoma),
        observacoes,
      });
      setResultado(r);
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  // ---- Estados de carregamento / perfil ----
  if (carregando) {
    return (
      <>
        <Topbar />
        <div className="container">
          <div className="loading">Carregando...</div>
        </div>
      </>
    );
  }

  if (perfil === null) {
    return (
      <>
        <Topbar />
        <div className="container">
          <h2>Nova avaliação</h2>
          <div className="alert alert-error">
            Você precisa preencher seu perfil profissional (CRM) antes de criar
            avaliações.
          </div>
          <Link to="/perfil-profissional" className="btn btn-sm">
            Preencher perfil agora
          </Link>
        </div>
      </>
    );
  }

  // ---- Tela de resultado (após salvar) ----
  if (resultado) {
    return (
      <>
        <Topbar />
        <div className="container">
          <h2>Avaliação registrada</h2>
          <div className="panel" style={{ maxWidth: 520 }}>
            <div className="score-box" style={{ position: "static" }}>
              <div>
                <span className="score-num">{Number(resultado.score).toFixed(2)}</span>{" "}
                <span className="score-den">/ {scoreMax.toFixed(2)} pontos</span>
              </div>
              <p className="muted" style={{ margin: "8px 0 0" }}>
                Limiar aplicado: {Number(resultado.limiar).toFixed(2)}
              </p>
              <p style={{ margin: "12px 0 0" }}>
                Resultado:{" "}
                <span className={`badge badge-${resultado.resultado}`}>
                  {resultado.resultado === "encaminhar"
                    ? "Encaminhar"
                    : "Monitorar"}
                </span>
              </p>
              <p className="muted" style={{ marginTop: 8 }}>{resultado.indicacao}</p>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <Link
                to={`/avaliacoes/${resultado.id_avaliacao}`}
                className="btn btn-sm"
              >
                Ver laudo
              </Link>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  setResultado(null);
                  setMarcados({});
                  setObservacoes("");
                }}
              >
                Nova avaliação
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---- Formulário ----
  return (
    <>
      <Topbar />
      <div className="container">
        <h2>Nova avaliação</h2>
        <p className="desc">
          Checklist pontuado da Síndrome do X Frágil. Os pesos variam conforme o
          sexo biológico do paciente; o score é calculado e validado no servidor.
        </p>

        {erro && <div className="alert alert-error">{erro}</div>}

        <div className="panel">
          <div className="field" style={{ maxWidth: 420 }}>
            <label>Paciente</label>
            <select
              value={idPaciente}
              onChange={(e) => selecionarPaciente(e.target.value)}
            >
              <option value="">Selecione...</option>
              {pacientes.map((p) => (
                <option key={p.id_paciente} value={p.id_paciente}>
                  {p.nome_completo} · {p.idade} anos · {SEXO_LABEL[p.sexo_biologico]}
                </option>
              ))}
            </select>
          </div>
          {pacientes.length === 0 && (
            <p className="muted">
              Nenhum paciente cadastrado.{" "}
              <Link to="/pacientes">Cadastre um paciente primeiro.</Link>
            </p>
          )}
        </div>

        {paciente && (
          <div className="aval-grid">
            <div className="panel">
              <h3>Checklist — {SEXO_LABEL[sexo]}</h3>
              {Object.entries(porCategoria).map(([cat, itens]) => (
                <div key={cat}>
                  <div className="cat-title">
                    {CATEGORIA_LABEL[cat] || cat}
                  </div>
                  <div className="checklist">
                    {itens.map((s) => {
                      const on = !!marcados[s.id_sintoma];
                      return (
                        <label
                          key={s.id_sintoma}
                          className={`check-item ${on ? "on" : ""}`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => alternar(s.id_sintoma)}
                          />
                          <span>{s.nome}</span>
                          <span className="peso">+{Number(s.peso).toFixed(2)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="field" style={{ marginTop: 20 }}>
                <label>Observações (opcional)</label>
                <textarea
                  rows="3"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Histórico familiar, achados adicionais, etc."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    fontFamily: "inherit",
                    fontSize: 14,
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <div className="score-box">
              <div className="label" style={{ fontSize: 12, color: "var(--muted)" }}>
                Score atual
              </div>
              <div>
                <span className="score-num">{score.toFixed(2)}</span>{" "}
                <span className="score-den">/ {scoreMax.toFixed(2)}</span>
              </div>
              <div className="score-bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <p className="muted" style={{ margin: "0 0 12px" }}>
                Limiar ({SEXO_LABEL[sexo]}): <strong>{Number(limiar).toFixed(2)}</strong>
              </p>
              <p style={{ margin: "0 0 16px" }}>
                Prévia:{" "}
                <span className={`badge badge-${resultadoPrevisto}`}>
                  {resultadoPrevisto === "encaminhar" ? "Encaminhar" : "Monitorar"}
                </span>
              </p>
              <button
                className="btn"
                onClick={enviar}
                disabled={enviando}
              >
                {enviando ? "Salvando..." : "Registrar avaliação"}
              </button>
              <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>
                A prévia é informativa. O cálculo oficial é refeito no servidor.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

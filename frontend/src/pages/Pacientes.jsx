import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Topbar from "../components/Topbar.jsx";

const SEXO_LABEL = { M: "Masculino", F: "Feminino" };

export default function Pacientes() {
  const { usuario } = useAuth();
  const isMedico = usuario?.nivel === "medico";

  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  const vazio = { nome_completo: "", idade: "", sexo_biologico: "M", responsavel: "" };
  const [form, setForm] = useState(vazio);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    try {
      const d = await api.listarPacientes();
      setPacientes(d.pacientes);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function update(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function cadastrar() {
    setErro("");
    setOk("");
    setEnviando(true);
    try {
      await api.criarPaciente({ ...form, idade: Number(form.idade) });
      setOk("Paciente cadastrado.");
      setForm(vazio);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <Topbar />
      <div className="container">
        <h2>Pacientes</h2>
        <p className="desc">Cadastro e consulta de pacientes da triagem.</p>

        {erro && <div className="alert alert-error">{erro}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        <div className="panel">
          <h3>Novo paciente</h3>
          <div className="grid" style={{ marginBottom: 12 }}>
            <div className="field" style={{ margin: 0 }}>
              <label>Nome completo</label>
              <input
                value={form.nome_completo}
                onChange={(e) => update("nome_completo", e.target.value)}
                placeholder="Nome do paciente"
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Idade</label>
              <input
                type="number"
                min="0"
                max="120"
                value={form.idade}
                onChange={(e) => update("idade", e.target.value)}
                placeholder="Ex.: 8"
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Sexo biológico</label>
              <select
                value={form.sexo_biologico}
                onChange={(e) => update("sexo_biologico", e.target.value)}
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Responsável (opcional)</label>
              <input
                value={form.responsavel}
                onChange={(e) => update("responsavel", e.target.value)}
                placeholder="Nome do responsável"
              />
            </div>
          </div>
          <button className="btn btn-sm" onClick={cadastrar} disabled={enviando}>
            {enviando ? "Salvando..." : "Cadastrar paciente"}
          </button>
        </div>

        <div className="panel">
          <h3>Lista de pacientes</h3>
          {carregando ? (
            <div className="loading">Carregando...</div>
          ) : pacientes.length === 0 ? (
            <p className="muted">Nenhum paciente cadastrado ainda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Idade</th>
                  <th>Sexo</th>
                  <th>Responsável</th>
                  <th>Avaliações</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pacientes.map((p) => (
                  <tr key={p.id_paciente}>
                    <td>{p.nome_completo}</td>
                    <td>{p.idade}</td>
                    <td>{SEXO_LABEL[p.sexo_biologico]}</td>
                    <td className="muted">{p.responsavel || "—"}</td>
                    <td>{p.total_avaliacoes}</td>
                    <td>
                      {isMedico && (
                        <Link
                          to={`/avaliacoes/nova?paciente=${p.id_paciente}`}
                          className="btn btn-sm btn-ghost"
                        >
                          Avaliar
                        </Link>
                      )}
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

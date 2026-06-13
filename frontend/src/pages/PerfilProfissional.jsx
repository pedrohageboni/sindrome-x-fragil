import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import Topbar from "../components/Topbar.jsx";

export default function PerfilProfissional() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nome_completo: usuario?.nome || "",
    crm: "",
    especialidade: "",
  });
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function carregar() {
      try {
        const d = await api.perfilProfissional();
        if (d.profissional) {
          setForm({
            nome_completo: d.profissional.nome_completo || usuario?.nome || "",
            crm: d.profissional.crm || "",
            especialidade: d.profissional.especialidade || "",
          });
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

  function update(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function salvar() {
    setErro("");
    setOk("");
    setEnviando(true);
    try {
      await api.salvarPerfilProfissional(form);
      setOk("Perfil salvo. Você já pode criar avaliações.");
      setTimeout(() => navigate("/avaliacoes/nova"), 900);
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
        <h2>Meu perfil profissional</h2>
        <p className="desc">
          O CRM identifica você como responsável pelas avaliações e laudos.
          É necessário preenchê-lo uma vez antes de avaliar pacientes.
        </p>

        {erro && <div className="alert alert-error">{erro}</div>}
        {ok && <div className="alert alert-ok">{ok}</div>}

        {carregando ? (
          <div className="loading">Carregando...</div>
        ) : (
          <div className="panel" style={{ maxWidth: 480 }}>
            <div className="field">
              <label>Nome completo</label>
              <input
                value={form.nome_completo}
                onChange={(e) => update("nome_completo", e.target.value)}
              />
            </div>
            <div className="field">
              <label>CRM</label>
              <input
                value={form.crm}
                onChange={(e) => update("crm", e.target.value)}
                placeholder="Ex.: 123456/PR"
              />
            </div>
            <div className="field">
              <label>Especialidade (opcional)</label>
              <input
                value={form.especialidade}
                onChange={(e) => update("especialidade", e.target.value)}
                placeholder="Ex.: Genética médica"
              />
            </div>
            <button className="btn" onClick={salvar} disabled={enviando}>
              {enviando ? "Salvando..." : "Salvar perfil"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

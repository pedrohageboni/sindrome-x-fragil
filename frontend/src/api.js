// Cliente HTTP simples para falar com a API Flask.
// A autenticação usa o cookie de sessão do Flask — por isso enviamos
// "credentials: include" em toda requisição. Em dev o Vite faz proxy de
// /api -> http://localhost:5000.

const BASE = "/api";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data.erro || `Erro ${res.status}`);
    err.payload = data; // ex.: { perfil_incompleto: true }
    throw err;
  }
  return data;
}

export const api = {
  // --- Autenticação ---
  login: (email, senha) =>
    request("/auth/login", { method: "POST", body: { email, senha } }),

  registrar: (payload) =>
    request("/auth/registrar", { method: "POST", body: payload }),

  logout: () => request("/auth/logout", { method: "POST" }),

  me: () => request("/auth/me"),

  // --- Dashboard / usuários ---
  dashboard: () => request("/dashboard"),

  listarUsuarios: () => request("/usuarios"),

  atualizarUsuario: (id, payload) =>
    request(`/usuarios/${id}`, { method: "PATCH", body: payload }),

  // --- Catálogo clínico ---
  sintomas: () => request("/sintomas"),
  limiares: () => request("/limiares"),

  // --- Pacientes ---
  listarPacientes: () => request("/pacientes"),
  criarPaciente: (payload) =>
    request("/pacientes", { method: "POST", body: payload }),
  obterPaciente: (id) => request(`/pacientes/${id}`),

  // --- Perfil profissional (médico) ---
  perfilProfissional: () => request("/profissionais/me"),
  salvarPerfilProfissional: (payload) =>
    request("/profissionais/me", { method: "POST", body: payload }),

  // --- Avaliações ---
  listarAvaliacoes: () => request("/avaliacoes"),
  obterAvaliacao: (id) => request(`/avaliacoes/${id}`),
  criarAvaliacao: (payload) =>
    request("/avaliacoes", { method: "POST", body: payload }),
};

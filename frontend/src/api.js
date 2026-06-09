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
    throw new Error(data.erro || `Erro ${res.status}`);
  }
  return data;
}

export const api = {
  login: (email, senha) =>
    request("/auth/login", { method: "POST", body: { email, senha } }),

  registrar: (payload) =>
    request("/auth/registrar", { method: "POST", body: payload }),

  logout: () => request("/auth/logout", { method: "POST" }),

  me: () => request("/auth/me"),

  dashboard: () => request("/dashboard"),

  listarUsuarios: () => request("/usuarios"),

  atualizarUsuario: (id, payload) =>
    request(`/usuarios/${id}`, { method: "PATCH", body: payload }),
};

import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Cache do usuário só para evitar "piscar" a tela ao recarregar.
  // A fonte de verdade é o cookie de sessão do Flask.
  const [usuario, setUsuario] = useState(() => {
    const raw = sessionStorage.getItem("sxf_usuario");
    return raw ? JSON.parse(raw) : null;
  });
  const [carregando, setCarregando] = useState(false);

  // Ao iniciar, confirma com o backend se a sessão ainda é válida.
  useEffect(() => {
    api
      .me()
      .then((d) => {
        setUsuario(d.usuario);
        sessionStorage.setItem("sxf_usuario", JSON.stringify(d.usuario));
      })
      .catch(() => {
        setUsuario(null);
        sessionStorage.removeItem("sxf_usuario");
      });
  }, []);

  async function login(email, senha) {
    setCarregando(true);
    try {
      const data = await api.login(email, senha);
      setUsuario(data.usuario);
      sessionStorage.setItem("sxf_usuario", JSON.stringify(data.usuario));
      return data.usuario;
    } finally {
      setCarregando(false);
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // ignora erro de rede no logout
    }
    setUsuario(null);
    sessionStorage.removeItem("sxf_usuario");
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, carregando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

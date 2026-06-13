import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Pacientes from "./pages/Pacientes.jsx";
import Avaliacoes from "./pages/Avaliacoes.jsx";
import AvaliacaoDetalhe from "./pages/AvaliacaoDetalhe.jsx";
import NovaAvaliacao from "./pages/NovaAvaliacao.jsx";
import PerfilProfissional from "./pages/PerfilProfissional.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pacientes"
        element={
          <ProtectedRoute>
            <Pacientes />
          </ProtectedRoute>
        }
      />

      {/* "nova" precisa vir antes de ":id"; o react-router prioriza segmentos
          estáticos, mas mantemos a ordem por clareza. Restrito a médico. */}
      <Route
        path="/avaliacoes/nova"
        element={
          <ProtectedRoute roles={["medico"]}>
            <NovaAvaliacao />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes/:id"
        element={
          <ProtectedRoute>
            <AvaliacaoDetalhe />
          </ProtectedRoute>
        }
      />
      <Route
        path="/avaliacoes"
        element={
          <ProtectedRoute>
            <Avaliacoes />
          </ProtectedRoute>
        }
      />

      <Route
        path="/perfil-profissional"
        element={
          <ProtectedRoute roles={["medico"]}>
            <PerfilProfissional />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

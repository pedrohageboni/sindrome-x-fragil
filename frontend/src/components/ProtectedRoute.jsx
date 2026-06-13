import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";


export default function ProtectedRoute({ children, roles }) {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(usuario.nivel)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

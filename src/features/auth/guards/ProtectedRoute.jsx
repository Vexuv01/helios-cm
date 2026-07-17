import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, isAuthenticated, profile, user, signOut } = useAuth();

  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  if (loading) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="eyebrow">HELIOS CM Enterprise</p>
          <h1>Loading...</h1>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <>
      <div className="global-user-menu">
        <div>
          <strong>{profile?.full_name || user?.email}</strong>
          <span>{profile?.role || "USER"}</span>
        </div>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      {children}
    </>
  );
}

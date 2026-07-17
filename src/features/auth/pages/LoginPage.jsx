import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/auth-context";

export default function LoginPage() {
  const { signIn, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = location.state?.from?.pathname || "/";

  if (!loading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: loginError } = await signIn(email.trim(), password);

    if (loginError) {
      setError(loginError.message || "Unable to sign in");
      setSubmitting(false);
      return;
    }

    navigate(redirectTo, { replace: true });
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div>
          <p className="eyebrow">HELIOS CM Enterprise</p>
          <h1>Accedi</h1>
          <p className="muted">
            Entra nella piattaforma Construction Management.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={submitting}>
            {submitting ? "Accesso in corso..." : "Accedi"}
          </button>
        </form>
      </section>
    </main>
  );
}

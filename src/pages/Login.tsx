import { useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function friendlyAuthError(err: any): string {
  const code = String(err?.code ?? "");
  if (code === "auth/invalid-credential") return "Incorrect email or password.";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
  if (code === "auth/network-request-failed") return "Network error. Please try again.";
  return err?.message ?? "Login failed.";
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loadingAuth, loadingProfile, profileReady } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const disabled = useMemo(() => {
    return submitting || email.trim().length < 3 || password.length < 6;
  }, [submitting, email, password]);

  // Redirect once profile is ready
  useEffect(() => {
    if (!user) return;
    if (loadingAuth || loadingProfile || !profileReady) return;
    if (!profile) return;

    // If user was redirected to login from a protected route, go back there
    const from = (location.state as any)?.from?.pathname as string | undefined;
    if (from && from !== "/login" && from !== "/register") {
      navigate(from, { replace: true });
      return;
    }

    if (profile.role === "admin") navigate("/admin", { replace: true });
    else if (profile.role === "organizer") navigate("/organizer", { replace: true });
    else navigate("/student", { replace: true });
  }, [user, profile, loadingAuth, loadingProfile, profileReady, navigate, location.state]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // Do NOT navigate here; let the useEffect redirect after profile loads
    } catch (err: any) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          {/* Header card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="cardBody">
              <div className="row">
                <span className="badge badgePrimary">Campus CEMS</span>
                <span className="badge">Secure Login</span>
              </div>

              <h1 className="h1" style={{ marginTop: 12 }}>
                Welcome back
              </h1>
              <p className="p">Sign in to continue.</p>
            </div>
          </div>

          {/* Form card */}
          <div className="card">
            <div className="cardBody">
              {error ? (
                <div className="notice noticeError">{error}</div>
              ) : (
                <div className="notice">Enter your email and password to access your dashboard.</div>
              )}

              <form onSubmit={onSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="you@email.com"
                    autoComplete="email"
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="label" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <div className="helper">Minimum 6 characters.</div>
                </div>

                <button className="btn btnPrimary btnWide" disabled={disabled} type="submit">
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="hr" />

              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="small">No account?</span>
                <Link to="/register" className="badge badgeInfo">
                  Register
                </Link>
              </div>

              {(loadingAuth || loadingProfile || (user && !profileReady)) && (
                <div className="small" style={{ marginTop: 12, textAlign: "center" }}>
                  Loading your profile…
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}





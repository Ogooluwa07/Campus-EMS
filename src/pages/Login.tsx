import { useEffect, useMemo, useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
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

  // Forgot password states
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState("");
  const [resetError, setResetError] = useState("");

  const disabled = useMemo(() => {
    return submitting || email.trim().length < 3 || password.length < 6;
  }, [submitting, email, password]);

  useEffect(() => {
    if (!user) return;
    if (loadingAuth || loadingProfile || !profileReady) return;
    if (!profile) return;

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
    } catch (err: any) {
      setError(friendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");
    setResetMsg("");

    const clean = resetEmail.trim();
    if (!clean) {
      setResetError("Please enter your email address.");
      return;
    }

    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, clean);
      setResetMsg("Reset email sent! Check your inbox (and spam folder).");
    } catch (err: any) {
      const code = String(err?.code ?? "");
      if (code === "auth/user-not-found") setResetError("No account found with that email.");
      else if (code === "auth/invalid-email") setResetError("Please enter a valid email address.");
      else setResetError(err?.message ?? "Failed to send reset email.");
    } finally {
      setResetLoading(false);
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
              <h1 className="h1" style={{ marginTop: 12 }}>Welcome back</h1>
              <p className="p">Sign in to continue.</p>
            </div>
          </div>

          {/* Login Form */}
          {!showReset ? (
            <div className="card">
              <div className="cardBody">
                {error ? (
                  <div className="notice noticeError">{error}</div>
                ) : (
                  <div className="notice">Enter your email and password to access your dashboard.</div>
                )}

                <form onSubmit={onSubmit}>
                  <div style={{ marginBottom: 12 }}>
                    <label className="label" htmlFor="email">Email</label>
                    <input
                      id="email"
                      className="input"
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                      placeholder="you@email.com"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>

                  <div style={{ marginBottom: 4 }}>
                    <label className="label" htmlFor="password">Password</label>
                    <input
                      id="password"
                      className="input"
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>

                  {/* Forgot password link */}
                  <div style={{ textAlign: "right", marginBottom: 12 }}>
                    <button
                      type="button"
                      className="small"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontWeight: 900, padding: 0 }}
                      onClick={() => { setShowReset(true); setResetEmail(email); }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button className="btn btnPrimary btnWide" disabled={disabled} type="submit">
                    {submitting ? "Signing in..." : "Sign in"}
                  </button>
                </form>

                <div className="hr" />

                <div className="row" style={{ justifyContent: "space-between" }}>
  <span className="small">No account?</span>
  <Link to="/register" className="badge badgeInfo">Register</Link>
</div>
<div style={{ textAlign: "center", marginTop: 12 }}>
  <Link to="/" style={{ color: "var(--muted)", fontSize: 13 }}>← Back to home</Link>
</div>

                {(loadingAuth || loadingProfile || (user && !profileReady)) && (
                  <div className="small" style={{ marginTop: 12, textAlign: "center" }}>
                    Loading your profile…
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* Forgot Password Form */
            <div className="card">
              <div className="cardBody">
                <h2 className="h2">Reset your password</h2>
                <p className="p" style={{ marginBottom: 16 }}>
                  Enter your account email and we'll send you a reset link.
                </p>

                {resetMsg ? (
                  <div className="notice noticeSuccess">{resetMsg}</div>
                ) : resetError ? (
                  <div className="notice noticeError">{resetError}</div>
                ) : (
                  <div className="notice">Check your spam folder if you don't see the email.</div>
                )}

                <form onSubmit={onResetPassword}>
                  <label className="label" htmlFor="resetEmail">Email</label>
                  <input
                    id="resetEmail"
                    className="input"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setResetError(""); setResetMsg(""); }}
                    placeholder="you@email.com"
                    autoComplete="email"
                    autoFocus
                    style={{ marginBottom: 16 }}
                  />
                  <button className="btn btnPrimary btnWide" type="submit" disabled={resetLoading || !!resetMsg}>
                    {resetLoading ? "Sending..." : resetMsg ? "Email sent ✓" : "Send reset email"}
                  </button>
                </form>

                <div className="hr" />

                <button
                  className="btn btnGhost btnWide"
                  type="button"
                  onClick={() => { setShowReset(false); setResetMsg(""); setResetError(""); }}
                >
                  ← Back to login
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}





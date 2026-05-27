import { useMemo, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";
import { useToast } from "../context/ToastContext";
import { useNavigate, Link } from "react-router-dom";

type Role = "student" | "organizer" | "admin";

const ROLES: { value: Role; label: string; icon: string; desc: string; color: string; bg: string }[] = [
  {
    value: "student",
    label: "Student",
    icon: "👨‍🎓",
    desc: "Browse and register for campus events.",
    color: "#10B981",
    bg: "rgba(16,185,129,0.08)",
  },
  {
    value: "organizer",
    label: "Organizer",
    icon: "🎤",
    desc: "Create and manage events, track attendance.",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.08)",
  },
  {
    value: "admin",
    label: "Admin",
    icon: "🛡",
    desc: "Approve events and manage all user roles.",
    color: "#EF4444",
    bg: "rgba(239,68,68,0.08)",
  },
];

function friendlyAuthError(err: any): string {
  const code = String(err?.code ?? "");
  if (code === "auth/email-already-in-use") return "That email is already in use. Try signing in instead.";
  if (code === "auth/invalid-email") return "Please enter a valid email address.";
  if (code === "auth/weak-password") return "Password is too weak. Use at least 6 characters.";
  if (code === "auth/network-request-failed") return "Network error. Please try again.";
  return err?.message ?? "Registration failed.";
}

export default function Register() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toast = useToast();
  const navigate = useNavigate();

  const disabled = useMemo(() => {
    return (
      loading ||
      fullName.trim().length < 2 ||
      email.trim().length < 5 ||
      password.length < 6
    );
  }, [loading, fullName, email, password]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setError("");
    setLoading(true);

    try {
      const emailClean = email.trim();
      const nameClean = fullName.trim();

      const userCredential = await createUserWithEmailAndPassword(auth, emailClean, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        fullName: nameClean,
        email: user.email ?? emailClean,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.push({
        type: "success",
        title: "Account created",
        message: `Welcome! Your ${role} account is ready.`,
      });

      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container">
        <div style={{ maxWidth: 520, margin: "0 auto" }}>

          {/* Header */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="cardBody">
              <div className="row">
                <span className="badge badgePrimary">Campus CEMS</span>
                <span className="badge">New Account</span>
              </div>
              <h1 className="h1" style={{ marginTop: 12 }}>Create an account</h1>
              <p className="p">Choose your role and fill in your details to get started.</p>
            </div>
          </div>

          <div className="card">
            <div className="cardBody">
              {error && <div className="notice noticeError" style={{ marginBottom: 16 }}>{error}</div>}

              <form onSubmit={handleRegister}>

                {/* Role Selection */}
                <label className="label" style={{ marginBottom: 10 }}>Select your role</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                  {ROLES.map(({ value, label, icon, desc, color, bg }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      style={{
                        padding: "14px 10px",
                        borderRadius: 14,
                        border: role === value
                          ? `2px solid ${color}`
                          : "2px solid var(--border)",
                        background: role === value ? bg : "var(--card)",
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s ease",
                        outline: "none",
                      }}
                    >
                      <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
                      <div style={{
                        fontWeight: 900, fontSize: 13,
                        color: role === value ? color : "var(--text)",
                      }}>
                        {label}
                      </div>
                      <div style={{
                        fontSize: 11, color: "var(--muted)",
                        marginTop: 4, lineHeight: 1.4,
                      }}>
                        {desc}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Selected role badge */}
                <div style={{ marginBottom: 18, textAlign: "center" }}>
                  <span className={
                    role === "admin" ? "badge badgeDanger" :
                    role === "organizer" ? "badge badgePrimary" :
                    "badge badgeSuccess"
                  }>
                    Registering as: {role.toUpperCase()}
                  </span>
                </div>

                <div className="hr" />

                {/* Full Name */}
                <label className="label">Full Name</label>
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  autoFocus
                  required
                  style={{ marginBottom: 4 }}
                />
                <div className="helper" style={{ marginBottom: 12 }}>
                  Use your real name — it appears on attendance lists.
                </div>

                {/* Email */}
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  style={{ marginBottom: 12 }}
                />

                {/* Password */}
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  required
                  style={{ marginBottom: 4 }}
                />
                <div className="helper" style={{ marginBottom: 20 }}>At least 6 characters.</div>

                <button
                  className="btn btnPrimary btnWide"
                  type="submit"
                  disabled={disabled}
                >
                  {loading ? "Creating account..." : `Create ${role} account`}
                </button>

                <div className="hr" />

                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="small">Already have an account?</span>
                  <Link to="/login" className="badge badgeInfo">Sign in</Link>
                </div>
                <div style={{ textAlign: "center", marginTop: 12 }}>
                  <Link to="/" style={{ color: "var(--muted)", fontSize: 13 }}>← Back to home</Link>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


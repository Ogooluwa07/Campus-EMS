import { useMemo, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import Navbar from "../components/Navbar";
import { useToast } from "../context/ToastContext";
import { useNavigate, Link } from "react-router-dom";

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
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      const emailClean = email.trim();
      const nameClean = fullName.trim();

      const userCredential = await createUserWithEmailAndPassword(auth, emailClean, password);
      const user = userCredential.user;

      // ✅ MUST be "student" (lowercase) to pass Firestore rules
      await setDoc(doc(db, "users", user.uid), {
        fullName: nameClean,
        email: user.email ?? emailClean,
        role: "student",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.push({
        type: "success",
        title: "Account created",
        message: "Registration successful. Please sign in.",
      });

      navigate("/login", { replace: true });
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Registration failed",
        message: friendlyAuthError(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ maxWidth: 520 }}>
        <div className="card">
          <div className="cardHeader">
            <h2 className="h2">Create an account</h2>
            <p className="p">
              Accounts start as <b>student</b>. An admin can later promote you to organizer/admin.
            </p>
          </div>

          <div className="cardBody">
            <form onSubmit={handleRegister}>
             <label className="label">Full Name</label>
<input
  className="input"
  value={fullName}
  onChange={(e) => setFullName(e.target.value)}
  placeholder="Your name"
  autoComplete="name"
  autoFocus
  required
/>
<div className="helper">Use your real name for attendance lists.</div>

              <div style={{ height: 12 }} />

           <label className="label">Email</label>
<input
  className="input"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="you@example.com"
  autoComplete="email"
  required
/>
              <div style={{ height: 12 }} />

             <label className="label">Password</label>
<input
  className="input"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="Minimum 6 characters"
  autoComplete="new-password"
  required
/>
              <div className="helper">At least 6 characters.</div>

              <div style={{ height: 16 }} />

              <button className="btn btnPrimary btnWide" type="submit" disabled={disabled}>
                {loading ? "Creating account..." : "Register"}
              </button>

              <div className="hr" />

              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="small">Already have an account?</span>
                <Link to="/login" className="badge badgeInfo">
                  Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}


import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import logo from "../assets/logo.svg";

function roleBadgeClass(role?: string) {
  if (role === "admin") return "badge badgeDanger";
  if (role === "organizer") return "badge badgePrimary";
  if (role === "student") return "badge badgeSuccess";
  return "badge";
}

function roleLabel(role?: string) {
  if (!role) return "user";
  return role.toUpperCase();
}

export default function Navbar() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut(auth);
    toast.push({ type: "info", title: "Logged out", message: "You have been signed out." });
  };

  const isActive = (path: string) => {
    const p = location.pathname;
    const active = p === path || p.startsWith(path + "/");
    return active ? "navLink navLinkActive" : "navLink";
  };

  const homeLink =
    !user || !profile ? "/login"
    : profile.role === "admin" ? "/admin"
    : profile.role === "organizer" ? "/organizer"
    : "/student";

  return (
    <div className="nav">
      <div className="navInner">
        <Link to={homeLink} className="brand" style={{ textDecoration: "none", gap: 10 }}>
          <img src={logo} alt="Campus CEMS Logo" style={{ width: 36, height: 36, borderRadius: 14, objectFit: "cover" }} />
          <span style={{ fontWeight: 900 }}>Campus CEMS</span>
        </Link>

        <div className={`navLinks ${menuOpen ? "navOpen" : ""}`}>
          {!user ? (
            <>
              <Link className={isActive("/login")} to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
              <Link className={isActive("/register")} to="/register" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          ) : (
            <>
              {profile?.role === "student" && (
                <>
                  <Link className={isActive("/student")} to="/student" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                  <Link className={isActive("/student/profile")} to="/student/profile" onClick={() => setMenuOpen(false)}>Profile</Link>
                </>
              )}
              {profile?.role === "organizer" && (
                <Link className={isActive("/organizer")} to="/organizer" onClick={() => setMenuOpen(false)}>Organizer</Link>
              )}
              {profile?.role === "admin" && (
                <Link className={isActive("/admin")} to="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>
              )}
            </>
          )}
        </div>

        <div className="spacer" />

        <button
          className="themeToggle"
          onClick={() => setDarkMode((d) => !d)}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle dark mode"
        >
          {darkMode ? "☀️" : "🌙"}
        </button>

        {!user ? (
          <div className="navRight row" style={{ gap: 10 }}>
            <Link className="btn btnGhost" to="/login">Login</Link>
            <Link className="btn btnPrimary" to="/register">Register</Link>
          </div>
        ) : (
          <div className="navRight row" style={{ gap: 14, alignItems: "center" }}>
            <span className={roleBadgeClass(profile?.role)}>{roleLabel(profile?.role)}</span>
            <span style={{ color: "var(--muted)", fontWeight: 900, fontSize: 13 }}>{user.email}</span>
            <button className="btn btnGhost" onClick={handleLogout}>Logout</button>
          </div>
        )}

        <button
          className={`navHamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
      </div>
    </div>
  );
}











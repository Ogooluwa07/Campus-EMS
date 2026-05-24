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
  return role.toUpperCase(); // display only
}

export default function Navbar() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    toast.push({
      type: "info",
      title: "Logged out",
      message: "You have been signed out.",
    });
  };

  // Active when the current path starts with the link path
  const isActive = (path: string) => {
    const p = location.pathname;
    const active = p === path || p.startsWith(path + "/");
    return active ? "navLink navLinkActive" : "navLink";
  };

  // Where the brand should take the user
  const homeLink =
    !user || !profile
      ? "/login"
      : profile.role === "admin"
      ? "/admin"
      : profile.role === "organizer"
      ? "/organizer"
      : "/student";

  return (
    <div className="nav">
      <div className="navInner">
        {/* Logo + Brand */}
        <Link to={homeLink} className="brand" style={{ textDecoration: "none", gap: 10 }}>
          <img
            src={logo}
            alt="Campus CEMS Logo"
            style={{
              width: 36,
              height: 36,
              borderRadius: 14,
              objectFit: "cover",
            }}
          />
          <span style={{ fontWeight: 900 }}>Campus CEMS</span>
        </Link>

        {/* Navigation Links (ONLY routes that exist right now) */}
        <div className="navLinks">
          {!user ? (
            <>
              <Link className={isActive("/login")} to="/login">
                Login
              </Link>
              <Link className={isActive("/register")} to="/register">
                Register
              </Link>
            </>
          ) : (
            <>
             {profile?.role === "student" && (
  <>
    <Link className={isActive("/student")} to="/student">
      Dashboard
    </Link>
    <Link className={isActive("/student/profile")} to="/student/profile">
      Profile
    </Link>
  </>
)}

              {profile?.role === "organizer" && (
                <Link className={isActive("/organizer")} to="/organizer">
                  Organizer
                </Link>
              )}

              {profile?.role === "admin" && (
                <Link className={isActive("/admin")} to="/admin">
                  Admin
                </Link>
              )}
            </>
          )}
        </div>

        <div className="spacer" />

        {/* Right Section */}
        {!user ? (
          <div className="row" style={{ gap: 10 }}>
            <Link className="btn btnGhost" to="/login">
              Login
            </Link>
            <Link className="btn btnPrimary" to="/register">
              Register
            </Link>
          </div>
        ) : (
          <div className="row" style={{ gap: 14, alignItems: "center" }}>
            <span className={roleBadgeClass(profile?.role)}>{roleLabel(profile?.role)}</span>

            <span
              style={{
                color: "var(--muted)",
                fontWeight: 900,
                fontSize: 13,
              }}
            >
              {user.email}
            </span>

            <button className="btn btnGhost" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}











import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const { user, profile } = useAuth();

  const home =
    !user || !profile
      ? "/login"
      : profile.role === "admin"
      ? "/admin"
      : profile.role === "organizer"
      ? "/organizer"
      : "/student";

  return (
    <>
      <Navbar />
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="card">
          <div className="cardBody" style={{ textAlign: "center" }}>
            <span className="badge badgeDanger">Access denied</span>

            <h1 className="h1" style={{ marginTop: 16 }}>
              Unauthorized
            </h1>

            <p className="p" style={{ marginTop: 8 }}>
              You don’t have permission to access this page.
              <br />
              If you believe this is a mistake, contact an administrator.
            </p>

            <div style={{ height: 20 }} />

            <div className="row" style={{ justifyContent: "center", gap: 12 }}>
              <Link to="/login" className="btn btnGhost">
                Back to login
              </Link>

              <Link to={home} className="btn btnPrimary">
                Go home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}



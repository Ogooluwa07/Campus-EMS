import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, Role } from "../context/AuthContext";
import Navbar from "../components/Navbar";

function homeForRole(role: Role) {
  if (role === "admin") return "/admin";
  if (role === "organizer") return "/organizer";
  return "/student";
}

export default function ProtectedRoute({ allow }: { allow: Role[] }) {
  const { user, profile, loadingAuth, loadingProfile, profileReady, refreshProfile } = useAuth();
  const location = useLocation();

  const allowList = Array.isArray(allow) ? allow : [];

  // 1) Wait until auth + profile have resolved
  if (loadingAuth || loadingProfile || !profileReady) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="card">
            <div className="cardBody">
              <span className="badge badgeWarn">Loading…</span>
              <h2 className="h2" style={{ marginTop: 12 }}>
                Checking access
              </h2>
              <p className="p">Please wait while we load your profile.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 2) Not logged in → go login, remember intended page
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // 3) Logged in but profile missing → show message + retry
  if (!profile) {
    return (
      <>
        <Navbar />
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="card">
            <div className="cardBody">
              <span className="badge badgeDanger">Profile missing</span>
              <h2 className="h2" style={{ marginTop: 12 }}>
                Profile not available
              </h2>
              <p className="p">
                Your account profile couldn’t be loaded. Confirm a document exists in{" "}
                <b>users/{user.uid}</b>.
              </p>

              <div style={{ height: 14 }} />

              <button className="btn btnSoft" onClick={refreshProfile}>
                Try again
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // 4) Role not allowed → send them to THEIR correct dashboard (no unauthorized loop)
  if (!allowList.includes(profile.role)) {
    return <Navigate to={homeForRole(profile.role)} replace />;
  }

  // 5) Allowed → render nested routes
  return <Outlet />;
}




import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import LandingPage from "./pages/LandingPage";
import ProtectedRoute from "./routes/ProtectRoute";
import StudentDashboard from "./pages/StudentDashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/Unauthorized";
import { useAuth } from "./context/AuthContext";

function RoleRedirect() {
  const { user, profile, loadingAuth, loadingProfile, profileReady } = useAuth();

  if (loadingAuth || loadingProfile || !profileReady) {
    return (
      <div className="container" style={{ maxWidth: 720, marginTop: 18 }}>
        <div className="card">
          <div className="cardBody">
            <span className="badge badgeWarn">Loading…</span>
            <h2 className="h2" style={{ marginTop: 12 }}>Preparing your dashboard</h2>
            <p className="p">Please wait while we load your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile) return <Navigate to="/login" replace />;
  if (profile.role === "admin") return <Navigate to="/admin" replace />;
  if (profile.role === "organizer") return <Navigate to="/organizer" replace />;
  return <Navigate to="/student" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Landing page */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Dashboard redirect for logged-in users */}
      <Route path="/dashboard" element={<RoleRedirect />} />

      {/* Student */}
      <Route element={<ProtectedRoute allow={["student"]} />}>
        <Route path="/student/*" element={<StudentDashboard />} />
      </Route>

      {/* Organizer */}
      <Route element={<ProtectedRoute allow={["organizer"]} />}>
        <Route path="/organizer/*" element={<OrganizerDashboard />} />
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute allow={["admin"]} />}>
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Route>

      {/* Unknown route goes back to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



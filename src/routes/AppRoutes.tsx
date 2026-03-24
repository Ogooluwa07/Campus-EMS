import { Routes, Route, Navigate } from "react-router-dom";
import Events from "../pages/Events";
import Login from "../pages/Login";
import Register from "../pages/Register";
import OrganizerDashboard from "../pages/OrganizerDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import EventDetails from "../pages/EventDetails";
import MyRegistrations from "../pages/MyRegistrations";
import CalendarPage from "../pages/CalenderPage"; 

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Events />} />
      <Route path="/events/:id" element={<EventDetails />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/organizer" element={<OrganizerDashboard />} />
      <Route path="/admin" element={<AdminDashboard />} />

      <Route path="/my-registrations" element={<MyRegistrations />} />

      <Route path="/calendar" element={<CalendarPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}



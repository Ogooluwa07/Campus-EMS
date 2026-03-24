import { useEffect, useState } from "react";
import {
  collectionGroup,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import Navbar from "../components/Navbar";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import EmptyState from "../components/EmptyState";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/format";
import { Link } from "react-router-dom";

type MyReg = {
  eventId: string;
  userId: string;
  status: string;
  createdAt: any;
  checkedInAt: any;
};

export default function StudentRegistrations() {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [regs, setRegs] = useState<MyReg[]>([]);
  const [loading, setLoading] = useState(true);

  const canUse = !!user && profile?.role === "student";

  const load = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const q1 = query(
        collectionGroup(db, "registrations"),
        where("userId", "==", user.uid)
      );
      const snap = await getDocs(q1);
      const list = snap.docs.map((d) => d.data() as MyReg);
      setRegs(list);
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Failed to load registrations",
        message: err?.message ?? String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canUse) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse]);

  if (!canUse) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState
            title="Access denied"
            message="Only students can view registrations."
            action={<Link to="/login" className="btn btnSoft">Back to login</Link>}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardBody">
            <div className="row">
              <span className="badge badgePrimary">Student</span>
              <span className="badge">Registrations</span>
              <div className="spacer" />
              <button className="btn btnSoft" onClick={load}>Refresh</button>
            </div>

            <h1 className="h1" style={{ marginTop: 12 }}>
              My Registrations
            </h1>
            <p className="p">Your registered events and attendance status.</p>
          </div>
        </div>

        {loading ? (
          <div className="notice">Loading registrations…</div>
        ) : regs.length === 0 ? (
          <EmptyState
            title="No registrations yet"
            message="Go to Events and register for one."
            action={<Link to="/student/events" className="btn btnPrimary">Browse events</Link>}
          />
        ) : (
          regs.map((r) => (
            <div key={r.eventId} className="listItem">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div style={{ fontWeight: 1000, color: "var(--primary)" }}>
                  Event ID: {r.eventId}
                </div>
                <span className={r.checkedInAt ? "badge badgeSuccess" : "badge badgeWarn"}>
                  {r.checkedInAt ? "ATTENDED" : "NOT ATTENDED"}
                </span>
              </div>

              <div className="small" style={{ marginTop: 8 }}>
                Status: {r.status || "—"} • Registered: {r.createdAt ? formatDateTime(r.createdAt) : "—"}
              </div>

              <div className="small" style={{ marginTop: 6 }}>
                Checked-in: {r.checkedInAt ? formatDateTime(r.checkedInAt) : "Not yet"}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

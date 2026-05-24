import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import SkeletonEventCard from "../components/SkeletonEventCard";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { categoryGradient, categoryEmoji } from "../utils/categoryColors";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { formatDateTime } from "../utils/format";
import type { Event } from "../types/event";

type RegDoc = {
  eventId: string;
  userId: string;
  status: string;
  createdAt: any;
  checkedInAt: any;
};

function parseDate(v: any): number {
  try {
    if (!v) return 0;
    if (typeof v?.toDate === "function") return v.toDate().getTime();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    if (v instanceof Date) return v.getTime();
    if (typeof v === "string") return new Date(v).getTime();
    return 0;
  } catch {
    return 0;
  }
}

export default function MyRegistrations() {
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Array<{ reg: RegDoc; event: Event | null }>>(
    []
  );

  const isStudent = !!user && profile?.role === "student";

  useEffect(() => {
    const load = async () => {
      if (!isStudent) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setRows([]);

      try {
        // ✅ Get approved events (uses your existing events index)
        const evQ = query(collection(db, "events"), where("status", "==", "APPROVED"));
        const evSnap = await getDocs(evQ);

        const approvedEvents: Event[] = evSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Event, "id">) }))
          .sort((a, b) => parseDate((b as any).createdAt) - parseDate((a as any).createdAt));

        // ✅ For each event, check if THIS user has a registration doc
        // registrations are stored as: events/{eventId}/registrations/{userId}
        const results: Array<{ reg: RegDoc; event: Event | null }> = [];

        for (const ev of approvedEvents) {
          const regRef = doc(db, "events", ev.id, "registrations", user!.uid);
          const regSnap = await getDoc(regRef);

          if (!regSnap.exists()) continue;

          const reg = regSnap.data() as RegDoc;

          // Ensure eventId exists for routing, even if not stored in doc
          results.push({
            reg: { ...reg, eventId: reg.eventId || ev.id, userId: reg.userId || user!.uid },
            event: ev,
          });
        }

        // ✅ Sort by registration createdAt (newest first)
        results.sort((a, b) => parseDate(b.reg.createdAt) - parseDate(a.reg.createdAt));
        setRows(results);
      } catch (err: any) {
        setError(err.message || "Failed to load registrations.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isStudent, user]);

  if (!isStudent) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState
            title="Student access only"
            message="Login as a STUDENT to view your registrations."
            action={
              <Link className="btn btnPrimary" to="/login">
                Login
              </Link>
            }
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
            <div className="row" style={{ gap: 10 }}>
              <span className="badge badgePrimary">Student</span>
              <span className="badge">My Registrations</span>
              <div className="spacer" />
              <span className="badge badgeInfo">{rows.length} record(s)</span>
            </div>

            <h1 className="h1" style={{ marginTop: 12 }}>
              My Registrations
            </h1>
            <p className="p">Track your registered events and attendance status.</p>
          </div>
        </div>

        {loading && (
          <div className="grid2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonEventCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && <div className="notice noticeError">{error}</div>}

        {!loading && !error && rows.length === 0 && (
          <EmptyState
            title="No registrations yet"
            message="Browse events and register for an approved event to see it here."
            action={
              <Link className="btn btnPrimary" to="/">
                Go to Events
              </Link>
            }
          />
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="grid2">
            {rows.map(({ reg, event }) => (
              <div key={reg.eventId} className="card">
                <div className="cardBody">
                  <div
  className="bannerColoured"
  style={{
    background: categoryGradient(event?.category || "General"),
  }}
>
  <span className="bannerEmoji">
    {categoryEmoji(event?.category || "General")}
  </span>
</div>

                  <div
                    className="row"
                    style={{ justifyContent: "space-between", marginTop: 12 }}
                  >
                    <span className="badge badgePrimary">
                      {event?.category || "Event"}
                    </span>

                    <span
                      className={
                        reg.checkedInAt ? "badge badgeSuccess" : "badge badgeWarn"
                      }
                    >
                      {reg.checkedInAt ? "ATTENDED" : "NOT ATTENDED"}
                    </span>
                  </div>

                  <div className="eventTitle">{event?.title || "Event"}</div>
                  <div className="eventDesc">{event?.description || ""}</div>

                  <div className="eventMeta">
                    <span>📍 {event?.location || "TBA"}</span>
                    <span>🗓 {event ? formatDateTime((event as any).startTime) : "—"}</span>
                    <span>🧾 Status: {reg.status || "—"}</span>
                    <span>🕒 Registered: {reg.createdAt ? formatDateTime(reg.createdAt) : "—"}</span>
                  </div>

                  <div className="eventFooter">
                    <span className="small">
                      {reg.checkedInAt
                        ? "You can rate this event on the details page."
                        : "Attend (check-in) to unlock rating."}
                    </span>

                    <Link className="btn btnPrimary btnIcon" to={`/events/${reg.eventId}`}>
                      View details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}





import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import Navbar from "../components/Navbar";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import type { Event } from "../types/event";
import EmptyState from "../components/EmptyState";
import SkeletonEventCard from "../components/SkeletonEventCard";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/format";
import { Link } from "react-router-dom";

export default function StudentEvents() {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  // Track which events this student is already registered for
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());

  const canUse = !!user && profile?.role === "student";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q1 = query(
        collection(db, "events"),
        where("status", "==", "APPROVED")
      );
      const snap = await getDocs(q1);
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Event, "id">),
      }));
      setEvents(list);

      // Check which events the student is already registered for
      const alreadyRegistered = new Set<string>();
      await Promise.all(
        list.map(async (ev) => {
          const regSnap = await getDoc(
            doc(db, "events", ev.id, "registrations", user.uid)
          );
          if (regSnap.exists()) alreadyRegistered.add(ev.id);
        })
      );
      setRegisteredIds(alreadyRegistered);
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Failed to load events",
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

  const register = async (eventId: string) => {
    if (!user) return;

    // Prevent duplicate registration
    if (registeredIds.has(eventId)) {
      toast.push({ type: "error", title: "Already registered", message: "You have already registered for this event." });
      return;
    }

    setRegisteringId(eventId);
    try {
      await setDoc(doc(db, "events", eventId, "registrations", user.uid), {
        userId: user.uid,
        eventId,
        status: "REGISTERED",
        createdAt: serverTimestamp(),
        checkedInAt: null,
      });

      // Update local state so button changes immediately
      setRegisteredIds((prev) => new Set([...prev, eventId]));

      toast.push({
        type: "success",
        title: "Registered!",
        message: "You have successfully registered for this event.",
      });
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Registration failed",
        message: err?.message ?? String(err),
      });
    } finally {
      setRegisteringId(null);
    }
  };

  if (!canUse) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState
            title="Access denied"
            message="Only students can browse and register for events."
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
              <span className="badge">Events</span>
              <div className="spacer" />
              <button className="btn btnSoft" onClick={load}>Refresh</button>
            </div>
            <h1 className="h1" style={{ marginTop: 12 }}>Approved Events</h1>
            <p className="p">Register for events that interest you.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonEventCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No approved events"
            message="Check back later for new campus events."
            action={<button className="btn btnSoft" onClick={load}>Refresh</button>}
          />
        ) : (
          <div className="grid2">
            {events.map((ev) => {
              const isRegistered = registeredIds.has(ev.id);
              return (
                <div key={ev.id} className="card">
                  <div className="cardBody">
                    <div className="banner bannerSm" />

                    <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                      <span className="badge badgePrimary">{ev.category || "Event"}</span>
                      <span className="badge badgeSuccess">APPROVED</span>
                    </div>

                    <div className="eventTitle">{ev.title}</div>
                    <div className="eventDesc">{ev.description}</div>

                    <div className="eventMeta">
                      <span>📍 {ev.location || "TBA"}</span>
                      <span>🗓 {formatDateTime((ev as any).startTime)}</span>
                      <span>👥 {ev.capacity === 0 ? "Unlimited" : `Cap: ${ev.capacity}`}</span>
                    </div>

                    <div className="eventFooter">
                      <button
                        className={isRegistered ? "btn btnSoft" : "btn btnPrimary"}
                        onClick={() => register(ev.id)}
                        disabled={isRegistered || registeringId === ev.id}
                      >
                        {registeringId === ev.id
                          ? "Registering..."
                          : isRegistered
                          ? "✓ Already Registered"
                          : "Register"}
                      </button>

                      <Link className="btn btnGhost" to="/student/registrations">
                        My registrations
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

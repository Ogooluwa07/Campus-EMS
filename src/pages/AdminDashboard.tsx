import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import Navbar from "../components/Navbar";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import type { Event } from "../types/event";
import EmptyState from "../components/EmptyState";
import SkeletonEventCard from "../components/SkeletonEventCard";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/format";

type Tab = "PENDING" | "APPROVED" | "REJECTED";
type ModerationStatus = "APPROVED" | "REJECTED";

function statusBadgeClass(status?: string) {
  if (status === "APPROVED") return "badge badgeSuccess";
  if (status === "REJECTED") return "badge badgeDanger";
  if (status === "PENDING") return "badge badgeWarn";
  return "badge";
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("PENDING");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  const load = async (status: Tab) => {
    try {
      setLoading(true);

      const q = query(
        collection(db, "events"),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Event, "id">),
      }));

      setEvents(list);
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Failed to load events",
        message: err?.message ?? "Unknown error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  const updateStatus = async (id: string, status: ModerationStatus) => {
    if (!isAdmin) return;

    try {
      setBusyId(id);

      await updateDoc(doc(db, "events", id), {
        status,
        updatedAt: serverTimestamp(),
      });

      // remove from current view (since it no longer matches this tab query)
      setEvents((prev) => prev.filter((e) => e.id !== id));

      toast.push({
        type: "success",
        title: `Event ${status === "APPROVED" ? "approved" : "rejected"}`,
        message: "Status updated successfully.",
      });
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Update failed",
        message: err?.message ?? "Unknown error",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState
            title="Access denied"
            message="Only admins can view this dashboard."
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
              <span className="badge badgeDanger">Admin</span>
              <span className="badge">Moderation</span>
              <span className="badge">Quality control</span>
            </div>

            <h1 className="h1" style={{ marginTop: 12 }}>
              Admin Dashboard
            </h1>
            <p className="p">
              Review event submissions and keep the system trustworthy.
            </p>

            <div className="hr" />

            <div className="tabs">
              <button
                className={`tab ${tab === "PENDING" ? "tabActive" : ""}`}
                onClick={() => setTab("PENDING")}
              >
                Pending
              </button>
              <button
                className={`tab ${tab === "APPROVED" ? "tabActive" : ""}`}
                onClick={() => setTab("APPROVED")}
              >
                Approved
              </button>
              <button
                className={`tab ${tab === "REJECTED" ? "tabActive" : ""}`}
                onClick={() => setTab("REJECTED")}
              >
                Rejected
              </button>

              <div className="spacer" />
              <span className="badge badgeWarn">Showing: {tab}</span>

              <button
                className="btn btnSoft"
                style={{ marginLeft: 12 }}
                onClick={() => load(tab)}
              >
                Refresh
              </button>
            </div>
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
            title={`No ${tab.toLowerCase()} events`}
            message="When organizers submit events, they will show up in Pending. Approved events appear on the student Events page."
            action={
              <button className="btn btnSoft" onClick={() => load(tab)}>
                Refresh
              </button>
            }
          />
        ) : (
          <div className="grid2">
            {events.map((event) => (
              <div key={event.id} className="card">
                <div className="cardBody">
                  <div className="banner bannerSm" />

                  <div
                    className="row"
                    style={{ justifyContent: "space-between", marginTop: 12 }}
                  >
                    <span className="badge badgePrimary">
                      {event.category || "Event"}
                    </span>
                    <span className={statusBadgeClass(event.status)}>
                      {event.status}
                    </span>
                  </div>

                  <div className="eventTitle">{event.title}</div>
                  <div className="eventDesc">{event.description}</div>

                  <div className="eventMeta">
                    <span>📍 {event.location || "TBA"}</span>
                    <span>🗓 {formatDateTime((event as any).startTime)}</span>
                    <span>
                      👥{" "}
                      {event.capacity === 0
                        ? "Unlimited"
                        : `Cap: ${event.capacity}`}
                    </span>
                    <span>🧾 Registered: {event.registrationCount || 0}</span>
                  </div>

                  <div className="eventFooter">
                    {tab === "PENDING" ? (
                      <div className="row">
                        <button
                          className="btn btnPrimary"
                          disabled={busyId === event.id}
                          onClick={() => updateStatus(event.id, "APPROVED")}
                        >
                          {busyId === event.id ? "Working..." : "Approve"}
                        </button>
                        <button
                          className="btn btnDanger"
                          disabled={busyId === event.id}
                          onClick={() => updateStatus(event.id, "REJECTED")}
                        >
                          {busyId === event.id ? "Working..." : "Reject"}
                        </button>
                      </div>
                    ) : (
                      <span className="badge">Read-only view</span>
                    )}
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



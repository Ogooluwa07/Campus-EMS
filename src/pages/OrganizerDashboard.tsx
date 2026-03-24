import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  doc,
  Timestamp,
} from "firebase/firestore";
import Navbar from "../components/Navbar";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import type { Event } from "../types/event";
import EmptyState from "../components/EmptyState";
import SkeletonEventCard from "../components/SkeletonEventCard";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/format";

type Tab = "CREATE" | "MY_EVENTS" | "REGISTRATIONS" | "FEEDBACK";
type StatusFilter = "ALL" | "APPROVED" | "PENDING" | "REJECTED";

type RegistrationRow = {
  userId: string;
  eventId: string;
  status: string;
  createdAt: any;
  checkedInAt: any;
};

type FeedbackRow = {
  userId: string;
  eventId: string;
  rating: number;
  comment: string;
  createdAt: any;
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

function statusBadge(status?: string) {
  if (status === "APPROVED") return "badge badgeSuccess";
  if (status === "REJECTED") return "badge badgeDanger";
  if (status === "PENDING") return "badge badgeWarn";
  return "badge";
}

function avgRating(feedback: FeedbackRow[]) {
  if (!feedback.length) return 0;
  const s = feedback.reduce((acc, f) => acc + (Number(f.rating) || 0), 0);
  return Math.round((s / feedback.length) * 10) / 10;
}

function toTimestampFromDatetimeLocal(value: string) {
  // datetime-local returns "YYYY-MM-DDTHH:mm"
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Timestamp.fromDate(d);
}

export default function OrganizerDashboard() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const canUse = !!user && profile?.role === "organizer";

  const [tab, setTab] = useState<Tab>("MY_EVENTS");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // create event form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState<number>(0);
  const [creating, setCreating] = useState(false);

  // events
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // selected event
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // registrations
  const [regs, setRegs] = useState<RegistrationRow[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  // feedback
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const stats = useMemo(() => {
    const approved = events.filter((e) => e.status === "APPROVED").length;
    const pending = events.filter((e) => e.status === "PENDING").length;
    const rejected = events.filter((e) => e.status === "REJECTED").length;
    return { approved, pending, rejected, total: events.length };
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (statusFilter === "ALL") return events;
    return events.filter((e) => e.status === statusFilter);
  }, [events, statusFilter]);

  const loadMyEvents = async () => {
    if (!user) return;
    setLoadingEvents(true);

    try {
      // ✅ no orderBy -> no index needed
      const q1 = query(collection(db, "events"), where("organizerId", "==", user.uid));
      const snap = await getDocs(q1);

      const list = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<Event, "id">) }))
        .sort((a, b) => parseDate((b as any).createdAt) - parseDate((a as any).createdAt));

      setEvents(list);
    } catch (err: any) {
      toast.push({ type: "error", title: "Failed to load events", message: err?.message ?? String(err) });
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadRegistrations = async (event: Event) => {
    setSelectedEvent(event);
    setRegs([]);
    setLoadingRegs(true);

    try {
      const snap = await getDocs(collection(db, "events", event.id, "registrations"));
      const list = snap.docs
        .map((d) => d.data() as RegistrationRow)
        .sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
      setRegs(list);
    } catch (err: any) {
      toast.push({ type: "error", title: "Failed to load registrations", message: err?.message ?? String(err) });
    } finally {
      setLoadingRegs(false);
    }
  };

  const loadFeedback = async (event: Event) => {
    setSelectedEvent(event);
    setFeedback([]);
    setLoadingFeedback(true);

    try {
      const snap = await getDocs(collection(db, "events", event.id, "feedback"));
      const list = snap.docs
        .map((d) => d.data() as FeedbackRow)
        .sort((a, b) => parseDate(b.createdAt) - parseDate(a.createdAt));
      setFeedback(list);
    } catch (err: any) {
      toast.push({ type: "error", title: "Failed to load feedback", message: err?.message ?? String(err) });
    } finally {
      setLoadingFeedback(false);
    }
  };

  const markPresent = async (eventId: string, studentId: string) => {
    try {
      await updateDoc(doc(db, "events", eventId, "registrations", studentId), {
        checkedInAt: serverTimestamp(),
      });

      setRegs((prev) =>
        prev.map((r) => (r.userId === studentId ? { ...r, checkedInAt: new Date() } : r))
      );

      toast.push({ type: "success", title: "Attendance confirmed", message: "Student marked attended." });
    } catch (err: any) {
      toast.push({ type: "error", title: "Attendance failed", message: err?.message ?? String(err) });
    }
  };

  useEffect(() => {
    if (canUse) loadMyEvents();
    else setLoadingEvents(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUse) return;

    // ✅ validation that prevents “silent broken” events
    const startTs = toTimestampFromDatetimeLocal(startTime);
    const endTs = toTimestampFromDatetimeLocal(endTime);

    if (!title.trim()) {
      toast.push({ type: "error", title: "Missing title", message: "Please enter an event title." });
      return;
    }
    if (!startTs || !endTs) {
      toast.push({ type: "error", title: "Invalid date/time", message: "Please select valid start and end times." });
      return;
    }
    if (endTs.toMillis() <= startTs.toMillis()) {
      toast.push({ type: "error", title: "Invalid time range", message: "End time must be after start time." });
      return;
    }

    const cap = Number(capacity);
    const safeCap = Number.isFinite(cap) && cap >= 0 ? cap : 0;

    setCreating(true);
    try {
      await addDoc(collection(db, "events"), {
        title: title.trim(),
        description: description?.trim?.() ?? "",
        category: category?.trim?.() ?? "General",
        location: location?.trim?.() ?? "",
        startTime: startTs,
        endTime: endTs,
        capacity: safeCap,
        status: "PENDING", // ✅ matches rules + your Event type
        organizerId: user!.uid,
        registrationCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setTitle("");
      setDescription("");
      setCategory("General");
      setLocation("");
      setStartTime("");
      setEndTime("");
      setCapacity(0);

      toast.push({ type: "success", title: "Event submitted", message: "Awaiting admin approval." });

      await loadMyEvents();
      setTab("MY_EVENTS");
    } catch (err: any) {
      toast.push({ type: "error", title: "Create failed", message: err?.message ?? String(err) });
    } finally {
      setCreating(false);
    }
  };

  const kpiClickableStyle = (active: boolean): React.CSSProperties => ({
    cursor: "pointer",
    outline: active ? "3px solid rgba(47,128,237,0.18)" : "none",
    transform: active ? "translateY(-1px)" : "none",
  });

  if (!canUse) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState title="Access denied" message="Only organizers can access this page." />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">
        {/* HEADER */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardBody">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 className="h1" style={{ margin: 0 }}>Organizer Dashboard</h1>
                <p className="p" style={{ marginTop: 6 }}>
                  Create events, monitor approvals, confirm attendance, and review feedback.
                </p>
              </div>
              <button className="btn btnSoft" onClick={loadMyEvents}>Refresh</button>
            </div>

            <div className="hr" />

            {/* KPI clickable filters */}
            <div className="kpiGrid">
              <div
                className="kpiCard"
                style={kpiClickableStyle(statusFilter === "APPROVED")}
                onClick={() => { setStatusFilter("APPROVED"); setTab("MY_EVENTS"); }}
                title="Filter events: Approved"
                role="button"
              >
                <div className="kpiTop">
                  <span className="kpiDot kpiDotSuccess" />
                  <span className="kpiTitle">Approved</span>
                </div>
                <div className="kpiBig">{stats.approved}</div>
              </div>

              <div
                className="kpiCard"
                style={kpiClickableStyle(statusFilter === "PENDING")}
                onClick={() => { setStatusFilter("PENDING"); setTab("MY_EVENTS"); }}
                title="Filter events: Pending"
                role="button"
              >
                <div className="kpiTop">
                  <span className="kpiDot kpiDotWarn" />
                  <span className="kpiTitle">Pending</span>
                </div>
                <div className="kpiBig">{stats.pending}</div>
              </div>

              <div
                className="kpiCard"
                style={kpiClickableStyle(statusFilter === "REJECTED")}
                onClick={() => { setStatusFilter("REJECTED"); setTab("MY_EVENTS"); }}
                title="Filter events: Rejected"
                role="button"
              >
                <div className="kpiTop">
                  <span className="kpiDot kpiDotDanger" />
                  <span className="kpiTitle">Rejected</span>
                </div>
                <div className="kpiBig">{stats.rejected}</div>
              </div>

              <div
                className="kpiCard kpiCardAccent"
                style={kpiClickableStyle(statusFilter === "ALL")}
                onClick={() => { setStatusFilter("ALL"); setTab("MY_EVENTS"); }}
                title="Show all events"
                role="button"
              >
                <div className="kpiTop">
                  <span className="kpiDot kpiDotPrimary" />
                  <span className="kpiTitle">Total</span>
                </div>
                <div className="kpiBig">{stats.total}</div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              {statusFilter !== "ALL" && (
                <span
                  className="badge badgeInfo"
                  style={{ cursor: "pointer" }}
                  onClick={() => setStatusFilter("ALL")}
                >
                  Filter: {statusFilter} • Clear
                </span>
              )}
            </div>

            <div className="hr" />

            <div className="tabs">
              <button className={`tab ${tab === "CREATE" ? "tabActive" : ""}`} onClick={() => setTab("CREATE")}>
                Create Event
              </button>
              <button className={`tab ${tab === "MY_EVENTS" ? "tabActive" : ""}`} onClick={() => setTab("MY_EVENTS")}>
                My Events
              </button>

              <button
                className={`tab ${tab === "REGISTRATIONS" ? "tabActive" : ""}`}
                onClick={() => selectedEvent && setTab("REGISTRATIONS")}
                disabled={!selectedEvent}
                title={!selectedEvent ? "Select an event first" : ""}
              >
                Registrations
              </button>

              <button
                className={`tab ${tab === "FEEDBACK" ? "tabActive" : ""}`}
                onClick={() => selectedEvent && setTab("FEEDBACK")}
                disabled={!selectedEvent}
                title={!selectedEvent ? "Select an event first" : ""}
              >
                Feedback
              </button>

              <div className="spacer" />
              {selectedEvent && <span className="badge badgeInfo">Selected: {selectedEvent.title}</span>}
            </div>
          </div>
        </div>

        {/* CREATE */}
        {tab === "CREATE" && (
          <div className="card" style={{ maxWidth: 760, margin: "0 auto" }}>
            <div className="cardHeader">
              <h2 className="h2">Create a new event</h2>
              <p className="p">New events start as <b>PENDING</b> until approved by admin.</p>
            </div>
            <div className="cardBody">
              <form onSubmit={handleCreateEvent}>
                <label className="label">Title</label>
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />

                <div style={{ height: 12 }} />

                <label className="label">Description</label>
                <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />

                <div style={{ height: 12 }} />

                <label className="label">Category</label>
                <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} />

                <div style={{ height: 12 }} />

                <label className="label">Location</label>
                <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />

                <div style={{ height: 12 }} />

                <label className="label">Start time</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />

                <div style={{ height: 12 }} />

                <label className="label">End time</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />

                <div style={{ height: 12 }} />

                <label className="label">Capacity</label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  placeholder="0 = unlimited"
                />
                <div className="helper">Capacity controls registration. 0 means unlimited.</div>

                <div style={{ height: 16 }} />

                <button className="btn btnPrimary btnWide" type="submit" disabled={creating}>
                  {creating ? "Submitting..." : "Submit for approval"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MY EVENTS */}
        {tab === "MY_EVENTS" && (
          <>
            {loadingEvents ? (
              <div className="grid2">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonEventCard key={i} />)}
              </div>
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                title="No events match this filter"
                message="Try clearing the filter to see all your events."
                action={<button className="btn btnSoft" onClick={() => setStatusFilter("ALL")}>Clear filter</button>}
              />
            ) : (
              <div className="grid2">
                {filteredEvents.map((ev) => (
                  <div key={ev.id} className="card">
                    <div className="cardBody">
                      <div className="row" style={{ justifyContent: "space-between", marginTop: 4 }}>
                        <span className="badge badgePrimary">{ev.category || "Event"}</span>
                        <span className={statusBadge(ev.status)}>{ev.status}</span>
                      </div>

                      <div className="eventTitle">{ev.title}</div>
                      <div className="eventDesc">{ev.description}</div>

                      <div className="eventMeta">
                        <span>📍 {ev.location || "TBA"}</span>
                        <span>🗓 {formatDateTime((ev as any).startTime)}</span>
                        <span>👥 {ev.capacity === 0 ? "Unlimited" : `Cap: ${ev.capacity}`}</span>
                        <span>🧾 Registered: {ev.registrationCount || 0}</span>
                      </div>

                      <div className="eventFooter">
                        <button
                          className="btn btnPrimary"
                          onClick={() => {
                            setSelectedEvent(ev);
                            loadRegistrations(ev);
                            setTab("REGISTRATIONS");
                          }}
                        >
                          View registrations
                        </button>

                        <button
                          className="btn btnSoft"
                          onClick={() => {
                            setSelectedEvent(ev);
                            loadFeedback(ev);
                            setTab("FEEDBACK");
                          }}
                        >
                          View feedback
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* REGISTRATIONS */}
        {tab === "REGISTRATIONS" && (
          <>
            {!selectedEvent ? (
              <EmptyState title="Select an event" message="Go to My Events and click View registrations." />
            ) : (
              <div className="card">
                <div className="cardHeader">
                  <h2 className="h2">Registrations</h2>
                  <p className="p">{selectedEvent.title}</p>
                </div>

                <div className="cardBody">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="badge badgeInfo">{regs.length} student(s)</span>
                    <button className="btn btnSoft" onClick={() => loadRegistrations(selectedEvent)}>Refresh</button>
                  </div>

                  <div style={{ height: 12 }} />

                  {loadingRegs ? (
                    <div className="notice">Loading registrations…</div>
                  ) : regs.length === 0 ? (
                    <EmptyState title="No registrations yet" message="Students will appear here after registering." />
                  ) : (
                    regs.map((r) => (
                      <div key={r.userId} className="listItem">
                        <div className="row" style={{ justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 900, color: "var(--primary)" }}>Student ID: {r.userId}</div>
                          <span className={r.checkedInAt ? "badge badgeSuccess" : "badge badgeWarn"}>
                            {r.checkedInAt ? "ATTENDED" : "NOT ATTENDED"}
                          </span>
                        </div>

                        <div className="small" style={{ marginTop: 6 }}>
                          Registered: {r.createdAt ? formatDateTime(r.createdAt) : "—"} • Status: {r.status || "—"}
                        </div>

                        <div style={{ marginTop: 10 }}>
                          <button
                            className="btn btnPrimary"
                            onClick={() => markPresent(selectedEvent.id, r.userId)}
                            disabled={!!r.checkedInAt}
                          >
                            {r.checkedInAt ? "Already confirmed" : "Confirm attendance"}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* FEEDBACK */}
        {tab === "FEEDBACK" && (
          <>
            {!selectedEvent ? (
              <EmptyState title="Select an event" message="Go to My Events and click View feedback." />
            ) : (
              <div className="card">
                <div className="cardHeader">
                  <h2 className="h2">Feedback</h2>
                  <p className="p">{selectedEvent.title}</p>
                </div>

                <div className="cardBody">
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span className="badge badgeInfo">
                      {feedback.length} review(s) • Avg: {avgRating(feedback) || "—"}
                    </span>
                    <button className="btn btnSoft" onClick={() => loadFeedback(selectedEvent)}>Refresh</button>
                  </div>

                  <div style={{ height: 12 }} />

                  {loadingFeedback ? (
                    <div className="notice">Loading feedback…</div>
                  ) : feedback.length === 0 ? (
                    <EmptyState title="No feedback yet" message="Feedback appears after students attend and submit reviews." />
                  ) : (
                    feedback.map((f) => (
                      <div key={f.userId} className="listItem">
                        <div className="row" style={{ justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 900, color: "var(--primary)" }}>Student ID: {f.userId}</div>
                          <span className="badge badgePrimary">Rating: {f.rating}/5</span>
                        </div>

                        <div style={{ marginTop: 8, fontWeight: 900, color: "var(--text)" }}>
                          {f.comment || "No comment"}
                        </div>

                        <div className="small" style={{ marginTop: 8 }}>
                          Submitted: {f.createdAt ? formatDateTime(f.createdAt) : "—"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}








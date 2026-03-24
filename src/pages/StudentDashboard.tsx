import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import type { Event } from "../types/event";
import EmptyState from "../components/EmptyState";
import SkeletonEventCard from "../components/SkeletonEventCard";
import { useToast } from "../context/ToastContext";
import { formatDateTime } from "../utils/format";

type MyReg = {
  eventId: string;
  userId: string;
  status: string; // REGISTERED | PENDING | APPROVED | REJECTED | ...
  createdAt: any;
  checkedInAt: any;
};

type RegMap = Record<string, MyReg>;

function statusBadge(status?: string) {
  const s = (status || "").toUpperCase();

  if (s === "APPROVED" || s === "ACCEPTED") return { cls: "badge badgeSuccess", label: "APPROVED" };
  if (s === "REJECTED" || s === "DECLINED") return { cls: "badge badgeDanger", label: "REJECTED" };
  if (s === "PENDING") return { cls: "badge badgeWarn", label: "PENDING" };
  if (s === "REGISTERED") return { cls: "badge badgeInfo", label: "REGISTERED" };

  return { cls: "badge", label: status || "—" };
}

function StudentHome() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();

  const displayName = profile?.fullName || profile?.email || "Signed in";
  const canUse = !!user && profile?.role === "student";

  const [kpiLoading, setKpiLoading] = useState(true);
  const [approvedEventsCount, setApprovedEventsCount] = useState(0);
  const [myRegsCount, setMyRegsCount] = useState(0);
  const [approvedRegsCount, setApprovedRegsCount] = useState(0);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);

  useEffect(() => {
    if (!canUse || !user) {
      setKpiLoading(false);
      return;
    }

    setKpiLoading(true);

    // Approved events count + preview list (real-time)
    const qEvents = query(
      collection(db, "events"),
      where("status", "==", "APPROVED"),
      orderBy("startTime", "asc"),
      limit(4)
    );

    const unsubEvents = onSnapshot(
      qEvents,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Event, "id">),
        }));
        setRecentEvents(list);
      },
      (err) => {
        toast.push({ type: "error", title: "Failed to load events", message: err?.message ?? String(err) });
      }
    );

    // Approved events count (separate snapshot for count)
    const qEventsCount = query(collection(db, "events"), where("status", "==", "APPROVED"));
    const unsubEventsCount = onSnapshot(
      qEventsCount,
      (snap) => setApprovedEventsCount(snap.size),
      (err) => {
        toast.push({ type: "error", title: "Failed to load stats", message: err?.message ?? String(err) });
      }
    );

    // My registrations count (real-time via collectionGroup)
    const qMyRegs = query(collectionGroup(db, "registrations"), where("userId", "==", user.uid));
    const unsubMyRegs = onSnapshot(
      qMyRegs,
      (snap) => {
        setMyRegsCount(snap.size);
        const approved = snap.docs.filter((d) => {
          const s = String((d.data() as any)?.status || "").toUpperCase();
          return s === "APPROVED" || s === "ACCEPTED";
        }).length;
        setApprovedRegsCount(approved);
        setKpiLoading(false);
      },
      (err) => {
        setKpiLoading(false);
        toast.push({ type: "error", title: "Failed to load stats", message: err?.message ?? String(err) });
      }
    );

    return () => {
      unsubEvents();
      unsubEventsCount();
      unsubMyRegs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse, user?.uid]);

  return (
    <>
      <Navbar />

      <div className="container">
        {/* Header */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardBody">
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div className="row" style={{ gap: 8 }}>
                  <span className="badge badgePrimary">Student</span>
                  <span className="badge">Dashboard</span>
                  <span className="badge badgeInfo">{displayName}</span>
                </div>

                <h1 className="h1" style={{ marginTop: 12, marginBottom: 6 }}>
                  Student Dashboard
                </h1>
                <p className="p" style={{ margin: 0 }}>
                  Discover campus events, register, and track your approval status.
                </p>
              </div>

              <div className="row" style={{ gap: 10 }}>
                <Link to="/student/events" className="btn btnPrimary">
                  Browse Events
                </Link>
                <Link to="/student/registrations" className="btn btnSoft">
                  My Registrations
                </Link>
                <button className="btn btnGhost" onClick={refreshProfile}>
                  Refresh
                </button>
              </div>
            </div>

            <div className="hr" />

            {/* KPI Row */}
            <div className="grid2" style={{ marginTop: 10 }}>
              <div className="listItem">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badgePrimary">Available</span>
                  <span className="badge">{kpiLoading ? "…" : approvedEventsCount}</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "var(--text)" }}>
                  Approved Events
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Events currently open for students to register.
                </div>
              </div>

              <div className="listItem">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badgeInfo">My Activity</span>
                  <span className="badge">{kpiLoading ? "…" : myRegsCount}</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "var(--text)" }}>
                  Total Registrations
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  All events you have registered for.
                </div>
              </div>

              <div className="listItem">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badgeSuccess">Approved</span>
                  <span className="badge">{kpiLoading ? "…" : approvedRegsCount}</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "var(--text)" }}>
                  Approved Registrations
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Registrations accepted by the admin.
                </div>
              </div>

              <div className="listItem">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badgeWarn">Tip</span>
                  <span className="badge">Smart</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "var(--text)" }}>
                  Use Search + Filters
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Find events faster by title, location, or category.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming events preview */}
        <div className="card">
          <div className="cardHeader">
            <h2 className="h2">Upcoming approved events</h2>
            <p className="p" style={{ marginTop: 6 }}>
              A quick preview — open Events to search and register.
            </p>
          </div>

          <div className="cardBody">
            {recentEvents.length === 0 ? (
              <EmptyState title="No upcoming events yet" message="Check back later for new events." />
            ) : (
              <div className="grid2">
                {recentEvents.map((ev) => (
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
                      </div>

                      <div className="eventFooter">
                        <Link to="/student/events" className="btn btnSoft">
                          View & Register
                        </Link>
                        <span className="small">Open full list</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="cardHeader">
            <h2 className="h2">How it works</h2>
            <p className="p" style={{ marginTop: 6 }}>
              Register → Admin reviews → Your dashboard updates automatically.
            </p>
          </div>

          <div className="cardBody">
            <div className="grid2">
              <div className="listItem">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badgePrimary">Step 1</span>
                  <span className="badge">Browse</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "var(--text)" }}>
                  Choose an approved event
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Only events marked <b>APPROVED</b> appear.
                </div>
              </div>

              <div className="listItem">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badgeWarn">Step 2</span>
                  <span className="badge">Register</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "var(--text)" }}>
                  Register once
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  After registering, the button changes to your status.
                </div>
              </div>

              <div className="listItem">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badgeInfo">Step 3</span>
                  <span className="badge">Review</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "var(--text)" }}>
                  Admin accepts/rejects
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Your dashboard updates in real-time.
                </div>
              </div>

              <div className="listItem">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="badge badgeSuccess">Shortcut</span>
                  <span className="badge badgePrimary">Go</span>
                </div>
                <div style={{ marginTop: 10, fontWeight: 900, color: "var(--text)" }}>
                  Quick actions
                </div>
                <div className="small" style={{ marginTop: 6 }}>
                  Jump straight to Events or Registrations.
                </div>

                <div style={{ marginTop: 12 }} className="row">
                  <Link to="/student/events" className="btn btnPrimary">
                    Events
                  </Link>
                  <Link to="/student/registrations" className="btn btnSoft">
                    Registrations
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}

function StudentEventsPage() {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  // ✅ Registration map so each event card knows if user already registered
  const [regMap, setRegMap] = useState<RegMap>({});

  // ✅ Search + filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("ALL");

  const canUse = !!user && profile?.role === "student";

  useEffect(() => {
    if (!canUse || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // ✅ Real-time approved events
    const qEvents = query(collection(db, "events"), where("status", "==", "APPROVED"));
    const unsubEvents = onSnapshot(
      qEvents,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Event, "id">),
        }));
        setEvents(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        toast.push({ type: "error", title: "Failed to load events", message: err?.message ?? String(err) });
      }
    );

    // ✅ Real-time my registrations (collectionGroup)
    const qMyRegs = query(collectionGroup(db, "registrations"), where("userId", "==", user.uid));
    const unsubRegs = onSnapshot(
      qMyRegs,
      (snap) => {
        const map: RegMap = {};
        snap.docs.forEach((d) => {
          const r = d.data() as MyReg;
          map[r.eventId] = r;
        });
        setRegMap(map);
      },
      (err) => {
        toast.push({ type: "error", title: "Failed to load registrations", message: err?.message ?? String(err) });
      }
    );

    return () => {
      unsubEvents();
      unsubRegs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse, user?.uid]);

  const register = async (eventId: string) => {
    if (!user) return;

    // already registered
    if (regMap[eventId]) return;

    setRegisteringId(eventId);
    try {
      await setDoc(doc(db, "events", eventId, "registrations", user.uid), {
        userId: user.uid,
        eventId,
        // ✅ use PENDING so admin can approve/reject
        status: "PENDING",
        createdAt: serverTimestamp(),
        checkedInAt: null,
      });

      toast.push({ type: "success", title: "Registration submitted", message: "Waiting for admin approval." });
    } catch (err: any) {
      toast.push({ type: "error", title: "Registration failed", message: err?.message ?? String(err) });
    } finally {
      setRegisteringId(null);
    }
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return events
      .filter((ev) => {
        if (category !== "ALL" && (ev.category || "") !== category) return false;

        if (!s) return true;

        const hay =
          `${ev.title || ""} ${ev.description || ""} ${ev.location || ""} ${ev.category || ""}`.toLowerCase();

        return hay.includes(s);
      })
      // optional: sort by start time asc if exists
      .sort((a: any, b: any) => {
        const at = a?.startTime?.seconds ?? 0;
        const bt = b?.startTime?.seconds ?? 0;
        return at - bt;
      });
  }, [events, search, category]);

  if (!canUse) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState title="Access denied" message="Only students can browse events." />
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
              <Link className="btn btnGhost" to="/student">
                Back
              </Link>
            </div>

            <h1 className="h1" style={{ marginTop: 12 }}>Approved Events</h1>
            <p className="p">Search, filter, and register. Your status updates automatically after admin review.</p>

            {/* ✅ Search + Filter Row */}
            <div className="row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events by title, location, category…"
                style={{ minWidth: 260, flex: 1 }}
              />

              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ minWidth: 180 }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button className="btn btnSoft" onClick={() => { setSearch(""); setCategory("ALL"); }}>
                Clear
              </button>

              <Link className="btn btnSoft" to="/student/registrations">
                My registrations
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonEventCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching events"
            message="Try a different keyword or clear filters."
            action={
              <button className="btn btnPrimary" onClick={() => { setSearch(""); setCategory("ALL"); }}>
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="grid2">
            {filtered.map((ev) => {
              const myReg = regMap[ev.id];
              const badge = myReg ? statusBadge(myReg.status) : null;

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

                    <div className="eventFooter" style={{ alignItems: "center" }}>
                      {/* ✅ If registered, hide button and show status */}
                      {myReg ? (
                        <div className="row" style={{ gap: 10, alignItems: "center" }}>
                          <span className={badge!.cls}>{badge!.label}</span>
                          <span className="small">
                            Submitted: {myReg.createdAt ? formatDateTime(myReg.createdAt) : "—"}
                          </span>
                        </div>
                      ) : (
                        <button
                          className="btn btnPrimary"
                          onClick={() => register(ev.id)}
                          disabled={registeringId === ev.id}
                        >
                          {registeringId === ev.id ? "Registering..." : "Register"}
                        </button>
                      )}

                      <Link className="btn btnSoft" to="/student/registrations">
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

function StudentRegistrationsPage() {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [regs, setRegs] = useState<MyReg[]>([]);
  const [loading, setLoading] = useState(true);

  const canUse = !!user && profile?.role === "student";

  useEffect(() => {
    if (!canUse || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // ✅ Real-time registrations
    const q1 = query(
      collectionGroup(db, "registrations"),
      where("userId", "==", user.uid)
    );

    const unsub = onSnapshot(
      q1,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as MyReg);

        // Optional: sort newest first
        list.sort((a: any, b: any) => {
          const at = a?.createdAt?.seconds ?? 0;
          const bt = b?.createdAt?.seconds ?? 0;
          return bt - at;
        });

        setRegs(list);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        toast.push({ type: "error", title: "Failed to load registrations", message: err?.message ?? String(err) });
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUse, user?.uid]);

  if (!canUse) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState title="Access denied" message="Only students can view registrations." />
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
              <Link className="btn btnGhost" to="/student">
                Back
              </Link>
            </div>

            <h1 className="h1" style={{ marginTop: 12 }}>My Registrations</h1>
            <p className="p">Track your registration approval status and attendance.</p>
          </div>
        </div>

        {loading ? (
          <div className="notice">Loading registrations…</div>
        ) : regs.length === 0 ? (
          <EmptyState
            title="No registrations yet"
            message="Go to Events and register for one."
            action={
              <Link to="/student/events" className="btn btnPrimary">
                Browse events
              </Link>
            }
          />
        ) : (
          regs.map((r) => {
            const badge = statusBadge(r.status);
            return (
              <div key={r.eventId} className="listItem">
                <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div style={{ fontWeight: 1000, color: "var(--primary)" }}>
                    Event ID: {r.eventId}
                  </div>

                  <span className={badge.cls}>{badge.label}</span>
                </div>

                <div className="small" style={{ marginTop: 8 }}>
                  Registered: {r.createdAt ? formatDateTime(r.createdAt) : "—"}
                </div>

                <div className="small" style={{ marginTop: 6 }}>
                  Checked-in: {r.checkedInAt ? formatDateTime(r.checkedInAt) : "Not yet"}
                </div>

                <div className="small" style={{ marginTop: 6 }}>
                  Attendance:{" "}
                  <span className={r.checkedInAt ? "badge badgeSuccess" : "badge badgeWarn"}>
                    {r.checkedInAt ? "ATTENDED" : "NOT ATTENDED"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default function StudentDashboard() {
  return (
    <Routes>
      <Route path="/" element={<StudentHome />} />
      <Route path="/events" element={<StudentEventsPage />} />
      <Route path="/registrations" element={<StudentRegistrationsPage />} />
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  );
}




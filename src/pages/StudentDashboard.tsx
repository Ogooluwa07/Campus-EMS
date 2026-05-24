import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,  
  updateDoc, 
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
import { categoryGradient, categoryEmoji } from "../utils/categoryColors";

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

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <>
      <Navbar />
      <div className="container">

        {/* Welcome Banner */}
        <div className="welcomeBanner">
          <p className="welcomeSub">{greeting} 👋</p>
          <h1 className="welcomeName">{displayName}</h1>
          <p className="welcomeSub">Discover events, register, and track your approvals — all in one place.</p>
          <div className="welcomeActions">
            <Link to="/student/events" className="btnWhite">Browse Events</Link>
            <Link to="/student/registrations" className="btnWhiteOutline">My Registrations</Link>
            <Link to="/student/profile" className="btnWhiteOutline">My Profile</Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="kpiGrid" style={{ marginBottom: 16 }}>
          <div className="kpiCard kpiCardAccent">
            <div className="kpiTop"><span className="kpiDot kpiDotPrimary" /><span className="kpiTitle">Available Events</span></div>
            <div className="kpiBig">{kpiLoading ? "…" : approvedEventsCount}</div>
          </div>
          <div className="kpiCard">
            <div className="kpiTop"><span className="kpiDot kpiDotPrimary" /><span className="kpiTitle">My Registrations</span></div>
            <div className="kpiBig">{kpiLoading ? "…" : myRegsCount}</div>
          </div>
          <div className="kpiCard">
            <div className="kpiTop"><span className="kpiDot kpiDotSuccess" /><span className="kpiTitle">Approved</span></div>
            <div className="kpiBig">{kpiLoading ? "…" : approvedRegsCount}</div>
          </div>
          <div className="kpiCard">
            <div className="kpiTop"><span className="kpiDot kpiDotWarn" /><span className="kpiTitle">Pending</span></div>
            <div className="kpiBig">{kpiLoading ? "…" : myRegsCount - approvedRegsCount}</div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardHeader">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <h2 className="h2">Upcoming Events</h2>
                <p className="p" style={{ marginTop: 6 }}>A quick preview — browse all events to register.</p>
              </div>
              <Link to="/student/events" className="btn btnSoft">View all</Link>
            </div>
          </div>
          <div className="cardBody">
            {recentEvents.length === 0 ? (
              <EmptyState title="No upcoming events yet" message="Check back later for new events." />
            ) : (
              <div className="grid2">
                {recentEvents.map((ev) => (
                  <div key={ev.id} className="card">
                    <div className="cardBody">
                      <div className="bannerColoured" style={{ background: categoryGradient(ev.category) }}>
                        <span className="bannerEmoji">{categoryEmoji(ev.category)}</span>
                      </div>
                      <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                        <span className="badge badgePrimary">{ev.category || "General"}</span>
                        <span className="badge badgeSuccess">APPROVED</span>
                      </div>
                      <div className="eventTitle">{ev.title}</div>
                      <div className="eventDesc">{ev.description}</div>
                      <div className="eventMeta">
                        <span>📍 {ev.location || "TBA"}</span>
                        <span>🗓 {formatDateTime((ev as any).startTime)}</span>
                      </div>
                      <div className="eventFooter">
                        <Link to="/student/events" className="btn btnSoft">View & Register</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* How it works */}
        <div className="card">
          <div className="cardHeader">
            <h2 className="h2">How it works</h2>
            <p className="p" style={{ marginTop: 6 }}>Register → Admin reviews → Your dashboard updates automatically.</p>
          </div>
          <div className="cardBody">
            <div className="kpiGrid">
              {[
                { step: "1", label: "Browse",   title: "Find an event",       desc: "Only APPROVED events appear in your events list.",              dot: "kpiDotPrimary" },
                { step: "2", label: "Register", title: "Register once",        desc: "After registering, your status appears in My Registrations.",   dot: "kpiDotWarn"    },
                { step: "3", label: "Review",   title: "Admin reviews",        desc: "Your dashboard updates in real-time when approved.",            dot: "kpiDotSuccess" },
                { step: "4", label: "Attend",   title: "Attend the event",     desc: "Show up and get marked as attended by the organizer.",          dot: "kpiDotDanger"  },
              ].map(({ step, label, title, desc, dot }) => (
                <div key={step} className="kpiCard">
                  <div className="kpiTop">
                    <span className={`kpiDot ${dot}`} />
                    <span className="kpiTitle">Step {step} — {label}</span>
                  </div>
                  <div style={{ fontWeight: 900, color: "var(--text)", marginTop: 10, fontSize: 14 }}>{title}</div>
                  <div className="small" style={{ marginTop: 6, lineHeight: 1.5 }}>{desc}</div>
                </div>
              ))}
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
const [eventTitles, setEventTitles] = useState<Record<string, string>>({});

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
  async (snap) => {
        const list = snap.docs.map((d) => d.data() as MyReg);

        // Optional: sort newest first
        list.sort((a: any, b: any) => {
          const at = a?.createdAt?.seconds ?? 0;
          const bt = b?.createdAt?.seconds ?? 0;
          return bt - at;
        });

        setRegs(list);
setLoading(false);

// Fetch event titles
const titles: Record<string, string> = {};

await Promise.all(
  list.map(async (r) => {
    if (!r.eventId || titles[r.eventId]) return;

    try {
      const evSnap = await getDoc(doc(db, "events", r.eventId));

      if (evSnap.exists()) {
        titles[r.eventId] =
          (evSnap.data() as any).title || r.eventId;
      }
    } catch {
      titles[r.eventId] = r.eventId;
    }
  })
);

setEventTitles(titles);
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
  {eventTitles[r.eventId] || r.eventId}
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

function StudentProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();

  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const isDirty = fullName.trim() !== (profile?.fullName ?? "").trim();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !isDirty) return;

    const clean = fullName.trim();

    if (clean.length < 2) {
      toast.push({
        type: "error",
        title: "Name too short",
        message: "Please enter your full name.",
      });
      return;
    }

    setSaving(true);
    setSuccess(false);

    try {
      await updateDoc(doc(db, "users", user.uid), {
        fullName: clean,
        updatedAt: serverTimestamp(),
      });

      await refreshProfile();

      setSuccess(true);

      toast.push({
        type: "success",
        title: "Profile updated",
        message: "Your name has been saved.",
      });
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Update failed",
        message: err?.message ?? "Unknown error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container">
        <div style={{ maxWidth: 560, margin: "0 auto" }}>

          <div className="card" style={{ marginBottom: 16 }}>
            <div className="cardBody">

              <div className="row">
                <span className="badge badgePrimary">Student</span>
                <span className="badge">Profile</span>

                <div className="spacer" />

                <Link className="btn btnGhost" to="/student">
                  Back
                </Link>
              </div>

              <h1 className="h1" style={{ marginTop: 12 }}>
                My Profile
              </h1>

              <p className="p">
                View and update your account details.
              </p>

            </div>
          </div>

          <div className="card">
            <div className="cardBody">

              <div className="listItem" style={{ marginBottom: 16 }}>
                <div className="small">Email (cannot be changed)</div>

                <div
                  style={{
                    fontWeight: 900,
                    color: "var(--primary)",
                    marginTop: 4,
                  }}
                >
                  {user?.email ?? "—"}
                </div>
              </div>

              <div className="listItem" style={{ marginBottom: 16 }}>
                <div className="small">Role</div>

                <div style={{ marginTop: 6 }}>
                  <span className="badge badgeSuccess">
                    {(profile?.role ?? "student").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="hr" />

              {success && (
                <div
                  className="notice noticeSuccess"
                  style={{ marginBottom: 12 }}
                >
                  Profile updated successfully!
                </div>
              )}

              <form onSubmit={handleSave}>

                <label className="label" htmlFor="fullName">
                  Full Name
                </label>

                <input
                  id="fullName"
                  className="input"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setSuccess(false);
                  }}
                  placeholder="Your full name"
                  autoComplete="name"
                  style={{ marginBottom: 8 }}
                />

                <div className="helper">
                  This name appears on attendance lists and registrations.
                </div>

                <div style={{ height: 16 }} />

                <button
                  className="btn btnPrimary btnWide"
                  type="submit"
                  disabled={saving || !isDirty}
                >
                  {saving
                    ? "Saving..."
                    : isDirty
                    ? "Save changes"
                    : "No changes"}
                </button>

              </form>

            </div>
          </div>

        </div>
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
      <Route path="/profile" element={<StudentProfilePage />} />
      <Route path="*" element={<Navigate to="/student" replace />} />
    </Routes>
  );
}



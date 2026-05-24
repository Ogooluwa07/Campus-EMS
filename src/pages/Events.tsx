import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getApprovedEvents } from "../services/eventService";
import type { Event } from "../types/event";
import SkeletonEventCard from "../components/SkeletonEventCard";
import EmptyState from "../components/EmptyState";
import { formatDateTime } from "../utils/format";
import { useAuth } from "../context/AuthContext";
import { collectionGroup, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { categoryGradient, categoryEmoji } from "../utils/categoryColors";

type QuickMode = "DISCOVER" | "REGISTER" | "ATTEND" | "RATE";

type RegDoc = {
  eventId: string;
  userId: string;
  status: string;
  checkedInAt: any;
  createdAt: any;
};

type FeedbackDoc = {
  eventId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: any;
};

function toText(v: any) {
  return (v ?? "").toString().toLowerCase();
}
function parseDate(v: any): number {
  try {
    if (!v) return 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v === "string") return new Date(v).getTime();
    if (typeof v?.toDate === "function") return v.toDate().getTime();
    if (typeof v?.seconds === "number") return v.seconds * 1000;
    return 0;
  } catch {
    return 0;
  }
}

export default function Events() {
  const { user, profile } = useAuth();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // UI state
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("ALL");
  const [sort, setSort] = useState<"NEWEST" | "OLDEST" | "TITLE">("NEWEST");

  // quick filters
  const [mode, setMode] = useState<QuickMode>("DISCOVER");

  // pagination
  const [pageSize] = useState(6);
  const [visibleCount, setVisibleCount] = useState(6);

  // student-only sets
  const [loadingStudentData, setLoadingStudentData] = useState(false);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [checkedInEventIds, setCheckedInEventIds] = useState<Set<string>>(new Set());
  const [feedbackEventIds, setFeedbackEventIds] = useState<Set<string>>(new Set());

  const isStudent = !!user && profile?.role === "student";
  const isStudentOnlyMode = mode === "REGISTER" || mode === "ATTEND" || mode === "RATE";

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getApprovedEvents();
        setEvents(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadStudentData = async () => {
      if (!isStudent) {
        setRegisteredEventIds(new Set());
        setCheckedInEventIds(new Set());
        setFeedbackEventIds(new Set());
        return;
      }

      setLoadingStudentData(true);
      try {
        // registrations
        const regQ = query(collectionGroup(db, "registrations"), where("userId", "==", user!.uid));
        const regSnap = await getDocs(regQ);
        const regs = regSnap.docs.map((d) => d.data() as RegDoc);

        const regSet = new Set<string>();
        const checkedSet = new Set<string>();
        regs.forEach((r) => {
          if (r.eventId) regSet.add(r.eventId);
          if (r.eventId && r.checkedInAt) checkedSet.add(r.eventId);
        });

        // feedback (optional: only works if you store feedback as events/{id}/feedback/{uid})
        const fbQ = query(collectionGroup(db, "feedback"), where("userId", "==", user!.uid));
        const fbSnap = await getDocs(fbQ);
        const fbs = fbSnap.docs.map((d) => d.data() as FeedbackDoc);

        const fbSet = new Set<string>();
        fbs.forEach((f) => {
          if (f.eventId) fbSet.add(f.eventId);
        });

        setRegisteredEventIds(regSet);
        setCheckedInEventIds(checkedSet);
        setFeedbackEventIds(fbSet);
      } catch {
        // no crash: RATE filter will just not find anything until feedback exists
        setRegisteredEventIds(new Set());
        setCheckedInEventIds(new Set());
        setFeedbackEventIds(new Set());
      } finally {
        setLoadingStudentData(false);
      }
    };

    loadStudentData();
  }, [isStudent, user]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      const c = (e.category || "General").toString().trim();
      if (c) set.add(c);
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const filtered = useMemo(() => {
    let list = [...events];

    // category
    if (category !== "ALL") list = list.filter((e) => (e.category || "General") === category);

    // search
    const queryText = q.trim().toLowerCase();
    if (queryText) {
      list = list.filter((e) => {
        const hay = [e.title, e.description, e.category, e.location].map(toText).join(" ");
        return hay.includes(queryText);
      });
    }

    // quick modes
    if (mode === "REGISTER") {
      if (!isStudent) return [];
      list = list.filter((e) => !registeredEventIds.has(e.id));
    }
    if (mode === "ATTEND") {
      if (!isStudent) return [];
      list = list.filter((e) => registeredEventIds.has(e.id) && !checkedInEventIds.has(e.id));
    }
    if (mode === "RATE") {
      if (!isStudent) return [];
      list = list.filter((e) => checkedInEventIds.has(e.id) && !feedbackEventIds.has(e.id));
    }

    // sort
    if (sort === "TITLE") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else {
      list.sort((a, b) => {
        const at = parseDate((a as any).createdAt);
        const bt = parseDate((b as any).createdAt);
        return sort === "NEWEST" ? bt - at : at - bt;
      });
    }

    return list;
  }, [events, q, category, sort, mode, isStudent, registeredEventIds, checkedInEventIds, feedbackEventIds]);

  const paged = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMore = visibleCount < filtered.length;

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [q, category, sort, mode, pageSize]);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardBody">
            {/* Functional chips */}
            <div className="row" style={{ gap: 10 }}>
              <button
                type="button"
                className={`badge ${mode === "DISCOVER" ? "badgePrimary" : ""}`}
                onClick={() => setMode("DISCOVER")}
                style={{ cursor: "pointer" }}
              >
                Discover
              </button>

              <button
                type="button"
                className={`badge ${mode === "REGISTER" ? "badgePrimary" : ""}`}
                onClick={() => setMode("REGISTER")}
                disabled={!isStudent}
                style={{ cursor: !isStudent ? "not-allowed" : "pointer", opacity: !isStudent ? 0.6 : 1 }}
                title={!isStudent ? "Login as STUDENT to use this filter" : ""}
              >
                Register
              </button>

              <button
                type="button"
                className={`badge ${mode === "ATTEND" ? "badgePrimary" : ""}`}
                onClick={() => setMode("ATTEND")}
                disabled={!isStudent}
                style={{ cursor: !isStudent ? "not-allowed" : "pointer", opacity: !isStudent ? 0.6 : 1 }}
                title={!isStudent ? "Login as STUDENT to use this filter" : ""}
              >
                Attend
              </button>

              <button
                type="button"
                className={`badge ${mode === "RATE" ? "badgePrimary" : ""}`}
                onClick={() => setMode("RATE")}
                disabled={!isStudent}
                style={{ cursor: !isStudent ? "not-allowed" : "pointer", opacity: !isStudent ? 0.6 : 1 }}
                title={!isStudent ? "Login as STUDENT to use this filter" : ""}
              >
                Rate
              </button>

              <div className="spacer" />
              {loadingStudentData && isStudent && <span className="badge badgeInfo">Syncing…</span>}
            </div>

            <h1 className="h1" style={{ marginTop: 12 }}>Approved Campus Events</h1>
            <p className="p">
              Search, filter and sort approved events. Quick filter: <b>{mode}</b>
              {!isStudent && isStudentOnlyMode ? " (Student only)" : ""}
            </p>

            <div className="toolbar">
              <div>
                <label className="label">Search</label>
                <input
                  className="input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by title, location, category..."
                />
                <div className="helper">Example: “seminar”, “sports”, “auditorium”.</div>
              </div>

              <div>
                <label className="label">Category</label>
                <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Sort</label>
                <select className="select" value={sort} onChange={(e) => setSort(e.target.value as any)}>
                  <option value="NEWEST">Newest</option>
                  <option value="OLDEST">Oldest</option>
                  <option value="TITLE">Title (A–Z)</option>
                </select>
              </div>

              <div>
                <label className="label">Quick actions</label>
                <div className="row">
                  <button
                    className="btn btnSoft"
                    onClick={() => {
                      setQ("");
                      setCategory("ALL");
                      setSort("NEWEST");
                      setMode("DISCOVER");
                    }}
                  >
                    Reset
                  </button>
                  <span className="badge badgeInfo">{filtered.length} result(s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid2">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonEventCard key={i} />)}
          </div>
        )}

        {!loading && error && <div className="notice noticeError">{error}</div>}

        {!loading && !error && !isStudent && isStudentOnlyMode && (
          <EmptyState
            title="Student feature"
            message="Login as a STUDENT to use Register / Attend / Rate quick filters."
            action={<Link className="btn btnPrimary" to="/login">Login</Link>}
          />
        )}

        {!loading && !error && (isStudent || mode === "DISCOVER") && filtered.length === 0 && (
          <EmptyState
            title="No events match this filter"
            message={
              mode === "REGISTER"
                ? "You have registered for all available events."
                : mode === "ATTEND"
                ? "No pending attendance. Register first, then get checked-in by an organizer."
                : mode === "RATE"
                ? "No events to rate yet."
                : "Try changing your search or filters."
            }
            action={<button className="btn btnSoft" onClick={() => setMode("DISCOVER")}>Back to Discover</button>}
          />
        )}

        {!loading && !error && (isStudent || mode === "DISCOVER") && filtered.length > 0 && (
          <>
            <div className="grid2">
              {paged.map((event) => (
                <div key={event.id} className="card">
                  <div className="cardBody">
                    <div className="bannerColoured" style={{ background: categoryGradient(event.category) }}>
  <span className="bannerEmoji">{categoryEmoji(event.category)}</span>
</div>

                    <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                      <span className="badge badgePrimary">{event.category || "Event"}</span>
                      <span className="badge badgeSuccess">APPROVED</span>
                    </div>

                    <div className="eventTitle">{event.title}</div>
                    <div className="eventDesc">{event.description}</div>

                    <div className="eventMeta">
                      <span>📍 {event.location || "TBA"}</span>
                      <span>🗓 {formatDateTime((event as any).startTime)}</span>
                      <span>👥 {event.capacity === 0 ? "Unlimited" : `Cap: ${event.capacity}`}</span>
                      <span>🧾 Registered: {event.registrationCount || 0}</span>
                    </div>

                    <div className="eventFooter">
                      <span className="small">Open to students after approval.</span>
                      <Link className="btn btnPrimary btnIcon" to={`/events/${event.id}`}>
                        View details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              {canLoadMore ? (
                <button className="btn btnPrimary" onClick={() => setVisibleCount((v) => v + pageSize)}>
                  Load more
                </button>
              ) : (
                <span className="badge">End of results</span>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}





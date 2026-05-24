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
import { categoryGradient, categoryEmoji } from "../utils/categoryColors";

type Tab = "PENDING" | "APPROVED" | "REJECTED" | "USERS";
type ModerationStatus = "APPROVED" | "REJECTED";
type UserRole = "student" | "organizer" | "admin";

type AppUser = {
  uid: string;
  fullName?: string;
  email?: string;
  role: UserRole;
  createdAt?: any;
};

function statusBadgeClass(status?: string) {
  if (status === "APPROVED") return "badge badgeSuccess";
  if (status === "REJECTED") return "badge badgeDanger";
  if (status === "PENDING") return "badge badgeWarn";
  return "badge";
}

function roleBadgeClass(role?: string) {
  if (role === "admin") return "badge badgeDanger";
  if (role === "organizer") return "badge badgePrimary";
  return "badge badgeSuccess";
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState<Tab>("PENDING");
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Users tab state
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [pendingRoles, setPendingRoles] = useState<Record<string, UserRole>>({});
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  const isAdmin = profile?.role === "admin";

  const [kpi, setKpi] = useState({
  pending: 0,
  approved: 0,
  rejected: 0,
  users: 0,
  loading: true,
});

useEffect(() => {
  if (!isAdmin) return;

  const fetchKpi = async () => {
    try {
      const [
        pendingSnap,
        approvedSnap,
        rejectedSnap,
        usersSnap,
      ] = await Promise.all([
        getDocs(
          query(
            collection(db, "events"),
            where("status", "==", "PENDING")
          )
        ),
        getDocs(
          query(
            collection(db, "events"),
            where("status", "==", "APPROVED")
          )
        ),
        getDocs(
          query(
            collection(db, "events"),
            where("status", "==", "REJECTED")
          )
        ),
        getDocs(collection(db, "users")),
      ]);

      setKpi({
        pending: pendingSnap.size,
        approved: approvedSnap.size,
        rejected: rejectedSnap.size,
        users: usersSnap.size,
        loading: false,
      });
    } catch {
      setKpi((k) => ({
        ...k,
        loading: false,
      }));
    }
  };

  fetchKpi();
}, [isAdmin]);

  // ── Events ──────────────────────────────────────────────
  const loadEvents = async (status: Tab) => {
    if (status === "USERS") return;
    try {
      setLoading(true);
      const q = query(
        collection(db, "events"),
        where("status", "==", status),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setEvents(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Event, "id">) })));
    } catch (err: any) {
      toast.push({ type: "error", title: "Failed to load events", message: err?.message ?? "Unknown error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    if (tab !== "USERS") loadEvents(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  const updateStatus = async (id: string, status: ModerationStatus) => {
    if (!isAdmin) return;
    try {
      setBusyId(id);
      await updateDoc(doc(db, "events", id), { status, updatedAt: serverTimestamp() });
      setEvents((prev) => prev.filter((e) => e.id !== id));
      toast.push({ type: "success", title: `Event ${status === "APPROVED" ? "approved" : "rejected"}`, message: "Status updated." });
    } catch (err: any) {
      toast.push({ type: "error", title: "Update failed", message: err?.message ?? "Unknown error" });
    } finally {
      setBusyId(null);
    }
  };

  // ── Users ────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<AppUser, "uid">) }));
      setUsers(list);
      const seeds: Record<string, UserRole> = {};
      list.forEach((u) => { seeds[u.uid] = u.role; });
      setPendingRoles(seeds);
    } catch (err: any) {
      toast.push({ type: "error", title: "Failed to load users", message: err?.message ?? "Unknown error" });
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin && tab === "USERS") loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  const saveUserRole = async (uid: string) => {
    const newRole = pendingRoles[uid];
    if (!newRole) return;
    setSavingUserId(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role: newRole, updatedAt: serverTimestamp() });
      setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, role: newRole } : u));
      toast.push({ type: "success", title: "Role updated", message: `User is now ${newRole}.` });
    } catch (err: any) {
      toast.push({ type: "error", title: "Failed to update role", message: err?.message ?? "Unknown error" });
    } finally {
      setSavingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const s = userSearch.trim().toLowerCase();
    if (!s) return true;
    return (
      (u.fullName ?? "").toLowerCase().includes(s) ||
      (u.email ?? "").toLowerCase().includes(s) ||
      u.role.toLowerCase().includes(s)
    );
  });

  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState title="Access denied" message="Only admins can view this dashboard." />
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container">

        {/* Header */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardBody">
            <div className="row">
              <span className="badge badgeDanger">Admin</span>
              <span className="badge">Moderation</span>
              <span className="badge">User Management</span>
            </div>
           // REPLACE WITH:
<h1 className="h1" style={{ marginTop: 12 }}>Admin Dashboard</h1>
<p className="p">Review event submissions and manage user roles.</p>

{/* KPI Cards */}
<div className="adminKpiGrid">
  <div className="kpiCard kpiCardAccent">
    <div className="kpiTop"><span className="kpiDot kpiDotWarn" /><span className="kpiTitle">Pending</span></div>
    <div className="kpiBig">{kpi.loading ? "…" : kpi.pending}</div>
  </div>
  <div className="kpiCard">
    <div className="kpiTop"><span className="kpiDot kpiDotSuccess" /><span className="kpiTitle">Approved</span></div>
    <div className="kpiBig">{kpi.loading ? "…" : kpi.approved}</div>
  </div>
  <div className="kpiCard">
    <div className="kpiTop"><span className="kpiDot kpiDotDanger" /><span className="kpiTitle">Rejected</span></div>
    <div className="kpiBig">{kpi.loading ? "…" : kpi.rejected}</div>
  </div>
  <div className="kpiCard">
    <div className="kpiTop"><span className="kpiDot kpiDotPrimary" /><span className="kpiTitle">Total Users</span></div>
    <div className="kpiBig">{kpi.loading ? "…" : kpi.users}</div>
  </div>
</div>

<div className="hr" />

            <div className="tabs">
              {(["PENDING", "APPROVED", "REJECTED"] as Tab[]).map((t) => (
                <button key={t} className={`tab ${tab === t ? "tabActive" : ""}`} onClick={() => setTab(t)}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
              <button className={`tab ${tab === "USERS" ? "tabActive" : ""}`} onClick={() => setTab("USERS")}>
                Users
              </button>
              <div className="spacer" />
              <span className="badge badgeWarn">Showing: {tab}</span>
              {tab !== "USERS" && (
                <button className="btn btnSoft" style={{ marginLeft: 12 }} onClick={() => loadEvents(tab)}>
                  Refresh
                </button>
              )}
              {tab === "USERS" && (
                <button className="btn btnSoft" style={{ marginLeft: 12 }} onClick={loadUsers}>
                  Refresh
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Events Tabs ── */}
        {tab !== "USERS" && (
          <>
            {loading ? (
              <div className="grid2">
                {Array.from({ length: 4 }).map((_, i) => <SkeletonEventCard key={i} />)}
              </div>
            ) : events.length === 0 ? (
              <EmptyState
                title={`No ${tab.toLowerCase()} events`}
                message="When organizers submit events, they will show up in Pending."
                action={<button className="btn btnSoft" onClick={() => loadEvents(tab)}>Refresh</button>}
              />
            ) : (
              <div className="grid2">
                {events.map((event) => (
                  <div key={event.id} className="card">
                    <div className="cardBody">
                     // REPLACE WITH:
<div className="bannerColoured" style={{ background: categoryGradient(event.category) }}>
  <span className="bannerEmoji">{categoryEmoji(event.category)}</span>
</div>
                      <div className="row" style={{ justifyContent: "space-between", marginTop: 12 }}>
                        <span className="badge badgePrimary">{event.category || "Event"}</span>
                        <span className={statusBadgeClass(event.status)}>{event.status}</span>
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
                        {tab === "PENDING" ? (
                          <div className="row">
                            <button className="btn btnPrimary" disabled={busyId === event.id} onClick={() => updateStatus(event.id, "APPROVED")}>
                              {busyId === event.id ? "Working..." : "Approve"}
                            </button>
                            <button className="btn btnDanger" disabled={busyId === event.id} onClick={() => updateStatus(event.id, "REJECTED")}>
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
          </>
        )}

        {/* ── Users Tab ── */}
        {tab === "USERS" && (
          <div className="card">
            <div className="cardHeader">
              <h2 className="h2">User Management</h2>
              <p className="p">Promote students to organizer or admin. Changes take effect immediately.</p>
            </div>
            <div className="cardBody">
              <input
                className="input"
                placeholder="Search by name, email, or role…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ marginBottom: 16 }}
              />

              {loadingUsers ? (
                <div className="notice">Loading users…</div>
              ) : filteredUsers.length === 0 ? (
                <EmptyState title="No users found" message="Try a different search term." />
              ) : (
                filteredUsers.map((u) => {
                  const pendingRole = pendingRoles[u.uid] ?? u.role;
                  const isDirty = pendingRole !== u.role;
                  return (
                    <div key={u.uid} className="listItem" style={{ marginBottom: 12 }}>
                      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 900, color: "var(--primary)" }}>
                            {u.fullName || "—"}
                          </div>
                          <div className="small" style={{ marginTop: 4 }}>{u.email || "—"}</div>
                        </div>
                        <span className={roleBadgeClass(u.role)}>{u.role.toUpperCase()}</span>
                      </div>

                      <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: "wrap" }}>
                        <select
                          className="select"
                          style={{ maxWidth: 180 }}
                          value={pendingRole}
                          onChange={(e) =>
                            setPendingRoles((prev) => ({ ...prev, [u.uid]: e.target.value as UserRole }))
                          }
                        >
                          <option value="student">Student</option>
                          <option value="organizer">Organizer</option>
                          <option value="admin">Admin</option>
                        </select>

                        <button
                          className="btn btnPrimary"
                          disabled={!isDirty || savingUserId === u.uid}
                          onClick={() => saveUserRole(u.uid)}
                        >
                          {savingUserId === u.uid ? "Saving..." : isDirty ? "Save role" : "No changes"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}



import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp,
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
  eventTitle: string;
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

  // Feedback states
  const [feedbackEventId, setFeedbackEventId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [submittedFeedback, setSubmittedFeedback] = useState<Set<string>>(new Set());

  const canUse = !!user && profile?.role === "student";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch all events then check each for a registration doc
      // This avoids needing a collectionGroup index
      const eventsSnap = await getDocs(
        query(collection(db, "events"), where("status", "==", "APPROVED"))
      );

      const results = await Promise.all(
        eventsSnap.docs.map(async (evDoc) => {
          const regRef = doc(db, "events", evDoc.id, "registrations", user.uid);
          const regSnap = await getDoc(regRef);
          if (!regSnap.exists()) return null;
          return {
            ...(regSnap.data() as Omit<MyReg, "eventTitle">),
            eventId: evDoc.id,
            eventTitle: (evDoc.data() as any).title || evDoc.id,
          } as MyReg;
        })
      );

      const list = results.filter(Boolean) as MyReg[];
      list.sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      setRegs(list);

      // Check which events already have feedback from this student
      const fbChecks = await Promise.all(
        list
          .filter((r) => r.checkedInAt)
          .map(async (r) => {
            const fbSnap = await getDocs(
              query(
                collection(db, "events", r.eventId, "feedback"),
                where("userId", "==", user.uid)
              )
            );
            return fbSnap.empty ? null : r.eventId;
          })
      );
      setSubmittedFeedback(new Set(fbChecks.filter(Boolean) as string[]));
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

  const submitFeedback = async () => {
    if (!user || !feedbackEventId || rating === 0) {
      toast.push({ type: "error", title: "Incomplete", message: "Please select a star rating before submitting." });
      return;
    }
    setSubmittingFeedback(true);
    try {
      await addDoc(collection(db, "events", feedbackEventId, "feedback"), {
        userId: user.uid,
        rating,
        comment: comment.trim(),
        createdAt: serverTimestamp(),
      });
      setSubmittedFeedback((prev) => new Set([...prev, feedbackEventId]));
      setFeedbackEventId(null);
      setRating(0);
      setComment("");
      toast.push({ type: "success", title: "Feedback submitted", message: "Thank you for your review!" });
    } catch (err: any) {
      toast.push({ type: "error", title: "Feedback failed", message: err?.message ?? String(err) });
    } finally {
      setSubmittingFeedback(false);
    }
  };

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
            <h1 className="h1" style={{ marginTop: 12 }}>My Registrations</h1>
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
            <div key={r.eventId} className="listItem" style={{ marginBottom: 12 }}>
              {/* Event title + attendance badge */}
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontWeight: 900, color: "var(--primary)", fontSize: 16 }}>
                  {r.eventTitle}
                </div>
                <span className={r.checkedInAt ? "badge badgeSuccess" : "badge badgeWarn"}>
                  {r.checkedInAt ? "✓ ATTENDED" : "NOT ATTENDED YET"}
                </span>
              </div>

              {/* Registration details */}
              <div className="small" style={{ marginTop: 8, color: "var(--muted)" }}>
                Status: <strong>{r.status || "—"}</strong> &nbsp;•&nbsp;
                Registered: {r.createdAt ? formatDateTime(r.createdAt) : "—"}
              </div>
              {r.checkedInAt && (
                <div className="small" style={{ marginTop: 4, color: "var(--muted)" }}>
                  Attended: {formatDateTime(r.checkedInAt)}
                </div>
              )}

              {/* Feedback section — only show after attendance confirmed */}
              {r.checkedInAt && (
                <div style={{ marginTop: 12 }}>
                  {submittedFeedback.has(r.eventId) ? (
                    <span className="badge badgeSuccess">✓ Feedback submitted</span>
                  ) : feedbackEventId === r.eventId ? (
                    // Inline feedback form
                    <div style={{
                      marginTop: 8, padding: 14, borderRadius: 12,
                      background: "var(--bg)", border: "1px solid var(--border)",
                    }}>
                      <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
                        Leave a review for this event
                      </div>

                      {/* Star rating */}
                      <div className="row" style={{ gap: 6, marginBottom: 10 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            style={{
                              fontSize: 26, background: "none", border: "none",
                              cursor: "pointer", padding: 2,
                              opacity: star <= rating ? 1 : 0.3,
                              transition: "opacity 0.1s",
                            }}
                          >
                            ⭐
                          </button>
                        ))}
                        {rating > 0 && (
                          <span className="small" style={{ marginLeft: 6 }}>{rating}/5</span>
                        )}
                      </div>

                      <textarea
                        className="input"
                        placeholder="Write your comment (optional)..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={3}
                        style={{ resize: "vertical", marginBottom: 10 }}
                      />

                      <div className="row" style={{ gap: 8 }}>
                        <button
                          className="btn btnPrimary"
                          disabled={submittingFeedback || rating === 0}
                          onClick={submitFeedback}
                        >
                          {submittingFeedback ? "Submitting..." : "Submit Feedback"}
                        </button>
                        <button
                          className="btn btnGhost"
                          onClick={() => { setFeedbackEventId(null); setRating(0); setComment(""); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btnSoft"
                      onClick={() => { setFeedbackEventId(r.eventId); setRating(0); setComment(""); }}
                    >
                      ⭐ Leave Feedback
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
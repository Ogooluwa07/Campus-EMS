import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import type { Event } from "../types/event";
import { formatDateTime } from "../utils/format";
import { useToast } from "../context/ToastContext";

type RegDoc = {
  userId: string;
  eventId: string;
  status: string;
  createdAt: any;
  checkedInAt: any;
};

export default function EventDetails() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [reg, setReg] = useState<RegDoc | null>(null);

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const isStudent = !!user && profile?.role === "student";
  const attendanceConfirmed = !!reg?.checkedInAt;

  const load = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const evSnap = await getDoc(doc(db, "events", id));
      if (!evSnap.exists()) {
        setEvent(null);
        return;
      }

      const ev = { id: evSnap.id, ...(evSnap.data() as Omit<Event, "id">) };
      setEvent(ev);

      if (user) {
        const regSnap = await getDoc(
          doc(db, "events", id, "registrations", user.uid)
        );

        setReg(regSnap.exists() ? (regSnap.data() as RegDoc) : null);
      } else {
        setReg(null);
      }
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Failed to load",
        message: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [id, user?.uid]);

  const handleRegister = async () => {
    if (!id || !user) return;

    try {
      const regRef = doc(db, "events", id, "registrations", user.uid);

      // prevent duplicate writes
      const existing = await getDoc(regRef);
      if (existing.exists()) {
        toast.push({
          type: "info",
          title: "Already registered",
          message: "You are already registered for this event.",
        });
        return;
      }

      await setDoc(regRef, {
        userId: user.uid,
        eventId: id,
        status: "REGISTERED",
        createdAt: serverTimestamp(),
        checkedInAt: null,
      });

      toast.push({
        type: "success",
        title: "Registered",
        message: "You have successfully registered.",
      });

      await load();
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Registration failed",
        message: err.message,
      });
    }
  };

  const submitFeedback = async () => {
    if (!id || !user) return;

    setSubmittingFeedback(true);

    try {
      const regSnap = await getDoc(
        doc(db, "events", id, "registrations", user.uid)
      );

      const regData = regSnap.exists()
        ? (regSnap.data() as RegDoc)
        : null;

      if (!regData?.checkedInAt) {
        toast.push({
          type: "error",
          title: "Attendance not confirmed",
          message:
            "You must be checked-in by the organizer before submitting feedback.",
        });
        return;
      }

      await setDoc(doc(db, "events", id, "feedback", user.uid), {
        userId: user.uid,
        eventId: id,
        rating: Number(rating),
        comment,
        createdAt: serverTimestamp(),
      });

      toast.push({
        type: "success",
        title: "Feedback submitted",
        message: "Thanks for your feedback!",
      });

      setComment("");
    } catch (err: any) {
      toast.push({
        type: "error",
        title: "Feedback failed",
        message: err.message,
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="notice">Loading…</div>
        </div>
      </>
    );
  }

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="container">
          <EmptyState
            title="Event not found"
            message="This event may have been removed."
            action={
              <Link className="btn btnPrimary" to="/">
                Back
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
        <div className="card">
          <div className="cardBody">
            <div
              className="row"
              style={{ justifyContent: "space-between" }}
            >
              <span className="badge badgePrimary">
                {event.category || "Event"}
              </span>
              <span className="badge badgeSuccess">
                {event.status}
              </span>
            </div>

            <h1 className="h1" style={{ marginTop: 12 }}>
              {event.title}
            </h1>
            <p className="p">{event.description}</p>

            <div className="eventMeta" style={{ marginTop: 10 }}>
              <span>📍 {event.location || "TBA"}</span>
              <span>
                🗓 {formatDateTime((event as any).startTime)}
              </span>
              <span>
                👥{" "}
                {event.capacity === 0
                  ? "Unlimited"
                  : `Cap: ${event.capacity}`}
              </span>
            </div>

            <div className="hr" />

            {!user ? (
              <EmptyState
                title="Login required"
                message="Login to register and submit feedback."
                action={
                  <Link className="btn btnPrimary" to="/login">
                    Login
                  </Link>
                }
              />
            ) : (
              <>
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 900,
                        color: "var(--primary)",
                      }}
                    >
                      Registration
                    </div>
                    <div className="small">
                      {reg
                        ? "You are registered."
                        : "You are not registered."}
                    </div>
                  </div>

                  {isStudent && !reg && (
                    <button
                      className="btn btnPrimary"
                      onClick={handleRegister}
                    >
                      Register
                    </button>
                  )}

                  {reg && (
                    <span
                      className={
                        attendanceConfirmed
                          ? "badge badgeSuccess"
                          : "badge badgeWarn"
                      }
                    >
                      {attendanceConfirmed
                        ? "ATTENDANCE CONFIRMED"
                        : "NOT CHECKED IN"}
                    </span>
                  )}
                </div>

                <div className="hr" />

                <div>
                  <div
                    style={{
                      fontWeight: 900,
                      color: "var(--primary)",
                    }}
                  >
                    Feedback
                  </div>

                  <div className="small" style={{ marginTop: 4 }}>
                    Feedback is allowed only after attendance is
                    confirmed by the organizer.
                  </div>

                  <div style={{ height: 12 }} />

                  <label className="label">Rating (1–5)</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={5}
                    value={rating}
                    onChange={(e) =>
                      setRating(Number(e.target.value))
                    }
                  />

                  <div style={{ height: 12 }} />

                  <label className="label">Comment</label>
                  <textarea
                    className="textarea"
                    value={comment}
                    onChange={(e) =>
                      setComment(e.target.value)
                    }
                    placeholder="Write a short review..."
                  />

                  <div style={{ height: 12 }} />

                  <button
                    className="btn btnPrimary"
                    onClick={submitFeedback}
                    disabled={
                      !reg ||
                      !attendanceConfirmed ||
                      submittingFeedback
                    }
                  >
                    {submittingFeedback
                      ? "Submitting..."
                      : "Submit feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}


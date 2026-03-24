import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import EmptyState from "../components/EmptyState";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Event as CemsEvent } from "../types/event";
import { useNavigate } from "react-router-dom";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

function toDate(v: any): Date | null {
  try {
    if (!v) return null;
    if (typeof v?.toDate === "function") return v.toDate();
    if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
    if (v instanceof Date) return v;
    if (typeof v === "string") return new Date(v);
    return null;
  } catch {
    return null;
  }
}

export default function CalendarPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<CemsEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const q1 = query(collection(db, "events"), where("status", "==", "APPROVED"));
        const snap = await getDocs(q1);

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CemsEvent, "id">),
        }));

        setEvents(list);
      } catch (err: any) {
        setError(err?.message || "Failed to load events.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const calendarEvents = useMemo(() => {
    return events
      .map((ev) => {
        const start = toDate((ev as any).startTime);
        const end = toDate((ev as any).endTime);

        // FullCalendar needs ISO strings or Date objects
        return {
          id: ev.id,
          title: ev.title || "Event",
          start: start ?? undefined,
          end: end ?? undefined,
          extendedProps: {
            category: ev.category || "Event",
            location: ev.location || "TBA",
          },
        };
      })
      .filter((e) => !!e.start);
  }, [events]);

  return (
    <>
      <Navbar />
      <div className="container">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardBody">
            <div className="row" style={{ gap: 10 }}>
              <span className="badge badgePrimary">Calendar</span>
              <span className="badge">Approved Events</span>
              <div className="spacer" />
              <span className="badge badgeInfo">{events.length} event(s)</span>
            </div>

            <h1 className="h1" style={{ marginTop: 12 }}>Event Calendar</h1>
            <p className="p">
              View approved events by date. Click an event to open its details page.
            </p>
          </div>
        </div>

        {loading && <div className="notice">Loading calendar…</div>}
        {!loading && error && <div className="notice noticeError">{error}</div>}

        {!loading && !error && calendarEvents.length === 0 && (
          <EmptyState
            title="No approved events yet"
            message="Once events are approved, they will appear on the calendar."
          />
        )}

        {!loading && !error && calendarEvents.length > 0 && (
          <div className="card">
            <div className="cardBody calendarWrap">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                height="auto"
                events={calendarEvents as any}
                eventClick={(info) => {
                  const id = info.event.id;
                  if (id) navigate(`/events/${id}`);
                }}
                eventDidMount={(arg) => {
                  // Tooltip (simple)
                  const ext: any = arg.event.extendedProps || {};
                  arg.el.title = `${arg.event.title}\n${ext.category} • ${ext.location}`;
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

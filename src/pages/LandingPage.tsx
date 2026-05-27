import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FEATURES = [
  {
    icon: "🗓",
    title: "Event Discovery",
    desc: "Browse all approved campus events in one place. Filter by category, date, or location to find what matters to you.",
    color: "#1E3A8A",
    accent: "#3B82F6",
  },
  {
    icon: "✅",
    title: "One-Click Registration",
    desc: "Register for events instantly. Track your approval status in real-time directly from your student dashboard.",
    color: "#134E4A",
    accent: "#10B981",
  },
  {
    icon: "🎤",
    title: "Organizer Tools",
    desc: "Create and manage events, track registrations, mark attendance, and collect feedback — all in one dashboard.",
    color: "#581C87",
    accent: "#A855F7",
  },
  {
    icon: "🛡",
    title: "Admin Control",
    desc: "Approve or reject events, manage user roles, and keep a full overview of campus activity with KPI summaries.",
    color: "#7F1D1D",
    accent: "#EF4444",
  },
];

const STEPS = [
  { num: "01", title: "Create an account", desc: "Register with your campus email in under a minute.", color: "#2F80ED" },
  { num: "02", title: "Browse events", desc: "Explore all upcoming approved campus events.", color: "#10B981" },
  { num: "03", title: "Register", desc: "Register for any event with a single click.", color: "#A855F7" },
  { num: "04", title: "Attend", desc: "Show up, get marked, and earn your attendance record.", color: "#F59E0B" },
];

const STATS = [
  { value: "3", label: "User Roles", sub: "Student · Organizer · Admin" },
  { value: "∞", label: "Events Supported", sub: "No limits on the platform" },
  { value: "100%", label: "Real-time", sub: "Live status updates" },
  { value: "Free", label: "For Everyone", sub: "Open to all campus users" },
];

export default function LandingPage() {
  const { user, profile } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [visible, setVisible] = useState<Set<string>>(new Set());
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setVisible((v) => new Set([...v, e.target.id]));
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const dashboardLink =
    !user || !profile ? "/login"
    : profile.role === "admin" ? "/admin"
    : profile.role === "organizer" ? "/organizer"
    : "/student";

  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, sans-serif", background: "var(--bg)", overflowX: "hidden" }}>

      {/* ── Floating Navbar ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 24px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "none",
        transition: "all 0.3s ease",
        boxShadow: scrolled ? "var(--shadow)" : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: 900, fontSize: 18, color: "var(--primary)" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, var(--primary), var(--accent))",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>🎓</div>
          Campus CEMS
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {user ? (
            <Link to={dashboardLink} style={{
              padding: "10px 22px", borderRadius: 12,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              color: "#fff", fontWeight: 900, fontSize: 14, textDecoration: "none",
            }}>Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={{
                padding: "10px 18px", borderRadius: 12,
                border: "1px solid var(--border)",
                color: "var(--primary)", fontWeight: 900, fontSize: 14,
                textDecoration: "none", background: "rgba(255,255,255,0.8)",
              }}>Login</Link>
              <Link to="/register" style={{
                padding: "10px 22px", borderRadius: 12,
                background: "linear-gradient(135deg, var(--primary), var(--accent))",
                color: "#fff", fontWeight: 900, fontSize: 14, textDecoration: "none",
              }}>Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section ref={heroRef} style={{
        minHeight: "100vh",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "100px 24px 60px", position: "relative", overflow: "hidden",
        background: `
          radial-gradient(800px 600px at 80% 20%, rgba(47,128,237,0.12), transparent 60%),
          radial-gradient(600px 500px at 10% 80%, rgba(11,45,91,0.10), transparent 55%),
          var(--bg)
        `,
      }}>
        <div style={{
          position: "absolute", top: "15%", right: "8%",
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(47,128,237,0.12), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "5%",
          width: 240, height: 240, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(11,45,91,0.08), transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 820, textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 100,
            background: "rgba(47,128,237,0.10)", border: "1px solid rgba(47,128,237,0.20)",
            color: "var(--accent)", fontWeight: 700, fontSize: 13, marginBottom: 28,
            animation: "fadeUp 0.6s ease both",
          }}>
            🎓 Campus Event Management System
          </div>

          <h1 style={{
            fontSize: "clamp(38px, 7vw, 72px)",
            fontWeight: 1000, lineHeight: 1.08,
            color: "var(--primary)", margin: "0 0 24px",
            letterSpacing: "-2px",
            animation: "fadeUp 0.6s 0.1s ease both",
          }}>
            Your Campus Events,{" "}
            <span style={{
              background: "linear-gradient(135deg, var(--accent), #6366F1)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Organised.
            </span>
          </h1>

          <p style={{
            fontSize: "clamp(16px, 2.5vw, 20px)",
            color: "var(--muted)", lineHeight: 1.65,
            maxWidth: 580, margin: "0 auto 40px",
            animation: "fadeUp 0.6s 0.2s ease both",
          }}>
            Discover, register, and attend campus events with ease.
            Organisers create events. Admins approve them. Students register in one click.
          </p>

          <div style={{
            display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap",
            animation: "fadeUp 0.6s 0.3s ease both",
          }}>
            <Link to="/register" style={{
              padding: "16px 36px", borderRadius: 14,
              background: "linear-gradient(135deg, var(--primary), var(--accent))",
              color: "#fff", fontWeight: 900, fontSize: 16, textDecoration: "none",
              boxShadow: "0 8px 30px rgba(47,128,237,0.30)",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
            >
              Get Started — It's Free
            </Link>
            <Link to="/login" style={{
              padding: "16px 36px", borderRadius: 14,
              background: "rgba(255,255,255,0.9)", border: "1px solid var(--border)",
              color: "var(--primary)", fontWeight: 900, fontSize: 16, textDecoration: "none",
              transition: "transform 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}
            >
              Sign In
            </Link>
          </div>

          <div style={{
            display: "flex", gap: 10, justifyContent: "center",
            marginTop: 48, flexWrap: "wrap",
            animation: "fadeUp 0.6s 0.4s ease both",
          }}>
            {[
              { role: "Student", color: "#10B981", bg: "rgba(16,185,129,0.10)", icon: "👨‍🎓" },
              { role: "Organiser", color: "#3B82F6", bg: "rgba(59,130,246,0.10)", icon: "🎤" },
              { role: "Admin", color: "#EF4444", bg: "rgba(239,68,68,0.10)", icon: "🛡" },
            ].map(({ role, color, bg, icon }) => (
              <div key={role} style={{
                padding: "8px 18px", borderRadius: 100,
                background: bg, border: `1px solid ${color}30`,
                color, fontWeight: 700, fontSize: 13,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {icon} {role}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <section style={{
        background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)",
        padding: "48px 24px",
      }}>
        <div style={{
          maxWidth: 1000, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 32, textAlign: "center",
        }}>
          {STATS.map(({ value, label, sub }) => (
            <div key={label}>
              <div style={{ fontSize: 42, fontWeight: 1000, color: "#fff", letterSpacing: "-1px" }}>{value}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.90)", marginTop: 4 }}>{label}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.60)", marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: "96px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div id="features" data-animate style={{
          textAlign: "center", marginBottom: 64,
          opacity: visible.has("features") ? 1 : 0,
          transform: visible.has("features") ? "none" : "translateY(30px)",
          transition: "all 0.6s ease",
        }}>
          <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
            FEATURES
          </div>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "var(--primary)", margin: 0, letterSpacing: "-1px" }}>
            Everything your campus needs
          </h2>
          <p style={{ color: "var(--muted)", fontSize: 17, marginTop: 12, lineHeight: 1.6 }}>
            Built for students, organisers, and administrators.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
          {FEATURES.map(({ icon, title, desc, color, accent }, i) => (
            <div key={title} id={`feat-${i}`} data-animate style={{
              padding: 28, borderRadius: 20,
              background: "var(--card)", border: "1px solid var(--border)",
              boxShadow: "var(--shadow)",
              opacity: visible.has(`feat-${i}`) ? 1 : 0,
              transform: visible.has(`feat-${i}`) ? "none" : "translateY(30px)",
              transition: `all 0.5s ${i * 0.1}s ease`,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14, marginBottom: 18,
                background: `linear-gradient(135deg, ${color}, ${accent})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24,
              }}>{icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: "var(--primary)", margin: "0 0 10px" }}>{title}</h3>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.65, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section style={{
        padding: "96px 24px",
        background: `radial-gradient(900px 500px at 50% 50%, rgba(47,128,237,0.06), transparent 65%), var(--bg)`,
      }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div id="how" data-animate style={{
            textAlign: "center", marginBottom: 64,
            opacity: visible.has("how") ? 1 : 0,
            transform: visible.has("how") ? "none" : "translateY(30px)",
            transition: "all 0.6s ease",
          }}>
            <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: 13, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 900, color: "var(--primary)", margin: 0, letterSpacing: "-1px" }}>
              Up and running in 4 steps
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {STEPS.map(({ num, title, desc, color }, i) => (
              <div key={num} id={`step-${i}`} data-animate style={{
                textAlign: "center", padding: "32px 20px",
                background: "var(--card)", borderRadius: 20,
                border: "1px solid var(--border)", boxShadow: "var(--shadow)",
                opacity: visible.has(`step-${i}`) ? 1 : 0,
                transform: visible.has(`step-${i}`) ? "none" : "translateY(30px)",
                transition: `all 0.5s ${i * 0.12}s ease`,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%", margin: "0 auto 18px",
                  background: `${color}18`, border: `2px solid ${color}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, fontWeight: 900, color,
                }}>{num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 900, color: "var(--primary)", margin: "0 0 8px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section id="cta" data-animate style={{
        margin: "0 24px 96px",
        maxWidth: 1052, marginLeft: "auto", marginRight: "auto",
        borderRadius: 24, overflow: "hidden",
        background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 50%, #6366F1 100%)",
        padding: "72px 40px", textAlign: "center", position: "relative",
        opacity: visible.has("cta") ? 1 : 0,
        transform: visible.has("cta") ? "none" : "translateY(30px)",
        transition: "all 0.6s ease",
      }}>
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: "-1px" }}>
            Ready to get started?
          </h2>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.80)", marginBottom: 36, lineHeight: 1.6 }}>
            Join your campus community. Register for free and start discovering events today.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register" style={{
              padding: "16px 40px", borderRadius: 14,
              background: "#fff", color: "var(--primary)",
              fontWeight: 900, fontSize: 16, textDecoration: "none",
              boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
              transition: "transform 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}
            >
              Create an Account
            </Link>
            <Link to="/login" style={{
              padding: "16px 40px", borderRadius: 14,
              background: "rgba(255,255,255,0.15)", color: "#fff",
              border: "1px solid rgba(255,255,255,0.30)",
              fontWeight: 900, fontSize: 16, textDecoration: "none",
              transition: "transform 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "32px 24px", textAlign: "center",
        color: "var(--muted)", fontSize: 14,
      }}>
        <div style={{ fontWeight: 900, color: "var(--primary)", fontSize: 16, marginBottom: 8 }}>
          🎓 Campus CEMS
        </div>
        <div>Campus Event Management System · Built with React & Firebase</div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 24 }}>
          <Link to="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>Login</Link>
          <Link to="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>Register</Link>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
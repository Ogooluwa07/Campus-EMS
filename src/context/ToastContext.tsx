import React, { createContext, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type ToastCtx = {
  push: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastCtx | null>(null);

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push: ToastCtx["push"] = (t) => {
    const id = uid();
    const toast: Toast = { id, ...t };
    setToasts((prev) => [toast, ...prev].slice(0, 4)); // keep max 4

    // auto-remove
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  };

  const value = useMemo(() => ({ push }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onClose={(id) => setToasts((p) => p.filter((t) => t.id !== id))} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function ToastViewport({
  toasts,
  onClose,
}: {
  toasts: Toast[];
  onClose: (id: string) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        width: 340,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="card"
          style={{
            borderLeft: `6px solid ${
              t.type === "success" ? "var(--success)" : t.type === "error" ? "var(--danger)" : "var(--info)"
            }`,
          }}
        >
          <div className="cardBody" style={{ padding: 14 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div style={{ fontWeight: 1100, color: "var(--primary)" }}>{t.title}</div>
              <button className="btn btnGhost" style={{ padding: "6px 10px" }} onClick={() => onClose(t.id)}>
                ✕
              </button>
            </div>
            {t.message && <div className="p" style={{ marginTop: 6 }}>{t.message}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

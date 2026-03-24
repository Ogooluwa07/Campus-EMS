export default function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="cardBody">
        <div className="emptyWrap">
          <svg className="emptySvg" viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25 120C25 88 52 62 85 62h50c33 0 60 26 60 58v4H25v-4z" fill="rgba(47,128,237,0.12)"/>
            <path d="M55 62c0-22 18-40 40-40h30c22 0 40 18 40 40v6H55v-6z" fill="rgba(11,45,91,0.16)"/>
            <path d="M70 104h80" stroke="rgba(11,45,91,0.35)" strokeWidth="10" strokeLinecap="round"/>
            <path d="M82 126h56" stroke="rgba(11,45,91,0.25)" strokeWidth="10" strokeLinecap="round"/>
            <circle cx="170" cy="46" r="18" fill="rgba(47,128,237,0.22)"/>
            <circle cx="45" cy="40" r="12" fill="rgba(245,158,11,0.22)"/>
          </svg>

          <div style={{ fontSize: 18, fontWeight: 1100, color: "var(--primary)" }}>{title}</div>
          <div className="p">{message}</div>
          {action && <div style={{ marginTop: 10 }}>{action}</div>}
        </div>
      </div>
    </div>
  );
}

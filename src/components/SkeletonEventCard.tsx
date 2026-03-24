export default function SkeletonEventCard() {
  return (
    <div className="card">
      <div className="cardBody">
        <div className="skeleton skelBanner" />
        <div className="skeleton skelLine lg" />
        <div className="skeleton skelLine md" />
        <div className="skeleton skelLine sm" />
        <div className="hr" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 12 }} />
          <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}


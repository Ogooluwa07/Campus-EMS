export function categoryGradient(category?: string): string {
  const map: Record<string, string> = {
    "Academic":              "linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)",
    "Sports":                "linear-gradient(135deg, #14532D 0%, #22C55E 100%)",
    "Cultural":              "linear-gradient(135deg, #581C87 0%, #C026D3 100%)",
    "Technology":            "linear-gradient(135deg, #0F172A 0%, #1D4ED8 100%)",
    "Health & Wellness":     "linear-gradient(135deg, #134E4A 0%, #10B981 100%)",
    "Career & Professional": "linear-gradient(135deg, #78350F 0%, #F59E0B 100%)",
    "Social":                "linear-gradient(135deg, #831843 0%, #EC4899 100%)",
    "Workshop":              "linear-gradient(135deg, #1E1B4B 0%, #6366F1 100%)",
    "Seminar":               "linear-gradient(135deg, #064E3B 0%, #059669 100%)",
    "Competition":           "linear-gradient(135deg, #7F1D1D 0%, #EF4444 100%)",
    "Fundraiser":            "linear-gradient(135deg, #7C2D12 0%, #F97316 100%)",
    "General":               "linear-gradient(135deg, #0B2D5B 0%, #2F80ED 100%)",
  };
  return map[category ?? ""] ?? map["General"];
}

export function categoryEmoji(category?: string): string {
  const map: Record<string, string> = {
    "Academic": "📚", "Sports": "⚽", "Cultural": "🎭",
    "Technology": "💻", "Health & Wellness": "🏃", "Career & Professional": "💼",
    "Social": "🎉", "Workshop": "🛠️", "Seminar": "🎤",
    "Competition": "🏆", "Fundraiser": "💛", "General": "📌",
  };
  return map[category ?? ""] ?? "📌";
}
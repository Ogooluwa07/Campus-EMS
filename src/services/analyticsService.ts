import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export type EventAnalytics = {
  registrations: number;
  attendance: number;
  attendanceRate: number; // %
  feedbackCount: number;
  averageRating: number; // 0-5
};

export async function getEventAnalytics(eventId: string): Promise<EventAnalytics> {
  // Registrations
  const regsRef = collection(db, "events", eventId, "registrations");
  const regsSnap = await getDocs(regsRef);

  let registrations = 0;
  let attendance = 0;

  regsSnap.forEach((d) => {
    registrations += 1;
    const data = d.data() as any;
    if (data.checkedInAt) attendance += 1;
  });

  const attendanceRate =
    registrations === 0 ? 0 : Math.round((attendance / registrations) * 100);

  // Feedback
  const fbRef = collection(db, "events", eventId, "feedback");
  const fbSnap = await getDocs(fbRef);

  let feedbackCount = 0;
  let ratingSum = 0;

  fbSnap.forEach((d) => {
    feedbackCount += 1;
    const data = d.data() as any;
    ratingSum += Number(data.rating || 0);
  });

  const averageRating =
    feedbackCount === 0 ? 0 : Math.round((ratingSum / feedbackCount) * 10) / 10;

  return {
    registrations,
    attendance,
    attendanceRate,
    feedbackCount,
    averageRating,
  };
}

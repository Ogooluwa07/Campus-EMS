import { db } from "../firebase";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

export async function submitFeedback(
  eventId: string,
  userId: string,
  rating: number,
  comment: string
) {
  const feedbackRef = doc(db, "events", eventId, "feedback", userId);
  const regRef = doc(db, "events", eventId, "registrations", userId);

  return runTransaction(db, async (tx) => {
    const regSnap = await tx.get(regRef);
    if (!regSnap.exists()) {
      throw new Error("You did not attend this event.");
    }

    const reg = regSnap.data() as any;
    if (!reg.checkedInAt) {
      throw new Error("Attendance not confirmed. Cannot submit feedback.");
    }

    const fbSnap = await tx.get(feedbackRef);
    if (fbSnap.exists()) {
      throw new Error("You have already submitted feedback.");
    }

    tx.set(feedbackRef, {
      userId,
      eventId,
      rating,
      comment,
      createdAt: serverTimestamp(),
    });

    return { ok: true };
  });
}

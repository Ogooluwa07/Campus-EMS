import { db } from "../firebase";
import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

export async function registerForEvent(eventId: string, userId: string) {
  const eventRef = doc(db, "events", eventId);
  const regRef = doc(db, "events", eventId, "registrations", userId);

  return runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists()) throw new Error("Event not found");

    const event = eventSnap.data() as any;

    // Only allow registration for APPROVED events
    if (event.status !== "APPROVED") {
      throw new Error("This event is not open for registration.");
    }

    const regSnap = await tx.get(regRef);
    if (regSnap.exists()) {
      throw new Error("You have already registered for this event.");
    }

    const capacity = Number(event.capacity || 0); // 0 means unlimited
    const currentCount = Number(event.registrationCount || 0);

    if (capacity > 0 && currentCount >= capacity) {
      throw new Error("Event is full. Registration closed.");
    }

    // Create registration doc
    tx.set(regRef, {
      userId,
      eventId,
      status: "REGISTERED",
      checkedInAt: null,
      createdAt: serverTimestamp(),
    });

    // Increment registrationCount
    tx.update(eventRef, {
      registrationCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    });

    return { ok: true };
  });
}

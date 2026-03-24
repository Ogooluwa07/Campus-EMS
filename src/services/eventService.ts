import { db } from "../firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import type { Event } from "../types/event";

export async function getApprovedEvents(): Promise<Event[]> {
  const q = query(
    collection(db, "events"),
    where("status", "==", "APPROVED"),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Event, "id">),
  }));
}


import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore/lite";
import { db } from "./firebase/client";
import { IGiveaway } from "@/interface/giveaway";

const GIVEAWAY_COLLECTION = "giveaways";

const getAllGiveaway = async (): Promise<IGiveaway[]> => {
  const ref = collection(db, GIVEAWAY_COLLECTION);
  const q = query(ref, orderBy("expiredAt", "desc"));
  const res = await getDocs(q);
  const datas = res.docs.map((u) => ({ ...u.data(), id: u.id } as IGiveaway));
  return datas;
};

const createGiveaway = async (data: IGiveaway): Promise<void> => {
  const ref = collection(db, GIVEAWAY_COLLECTION);
  await addDoc(ref, data);
};

const updateTotalJoinUser = async (
  id: string,
  address: string
): Promise<IGiveaway> => {
  const eventRef = doc(db, GIVEAWAY_COLLECTION, id);
  const eventRes = await getDoc(eventRef);

  await updateDoc(eventRef, {
    totalTicketBought: eventRes.data()!.totalTicketBought + 1,
  });

  return { ...eventRes.data()!, id: eventRes.id } as IGiveaway;
};

const getGiveaway = async (id: string): Promise<IGiveaway> => {
  const eventRef = doc(db, GIVEAWAY_COLLECTION, id);
  const eventRes = await getDoc(eventRef);

  return { ...eventRes.data()!, id: eventRes.id } as IGiveaway;
};

export { getAllGiveaway, createGiveaway, updateTotalJoinUser, getGiveaway };

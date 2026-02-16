import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { app } from "@/lib/firebase";

const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };

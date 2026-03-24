import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBhb8b_3tbA_XWHMm2rsaIjk49f1Pe0_Jw",
  authDomain: "campus-ems.firebaseapp.com",
  projectId: "campus-ems",
  storageBucket: "campus-ems.firebasestorage.app",
  messagingSenderId: "448508629705",
  appId: "1:448508629705:web:7aca806c3fc2eec2f5f318"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

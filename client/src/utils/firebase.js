import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "hireox-2a852.firebaseapp.com",
  projectId: "hireox-2a852",
  storageBucket: "hireox-2a852.firebasestorage.app",
  messagingSenderId: "1055372020034",
  appId: "1:1055372020034:web:f5c5f71a318cfda26760db",
  measurementId: "G-CE7PYP2Y3H"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider };

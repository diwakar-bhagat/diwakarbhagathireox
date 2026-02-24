import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "hireoxai.firebaseapp.com",
  projectId: "hireoxai",
  storageBucket: "hireoxai.firebasestorage.app",
  messagingSenderId: "1001942313327",
  appId: "1:1001942313327:web:d80d53282aa842c687e09a",
  measurementId: "G-YV4Q771SKW"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider };

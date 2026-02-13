import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBwDkmbKOzZAyIZW7-ud4qYr7xHyILCdzI",
  authDomain: "ademruimte.vercel.app",
  projectId: "ademruimte-12c09",
  storageBucket: "ademruimte-12c09.firebasestorage.app",
  messagingSenderId: "744941871331",
  appId: "1:744941871331:web:c3ce24d814fe41314d25d6",
  measurementId: "G-SD2ZEYNMNY"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

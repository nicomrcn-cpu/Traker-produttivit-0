import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDeHw-f7RCpJD67biQz2V3xD48r8QqVhds",
  authDomain: "traker-produttivita.firebaseapp.com",
  projectId: "traker-produttivita",
  storageBucket: "traker-produttivita.firebasestorage.app",
  messagingSenderId: "455133424401",
  appId: "1:455133424401:web:0fd1a42cd75f066de03ab0",
  measurementId: "G-SW221KG3VG"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with Offline Persistence and Custom Database ID
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, "ai-studio-2a82cb62-8fb5-4738-92ef-ce8ddd0fec6e");

const auth = getAuth(app);

export { app, db, auth };

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAV1P-XMTQPxw2wTNnUL0Xp-ZFMpuj4OSE",
  authDomain: "corded-bay-pfjbn.firebaseapp.com",
  projectId: "corded-bay-pfjbn",
  storageBucket: "corded-bay-pfjbn.firebasestorage.app",
  messagingSenderId: "848486577078",
  appId: "1:848486577078:web:db6fb040906f4484c90717",
  measurementId: ""
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

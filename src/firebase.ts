import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDeHw-f7RCpJD67biQz2V3xD48r8QqVhds",
  authDomain: "traker-produttivita.firebaseapp.com",
  projectId: "traker-produttivita",
  storageBucket: "traker-produttivita.firebasestorage.app",
  messagingSenderId: "455133424401",
  appId: "1:455133424401:web:0fd1a42cd75f066de03ab0",
  measurementId: "G-SW221KG3VG"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
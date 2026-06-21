// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDeHw-f7RCpJD67biQz2V3xD48r8QqVhds",
  authDomain: "traker-produttivita.firebaseapp.com",
  projectId: "traker-produttivita",
  storageBucket: "traker-produttivita.firebasestorage.app",
  messagingSenderId: "455133424401",
  appId: "1:455133424401:web:0fd1a42cd75f066de03ab0",
  measurementId: "G-SW221KG3VG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
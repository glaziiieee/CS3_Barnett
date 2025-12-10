// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUQPQ0V-QrDcog2GStQiCXCGUxYbjKFY4",
  authDomain: "filipinoemigrantsdb-99259.firebaseapp.com",
  projectId: "filipinoemigrantsdb-99259",
  storageBucket: "filipinoemigrantsdb-99259.firebasestorage.app",
  messagingSenderId: "481495525361",
  appId: "1:481495525361:web:0b41117f72658daec94650",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);

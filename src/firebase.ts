// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBniMPfAuU2HkzCnpHG7N6o0ULtlLq2tCk",
  authDomain: "bistnews.firebaseapp.com",
  databaseURL: "https://bistnews-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bistnews",
  storageBucket: "bistnews.appspot.com",
  messagingSenderId: "334017542583",
  appId: "1:334017542583:web:46069c361053b07278d032"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export default app;

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCL7IympFrF2nWcLPEOQtyGSgPzp0MojHU",
  authDomain: "bodax-masters.firebaseapp.com",
  projectId: "bodax-masters",
  storageBucket: "bodax-masters.firebasestorage.app",
  messagingSenderId: "374148130763",
  appId: "1:374148130763:web:f32de20bc18a0ed4e4b84e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 
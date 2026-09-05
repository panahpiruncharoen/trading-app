// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {getAuth} from "firebase/auth";
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA-3L0-LhJcux5XSU1xwcV-JXoS4V2wXuc",
  authDomain: "trading-app-6394a.firebaseapp.com",
  projectId: "trading-app-6394a",
  storageBucket: "trading-app-6394a.firebasestorage.app",
  messagingSenderId: "634653730013",
  appId: "1:634653730013:web:2e32e9ddb54c3eb83b2734"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app)
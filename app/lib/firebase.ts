// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import {getStorage} from "firebase/storage";
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

// App Check proves requests come from this site; it only runs in the browser
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
if (typeof window !== "undefined" && recaptchaSiteKey) {
  if (import.meta.env.DEV) {
    // localhost can't pass reCAPTCHA, so this prints a debug token in the console to register in Firebase
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaSiteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app);
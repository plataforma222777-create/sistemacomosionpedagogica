import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

let app, db, analytics;

try {
    const configValid = Object.values(firebaseConfig).some(val => val && val.length > 0);
    if (!configValid) {
        console.warn("⚠️ Firebase credentials missing/empty. Ensure environment variables are configured in your hosting platform (Netlify).");
    } else {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isSupported().then(yes => yes && (analytics = getAnalytics(app)));
    }
} catch (error) {
    console.error("Error en inicialización de Firebase:", error);
}

export { db, analytics };

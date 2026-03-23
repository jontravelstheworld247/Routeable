import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyALy4mHIHhBAuP8Um71OuQawruyV8Ufhi4",
  authDomain: "one-time-password-a550a.firebaseapp.com",
  projectId: "one-time-password-a550a",
  storageBucket: "one-time-password-a550a.firebasestorage.app",
  messagingSenderId: "848793231507",
  appId: "1:848793231507:web:08fcaece4148ebd47aed66"
};

const app = initializeApp(firebaseConfig);
console.log("Firebase initialized successfully with Project ID:", firebaseConfig.projectId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { signInWithPopup };

export const resetUserPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "find-a-word-fast-juzzy",
  appId: "1:861807075181:web:a1787409d6e7775d958464",
  storageBucket: "find-a-word-fast-juzzy.firebasestorage.app",
  apiKey: "AIzaSyBk6d0VB78JX2QUMmIE84mfTUxa6FO6R9E",
  authDomain: "find-a-word-fast-juzzy.firebaseapp.com",
  messagingSenderId: "861807075181"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged };
export type { User };

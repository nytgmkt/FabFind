import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAm0nu-PPjW32l9sqb7i-pgsKGHRy_6Qu8",
  authDomain: "vendormatch-343e4.firebaseapp.com",
  projectId: "vendormatch-343e4",
  storageBucket: "vendormatch-343e4.firebasestorage.app",
  messagingSenderId: "321380303429",
  appId: "1:321380303429:web:690de6e2c9e8c84ba7592c"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

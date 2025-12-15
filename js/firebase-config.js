// Import Firebase modules dari CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase configuration - GANTI DENGAN CONFIG KAMU!
const firebaseConfig = {
  apiKey: "AIzaSyCjXU1R1lw7yJBIKtqqLvuOiQh4i3Qhqy8",
  authDomain: "interpretone.firebaseapp.com",
  projectId: "interpretone",
  storageBucket: "interpretone.firebasestorage.app",
  messagingSenderId: "78271028068",
  appId: "1:78271028068:web:8519c8056144bc02ff7871",
  measurementId: "G-KRGSYMJ26F"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Auto sign-in anonymously
let currentUser = null;

signInAnonymously(auth)
  .then(() => {
    console.log('✅ Signed in anonymously');
  })
  .catch((error) => {
    console.error('❌ Auth error:', error);
  });

// Listen to auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log('👤 User ID:', user.uid);
  } else {
    currentUser = null;
  }
});

// Export untuk dipakai di file lain
export { db, auth, currentUser };
// assets/firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyDv1-3cfXFveRN9hZOqBQI_jIVLj6ujoTM",
    authDomain: "shopify-booking-web.firebaseapp.com",
    projectId: "shopify-booking-web",
    storageBucket: "shopify-booking-web.firebasestorage.app",
    messagingSenderId: "629820668726",
    appId: "1:629820668726:web:fded3b19355524d2935197",
    measurementId: "G-V9W22S3C8S"
  };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Đăng nhập ẩn danh
signInAnonymously(auth)
  .then(() => {
    console.log('Signed in anonymously');
  })
  .catch(error => {
    console.error('Error signing in anonymously:', error);
  });

export { db, auth };
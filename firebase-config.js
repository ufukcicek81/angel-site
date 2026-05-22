import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyD3_M2Q5zMzKoX-791B0fiKpTFPzQmHRFo",
  authDomain: "angel-prive.firebaseapp.com",
  projectId: "angel-prive",
  storageBucket: "angel-prive.firebasestorage.app",
  messagingSenderId: "874026298672",
  appId: "1:874026298672:web:9d36f18e2ea7060b58acf5"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

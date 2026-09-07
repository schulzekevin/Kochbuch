import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAIuqpG1BfNiC0t5iTABgwKqHhL46VeecA",
  authDomain: "kochbuch-2e2cb.firebaseapp.com",
  projectId: "kochbuch-2e2cb",
  storageBucket: "kochbuch-2e2cb.firebasestorage.app",
  messagingSenderId: "905222404568",
  appId: "1:905222404568:web:16ac96959d1340dae9daad",
  measurementId: "G-5GQ9RGRVWC",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const IMGBB_API_KEY = "c9292dd9a4026a63e3906244120a00b6";
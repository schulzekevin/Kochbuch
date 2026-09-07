// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAIuqpG1BfNiC0t5iTABgwKqHhL46VeecA",
  authDomain: "kochbuch-2e2cb.firebaseapp.com",
  projectId: "kochbuch-2e2cb",
  storageBucket: "kochbuch-2e2cb.firebasestorage.app",
  messagingSenderId: "905222404568",
  appId: "1:905222404568:web:16ac96959d1340dae9daad",
  measurementId: "G-5GQ9RGRVWC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
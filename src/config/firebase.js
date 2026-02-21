import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

//Do not TOuch
const firebaseConfig = {
  apiKey: "AIzaSyC2JWlq-_aD4bNykK0-QiCLQVh0R4HCAeE",
  authDomain: "ufitness-ddd60.firebaseapp.com",
  projectId: "ufitness-ddd60",
  storageBucket: "ufitness-ddd60.firebasestorage.app",
  messagingSenderId: "779129847304",
  appId: "1:779129847304:web:a66b3da8793078f6305bbd",
  measurementId: "G-ENZPTZWN0B"
};

const app = initializeApp(firebaseConfig);

//keep logged in
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
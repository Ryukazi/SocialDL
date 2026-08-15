// js/auth.js

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyAgNlfkMZ6dyeyUClSKYRVuvzD0zNAzVok",
    authDomain: "studio-8804238675-8735f.firebaseapp.com",
    projectId: "studio-8804238675-8735f",
    storageBucket: "studio-8804238675-8735f.firebasestorage.app",
    messagingSenderId: "472948311884",
    appId: "1:472948311884:web:38e438e14d0706cb7231e9"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();


export {
    app,
    auth,
    db,
    googleProvider,

    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,

    collection,
    addDoc,
    serverTimestamp,
    query,
    orderBy,
    getDocs,
    deleteDoc,
    doc
};

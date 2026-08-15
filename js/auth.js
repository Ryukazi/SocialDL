// js/auth.js

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* =========================================
   FIREBASE CONFIG
========================================= */

const firebaseConfig = {
    apiKey: "AIzaSyAgNlfkMZ6dyeyUClSKYRVuvzD0zNAzVok",

    authDomain:
        "studio-8804238675-8735f.firebaseapp.com",

    projectId:
        "studio-8804238675-8735f",

    storageBucket:
        "studio-8804238675-8735f.firebasestorage.app",

    messagingSenderId:
        "472948311884",

    appId:
        "1:472948311884:web:38e438e14d0706cb7231e9"
};

/* =========================================
   INITIALIZE FIREBASE
========================================= */

const app =
    initializeApp(
        firebaseConfig
    );

/* =========================================
   AUTH
========================================= */

const auth =
    getAuth(app);

const googleProvider =
    new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account"
});

/* =========================================
   FIRESTORE
========================================= */

const db =
    getFirestore(app);

/* =========================================
   EXPORTS
========================================= */

export {
    auth,
    googleProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,

    db,
    collection,
    addDoc,
    serverTimestamp
};

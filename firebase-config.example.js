// Copy this file to firebase-config.js and fill in your Firebase project credentials.
// Get these values from: Firebase Console → Project Settings → Your apps → Config

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Initialize Firebase using the Compat SDK
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const fAuth = firebase.auth();
const fDb = firebase.firestore();

// Provide a global promise to wait for auth state
window.authStateReady = new Promise((resolve) => {
  fAuth.onAuthStateChanged((user) => {
    window.currentUser = user;
    resolve(user);
  });
});

window.loginWithGoogle = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await fAuth.signInWithPopup(provider);
    window.location.reload();
  } catch (error) {
    console.error("Erro no login:", error);
    alert("Erro ao fazer login com Google.");
  }
};

window.logout = async () => {
  try {
    await fAuth.signOut();
    window.location.reload();
  } catch (error) {
    console.error("Erro no logout:", error);
  }
};

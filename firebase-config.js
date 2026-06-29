const firebaseConfig = {
  apiKey: "AIzaSyDQ6IH4ppNsq7yzYSnPR9Ow33ejAiGf_GA",
  authDomain: "bettracker-6b955.firebaseapp.com",
  projectId: "bettracker-6b955",
  storageBucket: "bettracker-6b955.firebasestorage.app",
  messagingSenderId: "766658705353",
  appId: "1:766658705353:web:7d223707e0250bd0591a18",
  measurementId: "G-8NBFWQBSXL"
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

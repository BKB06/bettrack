/**
 * BetTrack — inicialização versionada do cliente Firebase.
 *
 * `firebase-config.js` contém apenas os identificadores públicos do projeto.
 * Manter o comportamento aqui evita diferenças entre o ambiente local e a CI.
 */
(function initializeFirebaseClient() {
  'use strict';

  if (!window.firebaseConfig) {
    throw new Error('firebase-config.js precisa ser carregado antes de firebase-client.js.');
  }

  if (!window.firebase?.apps) {
    throw new Error('A SDK do Firebase não foi carregada.');
  }

  if (!firebase.apps.length) {
    firebase.initializeApp(window.firebaseConfig);
  }

  const auth = firebase.auth();
  const database = firebase.firestore();

  // As páginas aguardam esta promessa antes de acessar dados do usuário.
  window.authStateReady = new Promise((resolve) => {
    let unsubscribe = () => {};
    unsubscribe = auth.onAuthStateChanged((user) => {
      window.currentUser = user;
      unsubscribe();
      resolve(user);
    });
  });

  window.betTrackDb = database;

  window.loginWithGoogle = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
      window.location.reload();
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Não foi possível entrar com o Google. Tente novamente.');
    }
  };

  window.logout = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Erro no logout:', error);
      alert('Não foi possível sair. Tente novamente.');
    }
  };
})();

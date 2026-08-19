'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');

test('firebase-client inicializa uma única vez e expõe o banco após autenticar', async () => {
  const authenticatedUser = { uid: 'user-1' };
  const database = { kind: 'firestore-mock' };
  const initializedWith = [];
  let unsubscribed = false;

  const authClient = {
    onAuthStateChanged(callback) {
      queueMicrotask(() => callback(authenticatedUser));
      return () => {
        unsubscribed = true;
      };
    },
    async signInWithPopup() {},
    async signOut() {}
  };

  const authFactory = () => authClient;
  authFactory.GoogleAuthProvider = class GoogleAuthProvider {};

  const firebase = {
    apps: [],
    initializeApp(config) {
      initializedWith.push(config);
      this.apps.push({ config });
    },
    auth: authFactory,
    firestore: () => database
  };

  const context = {
    alert() {},
    console,
    firebase,
    location: { reload() {} },
    firebaseConfig: Object.freeze({ projectId: 'project-test' })
  };
  context.window = context;
  vm.createContext(context);

  const source = await readFile(path.join(__dirname, '..', 'firebase-client.js'), 'utf8');
  new vm.Script(source, { filename: 'firebase-client.js' }).runInContext(context);

  assert.deepEqual(await context.authStateReady, authenticatedUser);
  assert.equal(context.currentUser, authenticatedUser);
  assert.equal(context.betTrackDb, database);
  assert.equal(initializedWith.length, 1);
  assert.equal(initializedWith[0].projectId, 'project-test');
  assert.equal(unsubscribed, true);
});

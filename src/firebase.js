import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAsyi_FENXlCE7S0eEKKQq8c094Lu9zf2w",
  authDomain: "alumbal-devasam.firebaseapp.com",
  projectId: "alumbal-devasam",
  storageBucket: "alumbal-devasam.firebasestorage.app",
  messagingSenderId: "738769105645",
  appId: "1:738769105645:web:81036a70d3c9d4e22c92e4"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore with offline multi-tab persistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

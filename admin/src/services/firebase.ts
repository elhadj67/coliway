import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCgdQX7WfDvq-0vEsUExaGA9adljhnqx1o',
  authDomain: 'coliway-app.firebaseapp.com',
  projectId: 'coliway-app',
  storageBucket: 'coliway-app.firebasestorage.app',
  messagingSenderId: '553047283159',
  appId: '1:553047283159:web:424da47ae6b105a6722792',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

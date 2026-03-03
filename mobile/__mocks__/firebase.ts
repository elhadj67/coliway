// Mock Firebase services
export const mockAuth = {
  currentUser: null as any,
  onAuthStateChanged: jest.fn((callback: any) => {
    callback(null);
    return jest.fn(); // unsubscribe
  }),
};

export const mockDb = {};

export const mockFunctions = {};

export const mockStorage = {};

// firebase/auth mocks
export const createUserWithEmailAndPassword = jest.fn();
export const signInWithEmailAndPassword = jest.fn();
export const signOut = jest.fn();
export const sendPasswordResetEmail = jest.fn();
export const sendEmailVerification = jest.fn();
export const onAuthStateChanged = jest.fn((auth: any, callback: any) => {
  callback(null);
  return jest.fn();
});

// firebase/firestore mocks
export const collection = jest.fn();
export const doc = jest.fn();
export const addDoc = jest.fn();
export const getDoc = jest.fn();
export const setDoc = jest.fn();
export const updateDoc = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const orderBy = jest.fn();
export const onSnapshot = jest.fn();
export const serverTimestamp = jest.fn(() => ({ _type: 'serverTimestamp' }));

// firebase/functions mocks
export const httpsCallable = jest.fn();

jest.mock('@/services/firebase', () => ({
  auth: mockAuth,
  db: mockDb,
  functions: mockFunctions,
  storage: mockStorage,
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut: signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  getAuth: jest.fn(() => mockAuth),
  GoogleAuthProvider: { credential: jest.fn() },
  signInWithCredential: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection,
  doc,
  addDoc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d, seconds: Math.floor(d.getTime() / 1000) }),
    now: () => ({ toDate: () => new Date(), seconds: Math.floor(Date.now() / 1000) }),
  },
}));

jest.mock('firebase/functions', () => ({
  httpsCallable,
  getFunctions: jest.fn(() => mockFunctions),
}));

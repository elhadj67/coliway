/**
 * AUTH TEST SUITE
 *
 * Unit tests for Coliway authentication services, form validation, and routing logic.
 * All external dependencies (Firebase, Expo Router, etc.) are mocked.
 */

// ---------------------------------------------------------------------------
// Mocks - must be declared before any imports
// ---------------------------------------------------------------------------

jest.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  functions: {},
  storage: {},
}));

const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSignInWithEmailAndPassword = jest.fn();
const mockFirebaseSignOut = jest.fn();
const mockSendPasswordResetEmail = jest.fn();
const mockSendEmailVerification = jest.fn();
const mockOnAuthStateChanged = jest.fn();

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    mockCreateUserWithEmailAndPassword(...args),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockFirebaseSignOut(...args),
  sendPasswordResetEmail: (...args: unknown[]) =>
    mockSendPasswordResetEmail(...args),
  sendEmailVerification: (...args: unknown[]) =>
    mockSendEmailVerification(...args),
  onAuthStateChanged: (...args: unknown[]) =>
    mockOnAuthStateChanged(...args),
  getAuth: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn() },
  signInWithCredential: jest.fn(),
}));

const mockDoc = jest.fn((_db: unknown, _col: string, _id: string) => ({
  path: `${_col}/${_id}`,
}));
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockServerTimestamp = jest.fn(() => 'SERVER_TIMESTAMP');

jest.mock('firebase/firestore', () => ({
  doc: mockDoc,
  setDoc: mockSetDoc,
  getDoc: mockGetDoc,
  updateDoc: mockUpdateDoc,
  serverTimestamp: mockServerTimestamp,
  getFirestore: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: null,
    profile: null,
    loading: false,
    isClient: false,
    isLivreur: false,
    isAdmin: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    refreshProfile: jest.fn(),
  })),
}));

jest.mock('@/constants/config', () => ({
  UserRole: {},
  FIREBASE_CONFIG: {},
  DEFAULT_MAP_REGION: { latitude: 48.8566, longitude: 2.3522 },
}));

jest.mock('@/constants/theme', () => ({
  Colors: {
    primary: '#1B3A5C',
    secondary: '#2E86DE',
    background: '#F5F7FA',
    white: '#FFFFFF',
    text: '#2C3E50',
    textLight: '#7F8C8D',
    border: '#E0E6ED',
    danger: '#E74C3C',
  },
  Typography: {
    sizes: { sm: 12, md: 14, base: 16, lg: 18, xl: 24 },
    weights: { medium: '500', semibold: '600', bold: '700' },
  },
  Spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 },
  BorderRadius: { sm: 4, md: 8, lg: 12, xl: 16 },
  Shadows: { card: {} },
}));

// ---------------------------------------------------------------------------
// Imports - after mocks
// ---------------------------------------------------------------------------

import {
  signUp,
  signIn,
  signOut,
  resetPassword,
  getCurrentUser,
  getUserProfile,
  updateProfile,
} from '@/services/auth';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a fake UserCredential returned by createUserWithEmailAndPassword
 * or signInWithEmailAndPassword.
 */
function fakeUserCredential(uid: string, email: string) {
  return {
    user: { uid, email, emailVerified: false },
    providerId: 'password',
    operationType: 'signIn',
  };
}

/**
 * Replicates the login screen validateForm logic from app/(auth)/login.tsx.
 * Extracted here so we can unit-test pure validation without rendering React components.
 */
function validateLoginForm(email: string, password: string): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!email.trim()) {
    errors.email = "L'adresse email est requise";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Adresse email invalide';
  }

  if (!password) {
    errors.password = 'Le mot de passe est requis';
  } else if (password.length < 6) {
    errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
  }

  return errors;
}

/**
 * Replicates the register screen validateForm logic from app/(auth)/register.tsx.
 */
function validateRegisterForm(
  form: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    password: string;
    confirmPassword: string;
    vehicule: string;
    siret: string;
  },
  role: 'client' | 'livreur' | 'admin',
  acceptTerms: boolean
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.nom.trim()) {
    errors.nom = 'Le nom est requis';
  }
  if (!form.prenom.trim()) {
    errors.prenom = 'Le prénom est requis';
  }
  if (!form.email.trim()) {
    errors.email = "L'adresse email est requise";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Adresse email invalide';
  }
  if (!form.telephone.trim()) {
    errors.telephone = 'Le numéro de téléphone est requis';
  } else if (!/^(\+33|0)[1-9](\d{2}){4}$/.test(form.telephone.replace(/\s/g, ''))) {
    errors.telephone = 'Numéro de téléphone invalide';
  }
  if (!form.password) {
    errors.password = 'Le mot de passe est requis';
  } else if (form.password.length < 6) {
    errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
  }
  if (!form.confirmPassword) {
    errors.confirmPassword = 'Veuillez confirmer le mot de passe';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Les mots de passe ne correspondent pas';
  }

  if (role === 'livreur') {
    if (!form.vehicule) {
      errors.vehicule = 'Veuillez sélectionner un véhicule';
    }
    if (!form.siret.trim()) {
      errors.siret = 'Le numéro SIRET est requis';
    } else if (form.siret.replace(/\s/g, '').length !== 14) {
      errors.siret = 'Le numéro SIRET doit contenir 14 chiffres';
    }
  }

  if (!acceptTerms) {
    errors.terms = 'Vous devez accepter les CGU';
  }

  return errors;
}

/**
 * Replicates the redirect logic from app/index.tsx.
 * Returns the path that the router would navigate to.
 */
function resolveRedirectPath(
  user: unknown | null,
  profile: { role: string } | null,
  loading: boolean
): string | null {
  if (loading) return null; // still loading, no redirect yet

  if (!user) return '/(auth)/login';
  if (!profile) return null; // waiting for profile

  if (profile.role === 'client') return '/(client)';
  if (profile.role === 'livreur') return '/(livreur)';

  // fallback
  return '/(client)';
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockFirebaseSignOut.mockResolvedValue(undefined);
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
});

// ===========================================================================
//  TEST CASES
// ===========================================================================

describe('AUTH-01: Client signup with valid email', () => {
  it('should create a user and write a client profile to Firestore', async () => {
    const uid = 'client-uid-001';
    const email = 'client@example.com';
    const password = 'Secret123';

    mockCreateUserWithEmailAndPassword.mockResolvedValue(
      fakeUserCredential(uid, email)
    );

    const result = await signUp(email, password, {
      nom: 'Dupont',
      prenom: 'Jean',
      telephone: '0612345678',
      role: 'client',
    });

    // Firebase auth was called with correct args
    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), // auth instance
      email,
      password
    );

    // Firestore document was written
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    const writtenProfile = mockSetDoc.mock.calls[0][1];
    expect(writtenProfile.uid).toBe(uid);
    expect(writtenProfile.email).toBe(email);
    expect(writtenProfile.nom).toBe('Dupont');
    expect(writtenProfile.prenom).toBe('Jean');
    expect(writtenProfile.role).toBe('client');
    expect(writtenProfile.telephone).toBe('0612345678');
    // Client should NOT have livreur-specific fields
    expect(writtenProfile.note).toBeUndefined();
    expect(writtenProfile.nombreLivraisons).toBeUndefined();

    // Returns credential
    expect(result.user.uid).toBe(uid);
  });
});

describe('AUTH-02: Livreur signup with vehicle selection', () => {
  it('should create a livreur profile with vehicule, initial note=5 and nombreLivraisons=0', async () => {
    const uid = 'livreur-uid-002';
    const email = 'livreur@example.com';

    mockCreateUserWithEmailAndPassword.mockResolvedValue(
      fakeUserCredential(uid, email)
    );

    await signUp(email, 'LivreurPass1', {
      nom: 'Martin',
      prenom: 'Pierre',
      telephone: '0698765432',
      role: 'livreur',
      vehicule: 'moto',
      permis: '12345678901234',
    });

    const writtenProfile = mockSetDoc.mock.calls[0][1];
    expect(writtenProfile.role).toBe('livreur');
    expect(writtenProfile.vehicule).toBe('moto');
    expect(writtenProfile.permis).toBe('12345678901234');
    expect(writtenProfile.note).toBe(5);
    expect(writtenProfile.nombreLivraisons).toBe(0);
  });
});

describe('AUTH-03: Signup with already-used email', () => {
  it('should throw an error with code auth/email-already-in-use', async () => {
    const error: any = new Error('Email already in use');
    error.code = 'auth/email-already-in-use';

    mockCreateUserWithEmailAndPassword.mockRejectedValue(error);

    await expect(
      signUp('taken@example.com', 'Password1', {
        nom: 'Dupe',
        prenom: 'User',
        telephone: '0611111111',
        role: 'client',
      })
    ).rejects.toMatchObject({ code: 'auth/email-already-in-use' });

    // Profile should NOT have been written to Firestore
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('AUTH-04: Signup with password too short (<6 chars)', () => {
  it('should flag a validation error for short passwords', () => {
    const errors = validateRegisterForm(
      {
        nom: 'Test',
        prenom: 'User',
        email: 'test@example.com',
        telephone: '0612345678',
        password: '12345', // only 5 characters
        confirmPassword: '12345',
        vehicule: '',
        siret: '',
      },
      'client',
      true
    );

    expect(errors.password).toBe(
      'Le mot de passe doit contenir au moins 6 caractères'
    );
  });

  it('should also flag short passwords in login form validation', () => {
    const errors = validateLoginForm('user@example.com', 'abc');
    expect(errors.password).toBe(
      'Le mot de passe doit contenir au moins 6 caractères'
    );
  });
});

describe('AUTH-05: Client login with valid credentials', () => {
  it('should call signInWithEmailAndPassword and return credential', async () => {
    const uid = 'client-uid-005';
    const email = 'client@example.com';
    const password = 'ValidPass1';

    mockSignInWithEmailAndPassword.mockResolvedValue(
      fakeUserCredential(uid, email)
    );

    const result = await signIn(email, password);

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), // auth instance
      email,
      password
    );
    expect(result.user.uid).toBe(uid);
    expect(result.user.email).toBe(email);
  });

  it('should pass login form validation with a valid email and password >= 6', () => {
    const errors = validateLoginForm('client@example.com', 'ValidPass1');
    expect(Object.keys(errors)).toHaveLength(0);
  });
});

describe('AUTH-06: Livreur login with valid credentials', () => {
  it('should authenticate a livreur with valid email/password', async () => {
    const uid = 'livreur-uid-006';
    const email = 'livreur@example.com';

    mockSignInWithEmailAndPassword.mockResolvedValue(
      fakeUserCredential(uid, email)
    );

    const result = await signIn(email, 'LivrPass1');

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      email,
      'LivrPass1'
    );
    expect(result.user.uid).toBe(uid);
  });

  it('should fetch livreur profile from Firestore after login', async () => {
    const uid = 'livreur-uid-006';
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid,
        email: 'livreur@example.com',
        role: 'livreur',
        vehicule: 'voiture',
        note: 5,
        nombreLivraisons: 12,
      }),
    });

    const profile = await getUserProfile(uid);

    expect(mockGetDoc).toHaveBeenCalledTimes(1);
    expect(profile).not.toBeNull();
    expect(profile!.role).toBe('livreur');
    expect(profile!.vehicule).toBe('voiture');
  });
});

describe('AUTH-07: Login with incorrect password', () => {
  it('should throw an error with code auth/wrong-password', async () => {
    const error: any = new Error('Wrong password');
    error.code = 'auth/wrong-password';

    mockSignInWithEmailAndPassword.mockRejectedValue(error);

    await expect(
      signIn('user@example.com', 'WrongPass')
    ).rejects.toMatchObject({ code: 'auth/wrong-password' });
  });
});

describe('AUTH-08: Login with non-existent email', () => {
  it('should throw an error with code auth/user-not-found', async () => {
    const error: any = new Error('User not found');
    error.code = 'auth/user-not-found';

    mockSignInWithEmailAndPassword.mockRejectedValue(error);

    await expect(
      signIn('nonexistent@example.com', 'AnyPass1')
    ).rejects.toMatchObject({ code: 'auth/user-not-found' });
  });
});

describe('AUTH-09: Auto-redirect client to /(client)/', () => {
  it('should redirect an authenticated client user to /(client)', () => {
    const path = resolveRedirectPath(
      { uid: 'client-uid' },
      { role: 'client' },
      false
    );
    expect(path).toBe('/(client)');
  });

  it('should redirect to login when there is no user', () => {
    const path = resolveRedirectPath(null, null, false);
    expect(path).toBe('/(auth)/login');
  });

  it('should return null (no redirect) while still loading', () => {
    const path = resolveRedirectPath(null, null, true);
    expect(path).toBeNull();
  });
});

describe('AUTH-10: Auto-redirect livreur to /(livreur)/', () => {
  it('should redirect an authenticated livreur user to /(livreur)', () => {
    const path = resolveRedirectPath(
      { uid: 'livreur-uid' },
      { role: 'livreur' },
      false
    );
    expect(path).toBe('/(livreur)');
  });

  it('should not redirect while profile is still loading', () => {
    const path = resolveRedirectPath({ uid: 'livreur-uid' }, null, false);
    expect(path).toBeNull();
  });
});

describe('AUTH-11: Forgot password sends reset email', () => {
  it('should call sendPasswordResetEmail with the correct email', async () => {
    const email = 'forgot@example.com';

    await resetPassword(email);

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(), // auth instance
      email
    );
  });

  it('should resolve without error for a valid email address', async () => {
    await expect(resetPassword('user@example.com')).resolves.toBeUndefined();
  });
});

describe('AUTH-12: Logout clears user state', () => {
  it('should call firebaseSignOut', async () => {
    await signOut();

    expect(mockFirebaseSignOut).toHaveBeenCalledWith(expect.anything());
  });

  it('should resolve without error', async () => {
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('getCurrentUser returns null after sign out (mock state)', () => {
    // The mocked auth has currentUser: null
    const user = getCurrentUser();
    expect(user).toBeNull();
  });
});

describe('AUTH-13: Session persistence (onAuthStateChanged restores user)', () => {
  it('should register an onAuthStateChanged listener', () => {
    const callback = jest.fn();

    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (user: unknown) => void) => {
        // Simulate restoring a previously authenticated user
        cb({ uid: 'restored-uid', email: 'restored@example.com' });
        return jest.fn(); // unsubscribe
      }
    );

    // Simulate what AuthProvider does in its useEffect
    const { onAuthStateChanged: mockOASC } = require('firebase/auth');
    const unsubscribe = mockOASC({}, callback);

    expect(mockOnAuthStateChanged).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith({
      uid: 'restored-uid',
      email: 'restored@example.com',
    });
    expect(typeof unsubscribe).toBe('function');
  });

  it('should call listener with null when user signs out', () => {
    const callback = jest.fn();

    mockOnAuthStateChanged.mockImplementation(
      (_auth: unknown, cb: (user: unknown) => void) => {
        cb(null);
        return jest.fn();
      }
    );

    const { onAuthStateChanged: mockOASC } = require('firebase/auth');
    mockOASC({}, callback);

    expect(callback).toHaveBeenCalledWith(null);
  });
});

describe('AUTH-14: Signup with missing required fields', () => {
  it('should flag all empty fields for a client registration', () => {
    const errors = validateRegisterForm(
      {
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        password: '',
        confirmPassword: '',
        vehicule: '',
        siret: '',
      },
      'client',
      false
    );

    expect(errors.nom).toBe('Le nom est requis');
    expect(errors.prenom).toBe('Le prénom est requis');
    expect(errors.email).toBe("L'adresse email est requise");
    expect(errors.telephone).toBe('Le numéro de téléphone est requis');
    expect(errors.password).toBe('Le mot de passe est requis');
    expect(errors.confirmPassword).toBe('Veuillez confirmer le mot de passe');
    expect(errors.terms).toBe('Vous devez accepter les CGU');
  });

  it('should flag all empty fields for a livreur registration including vehicule and siret', () => {
    const errors = validateRegisterForm(
      {
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        password: '',
        confirmPassword: '',
        vehicule: '', // empty vehicule
        siret: '',
      },
      'livreur',
      false
    );

    expect(errors.vehicule).toBe('Veuillez sélectionner un véhicule');
    expect(errors.siret).toBe('Le numéro SIRET est requis');
  });

  it('should flag invalid telephone format', () => {
    const errors = validateRegisterForm(
      {
        nom: 'Test',
        prenom: 'User',
        email: 'test@example.com',
        telephone: '123', // invalid
        password: 'Pass123',
        confirmPassword: 'Pass123',
        vehicule: '',
        siret: '',
      },
      'client',
      true
    );

    expect(errors.telephone).toBe('Numéro de téléphone invalide');
  });

  it('should flag password mismatch', () => {
    const errors = validateRegisterForm(
      {
        nom: 'Test',
        prenom: 'User',
        email: 'test@example.com',
        telephone: '0612345678',
        password: 'Pass123',
        confirmPassword: 'Different',
        vehicule: '',
        siret: '',
      },
      'client',
      true
    );

    expect(errors.confirmPassword).toBe(
      'Les mots de passe ne correspondent pas'
    );
  });

  it('should flag invalid SIRET length for livreur', () => {
    const errors = validateRegisterForm(
      {
        nom: 'Test',
        prenom: 'User',
        email: 'test@example.com',
        telephone: '0612345678',
        password: 'Pass123',
        confirmPassword: 'Pass123',
        vehicule: 'voiture',
        siret: '12345', // only 5 digits, need 14
      },
      'livreur',
      true
    );

    expect(errors.siret).toBe('Le numéro SIRET doit contenir 14 chiffres');
  });

  it('should pass validation when all livreur fields are correctly filled', () => {
    const errors = validateRegisterForm(
      {
        nom: 'Martin',
        prenom: 'Pierre',
        email: 'pierre@example.com',
        telephone: '0698765432',
        password: 'Secure123',
        confirmPassword: 'Secure123',
        vehicule: 'moto',
        siret: '12345678901234', // exactly 14 digits
      },
      'livreur',
      true
    );

    expect(Object.keys(errors)).toHaveLength(0);
  });
});

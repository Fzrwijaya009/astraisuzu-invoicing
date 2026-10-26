import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole, FIXED_VENDORS } from '../types';

const SESSION_STORAGE_KEY = 'astraisuzu_user_session';
const LOCAL_USERS_KEY = 'astraisuzu_registered_users';

export const OWNER_DEFAULT_PROFILE: UserProfile = {
  id: 'owner_fajrisani12',
  name: 'Fajri Sani (Owner Astra Isuzu)',
  email: 'fajrisani12@gmail.com',
  role: 'owner',
  jobTitle: 'Master System Administrator / Owner',
  vendor: 'Astra Isuzu (Master)',
  status: 'Approved',
  createdAt: '2026-01-01T00:00:00.000Z',
  companyLogoUrl: '/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png',
};

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  loginAsOwnerDirect: () => Promise<UserProfile>;
  registerWithEmail: (
    name: string,
    email: string,
    pass: string,
    jobTitle: string,
    vendor: string,
    role?: UserRole
  ) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateUserStatus: (userId: string, newStatus: 'Approved' | 'Rejected') => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  setDirectSession: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to get locally cached registered users
function getLocalUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return [];
}

// Helper to save registered user locally
function saveLocalUser(user: UserProfile) {
  try {
    const current = getLocalUsers().filter((u) => u.email.toLowerCase() !== user.email.toLowerCase());
    current.push(user);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(current));
  } catch {
    // ignore
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize user profile to localStorage for persistence
  useEffect(() => {
    if (userProfile) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(userProfile));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [userProfile]);

  // Monitor Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          } else {
            const isOwnerEmail =
              user.email?.toLowerCase() === 'fajrisani12@gmail.com' ||
              user.email?.toLowerCase() === 'owner@astraisuzu.co.id';

            const newProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User Astra Isuzu',
              email: user.email?.toLowerCase() || '',
              role: isOwnerEmail ? 'owner' : 'admin',
              jobTitle: isOwnerEmail ? 'Master System Administrator / Owner' : 'Finance & Accounting Staff',
              vendor: isOwnerEmail ? 'Astra Isuzu (Master)' : FIXED_VENDORS[0],
              status: isOwnerEmail ? 'Approved' : 'Pending',
              createdAt: new Date().toISOString(),
              ...(isOwnerEmail ? { companyLogoUrl: '/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png' } : {}),
            };

            await setDoc(userRef, newProfile);
            saveLocalUser(newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.warn('Error fetching user profile from Firestore:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Direct login as Owner fajrisani12@gmail.com
  const loginAsOwnerDirect = async (): Promise<UserProfile> => {
    const owner = { ...OWNER_DEFAULT_PROFILE };
    try {
      // Persist to Firestore
      const userRef = doc(db, 'users', owner.id);
      await setDoc(userRef, owner, { merge: true });
    } catch (err) {
      console.warn('Direct owner firestore sync warning:', err);
    }
    saveLocalUser(owner);
    setUserProfile(owner);
    return owner;
  };

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;
      const isOwnerEmail =
        user.email?.toLowerCase() === 'fajrisani12@gmail.com' ||
        user.email?.toLowerCase() === 'owner@astraisuzu.co.id';

      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // If owner email, guarantee owner role & approved status
        if (isOwnerEmail && (data.role !== 'owner' || data.status !== 'Approved')) {
          const updated: UserProfile = {
            ...data,
            role: 'owner',
            status: 'Approved',
            vendor: 'Astra Isuzu (Master)',
          };
          await setDoc(userRef, updated, { merge: true });
          setUserProfile(updated);
          saveLocalUser(updated);
        } else {
          setUserProfile(data);
          saveLocalUser(data);
        }
      } else {
        const newProfile: UserProfile = {
          id: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'User Astra Isuzu',
          email: user.email?.toLowerCase() || '',
          role: isOwnerEmail ? 'owner' : 'admin',
          jobTitle: isOwnerEmail ? 'Master System Administrator / Owner' : 'Finance & Accounting Staff',
          vendor: isOwnerEmail ? 'Astra Isuzu (Master)' : FIXED_VENDORS[0],
          status: isOwnerEmail ? 'Approved' : 'Pending',
          createdAt: new Date().toISOString(),
          ...(isOwnerEmail ? { companyLogoUrl: '/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png' } : {}),
        };
        await setDoc(userRef, newProfile);
        setUserProfile(newProfile);
        saveLocalUser(newProfile);
      }
    } catch (err) {
      console.error('Google Sign In Error:', err);
      throw err;
    }
  };

  const loginWithEmail = async (emailInput: string, pass: string): Promise<UserProfile> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const isOwnerEmail =
      cleanEmail === 'fajrisani12@gmail.com' ||
      cleanEmail === 'owner@astraisuzu.co.id';

    // Fast-path: Owner fajrisani12@gmail.com can log in directly
    if (isOwnerEmail) {
      return await loginAsOwnerDirect();
    }

    // Attempt Firebase Auth sign in first
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const userRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        setUserProfile(profile);
        saveLocalUser(profile);
        return profile;
      }
    } catch (firebaseErr: any) {
      console.warn('Firebase signInWithEmailAndPassword note:', firebaseErr?.code || firebaseErr?.message);
      // If auth provider is disabled or user not found in Firebase Auth, check Firestore or local registered accounts
    }

    // Check Firestore users collection by email
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const matchedDoc = snap.docs[0];
        const profile = { ...(matchedDoc.data() as UserProfile), id: matchedDoc.id };
        if (profile.password && profile.password !== pass) {
          throw new Error('PASSWORD_MISMATCH');
        }
        setUserProfile(profile);
        saveLocalUser(profile);
        return profile;
      }
    } catch (fsErr: any) {
      if (fsErr.message === 'PASSWORD_MISMATCH') throw fsErr;
      console.warn('Firestore query error:', fsErr);
    }

    // Check local registered users cache
    const localUsers = getLocalUsers();
    const foundLocal = localUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (foundLocal) {
      if (foundLocal.password && foundLocal.password !== pass) {
        throw new Error('PASSWORD_MISMATCH');
      }
      setUserProfile(foundLocal);
      // Sync to Firestore
      try {
        await setDoc(doc(db, 'users', foundLocal.id), foundLocal, { merge: true });
      } catch {
        // ignore
      }
      return foundLocal;
    }

    throw new Error('USER_NOT_FOUND');
  };

  const registerWithEmail = async (
    name: string,
    emailInput: string,
    pass: string,
    jobTitle: string,
    vendor: string,
    role: UserRole = 'admin'
  ): Promise<UserProfile> => {
    const cleanEmail = emailInput.trim().toLowerCase();
    const isOwnerEmail =
      cleanEmail === 'fajrisani12@gmail.com' ||
      cleanEmail === 'owner@astraisuzu.co.id' ||
      role === 'owner';

    const assignedRole: UserRole = isOwnerEmail ? 'owner' : role;
    const assignedStatus = isOwnerEmail ? 'Approved' : 'Pending';
    const assignedVendor = isOwnerEmail ? 'Astra Isuzu (Master)' : vendor;
    const assignedJobTitle = isOwnerEmail ? 'Master System Administrator / Owner' : jobTitle;

    // Check if user already exists in Firestore
    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const existingSnap = await getDocs(q);
      if (!existingSnap.empty) {
        const existingData = existingSnap.docs[0].data() as UserProfile;
        if (isOwnerEmail) {
          setUserProfile(existingData);
          return existingData;
        }
        throw new Error('EMAIL_EXISTS');
      }
    } catch (checkErr: any) {
      if (checkErr.message === 'EMAIL_EXISTS') throw checkErr;
    }

    // Determine UID
    let uid = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Attempt Firebase Auth creation if enabled
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      uid = userCredential.user.uid;
    } catch (firebaseErr: any) {
      console.warn('Firebase createUser note:', firebaseErr?.code || firebaseErr?.message);
      // If auth/operation-not-allowed or auth/email-already-in-use, proceed with resilient app-level UID
    }

    const newProfile: UserProfile = {
      id: uid,
      name: name.trim(),
      email: cleanEmail,
      role: assignedRole,
      jobTitle: assignedJobTitle,
      vendor: assignedVendor,
      status: assignedStatus,
      createdAt: new Date().toISOString(),
      password: pass,
      ...(isOwnerEmail ? { companyLogoUrl: '/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png' } : {}),
    };

    // Save to Firestore
    try {
      await setDoc(doc(db, 'users', uid), newProfile);
    } catch (saveErr) {
      console.warn('Error saving new profile to Firestore:', saveErr);
    }

    // Save to local cache
    saveLocalUser(newProfile);
    setUserProfile(newProfile);
    return newProfile;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out warning:', err);
    } finally {
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'Approved' | 'Rejected') => {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { status: newStatus, updatedAt: new Date().toISOString() }, { merge: true });
      
      // Also update local registered cache if present
      const locals = getLocalUsers();
      const updated = locals.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(updated));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    try {
      if (userProfile) {
        const updated = { ...userProfile, ...data, updatedAt: new Date().toISOString() };
        setUserProfile(updated);
        saveLocalUser(updated);
        const userRef = doc(db, 'users', userProfile.id);
        await setDoc(userRef, data, { merge: true });
      }
    } catch (err) {
      console.error('Update profile error:', err);
    }
  };

  const setDirectSession = (profile: UserProfile | null) => {
    setUserProfile(profile);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        loginWithGoogle,
        loginWithEmail,
        loginAsOwnerDirect,
        registerWithEmail,
        logout,
        updateUserStatus,
        updateUserProfile,
        setDirectSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

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
  onSnapshot,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, UserRole, FIXED_VENDORS } from '../types';

const SESSION_STORAGE_KEY = 'astraisuzu_user_session';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
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
              user.email === 'fajrisani12@gmail.com' ||
              user.email === 'owner@astraisuzu.co.id';

            const newProfile: UserProfile = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'User Astra Isuzu',
              email: user.email || '',
              role: isOwnerEmail ? 'owner' : 'admin',
              jobTitle: isOwnerEmail ? 'Master System Administrator' : 'Finance Staff',
              vendor: isOwnerEmail ? 'Astra Isuzu (Master)' : FIXED_VENDORS[0],
              status: isOwnerEmail ? 'Approved' : 'Pending',
              createdAt: new Date().toISOString(),
              companyLogoUrl: isOwnerEmail ? '/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png' : undefined,
            };

            await setDoc(userRef, newProfile);
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

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign In Error:', err);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const userRef = doc(db, 'users', cred.user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      }
    } catch (err) {
      console.error('Email Sign In Error:', err);
      throw err;
    }
  };

  const registerWithEmail = async (
    name: string,
    email: string,
    pass: string,
    jobTitle: string,
    vendor: string,
    role: UserRole = 'admin'
  ): Promise<UserProfile> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const uid = userCredential.user.uid;
      const isOwnerEmail =
        email === 'fajrisani12@gmail.com' || email === 'owner@astraisuzu.co.id';
      const assignedRole: UserRole = isOwnerEmail ? 'owner' : role;
      const assignedStatus = assignedRole === 'owner' || isOwnerEmail ? 'Approved' : 'Pending';

      const newProfile: UserProfile = {
        id: uid,
        name,
        email,
        role: assignedRole,
        jobTitle,
        vendor: assignedRole === 'owner' ? 'Astra Isuzu (Master)' : vendor,
        status: assignedStatus,
        createdAt: new Date().toISOString(),
        companyLogoUrl: assignedRole === 'owner' ? '/assets/aistudio/Astra_Isuzu_Logo_Vector.svg__220102f2.png' : undefined,
      };

      await setDoc(doc(db, 'users', uid), newProfile);
      setUserProfile(newProfile);
      return newProfile;
    } catch (err) {
      console.error('Registration Error:', err);
      throw err;
    }
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
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    try {
      if (userProfile) {
        const updated = { ...userProfile, ...data, updatedAt: new Date().toISOString() };
        setUserProfile(updated);
        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, data, { merge: true });
        }
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

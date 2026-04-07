import { auth, db } from '../../db/firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Admin login authentication
 */
export const adminLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if user has admin role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    
    const userData = userDoc.data();
    if (userData.role !== 'admin') {
      throw new Error('Access denied. Admin role required.');
    }
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: userData.name,
        role: userData.role
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Logout current user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          resolve({
            uid: user.uid,
            email: user.email,
            name: userData?.name || 'User',
            role: userData?.role || 'user'
          });
        } catch (error) {
          console.error('Error getting user data:', error);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    });
  });
};

/**
 * Check if user is authenticated and is admin
 */
export const isAdminUser = async () => {
  const user = await getCurrentUser();
  return user && user.role === 'admin';
};

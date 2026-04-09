import { auth, db } from '../../db/firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

/**
 * Generic login for both admin and captain users
 */
export const userLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }
    
    const userData = userDoc.data();
    
    return {
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        name: userData.name || 'User',
        role: userData.role || 'user',
        teamId: userData.teamId || null
      }
    };
  } catch (error) {
    let errorMessage = 'Wrong credentials. Please check your email and password.';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address (e.g., name@example.com)';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address. Please contact your chapter administrator.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Wrong credentials. Please check your email and password.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Wrong credentials. Please check your email and password.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Please check your internet connection.';
        break;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

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

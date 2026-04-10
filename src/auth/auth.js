import { auth, db } from '../../db/firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

/**
 * Generic login for both admin and captain users
 * Automatically detects role and handles Firestore profile verification
 */
export const userLogin = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Fetch profile from users collection (master list)
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
    console.error('Auth Service Error:', error);
    
    if (error.message === 'User profile not found') {
       return {
         success: false,
         error: 'Authenticated but profile missing in database. Contact Admin.'
       };
    }

    let errorMessage = 'Wrong credentials. Please check your email and password.';
    
    switch (error.code) {
      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password. Try again.';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Wrong credentials. Please check details.';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Locked temporarily.';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Network error. Check connection.';
        break;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Check if user has admin role
 */
export const isAdminUser = async (uid) => {
  if (!uid) return false;
  const userDoc = await getDoc(doc(db, 'users', uid));
  return userDoc.exists() && userDoc.data().role === 'admin';
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

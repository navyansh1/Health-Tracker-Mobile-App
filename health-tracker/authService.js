import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInAnonymously,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    updateProfile,
    deleteUser,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

/**
 * Sign up with email and password
 */
export const signUpWithEmail = async (email, password, displayName) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // Update display name
        if (displayName) {
            await updateProfile(userCredential.user, { displayName });
        }

        console.log('✅ Signed up successfully:', userCredential.user.email);
        return {
            success: true,
            user: userCredential.user
        };
    } catch (error) {
        console.error('❌ Sign-up error:', error.message);
        return {
            success: false,
            error: getErrorMessage(error.code)
        };
    }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Signed in:', userCredential.user.email);
        return {
            success: true,
            user: userCredential.user
        };
    } catch (error) {
        console.error('❌ Sign-in error:', error.message);
        return {
            success: false,
            error: getErrorMessage(error.code)
        };
    }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email) => {
    try {
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email);
        console.log('✅ Password reset email sent to:', email);
        return {
            success: true
        };
    } catch (error) {
        console.error('❌ Password reset error:', error.message);
        return {
            success: false,
            error: getErrorMessage(error.code)
        };
    }
};

/**
 * Sign in with Google
 * Note: Google Sign-In requires additional setup for React Native
 */
export const signInWithGoogle = async () => {
    return {
        success: false,
        error: 'Google Sign-In is not available in this version. Please use email/password instead.'
    };
};

/**
 * Sign in anonymously
 */
export const signInAnonymous = async () => {
    try {
        const userCredential = await signInAnonymously(auth);
        console.log('✅ Signed in anonymously:', userCredential.user.uid);
        return {
            success: true,
            user: userCredential.user,
            uid: userCredential.user.uid
        };
    } catch (error) {
        console.error('❌ Anonymous sign-in error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
        console.log('✅ Signed out successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Sign-out error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Delete user account permanently
 */
export const deleteAccount = async () => {
    try {
        const user = auth.currentUser;
        if (!user) return { success: false, error: 'No user signed in' };
        await deleteUser(user);
        console.log('Account deleted');
        return { success: true };
    } catch (error) {
        console.error('Delete account error:', error.message);
        if (error.code === 'auth/requires-recent-login') {
            return { success: false, error: 'For security, please sign out and sign back in, then try deleting again.' };
        }
        return { success: false, error: getErrorMessage(error.code) || error.message };
    }
};

/**
 * Listen to authentication state changes
 */
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('👤 User is signed in:', user.email || user.uid);
            callback(user);
        } else {
            console.log('👤 User is signed out');
            callback(null);
        }
    });
};

/**
 * Get current user
 */
export const getCurrentUser = () => {
    return auth.currentUser;
};

/**
 * Check if user is signed in
 */
export const isSignedIn = () => {
    return auth.currentUser !== null;
};

/**
 * Get user display name
 */
export const getUserDisplayName = () => {
    const user = auth.currentUser;
    if (!user) return null;

    if (user.displayName) return user.displayName;
    if (user.email) return user.email.split('@')[0];
    return 'Anonymous User';
};

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'Operation not allowed',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/user-disabled': 'This account has been disabled',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential': 'Invalid email or password',
        'auth/too-many-requests': 'Too many attempts. Please try again later',
        'auth/popup-closed-by-user': 'Sign-in cancelled',
        'auth/cancelled-popup-request': 'Sign-in cancelled'
    };

    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

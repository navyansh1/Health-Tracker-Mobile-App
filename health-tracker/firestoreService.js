import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import app from './firebaseConfig';
import { getCurrentUser } from './authService';

// Initialize Firestore
const db = getFirestore(app);

/**
 * Save user's Gemini API key to Firestore
 */
export const saveApiKey = async (apiKey) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in');
        }

        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        await setDoc(userSettingsRef, {
            geminiApiKey: apiKey,
            updatedAt: serverTimestamp()
        }, { merge: true });

        console.log('✅ API key saved to Firestore');
        return { success: true };
    } catch (error) {
        console.error('❌ Save API key error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Get user's Gemini API key from Firestore
 */
export const getApiKey = async () => {
    try {
        const user = getCurrentUser();
        if (!user) {
            return { success: false, apiKey: '' };
        }

        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const docSnap = await getDoc(userSettingsRef);

        if (docSnap.exists()) {
            const apiKey = docSnap.data().geminiApiKey || '';
            console.log('✅ API key retrieved from Firestore');
            return { success: true, apiKey };
        } else {
            return { success: true, apiKey: '' };
        }
    } catch (error) {
        console.error('❌ Get API key error:', error.message);
        return { success: false, error: error.message, apiKey: '' };
    }
};

/**
 * Save user preferences (daily goals, theme, etc.)
 */
export const saveUserPreferences = async (preferences) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in');
        }

        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        await setDoc(userSettingsRef, {
            ...preferences,
            updatedAt: serverTimestamp()
        }, { merge: true });

        console.log('✅ User preferences saved to Firestore');
        return { success: true };
    } catch (error) {
        console.error('❌ Save preferences error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Get user preferences from Firestore
 */
export const getUserPreferences = async () => {
    try {
        const user = getCurrentUser();
        if (!user) {
            return { success: false, preferences: null };
        }

        const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');
        const docSnap = await getDoc(userSettingsRef);

        if (docSnap.exists()) {
            const preferences = docSnap.data();
            console.log('✅ User preferences retrieved from Firestore');
            return { success: true, preferences };
        } else {
            return { success: true, preferences: null };
        }
    } catch (error) {
        console.error('❌ Get preferences error:', error.message);
        return { success: false, error: error.message, preferences: null };
    }
};

/**
 * Add a new meal to Firestore
 */
export const addMeal = async (meal) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in');
        }

        const mealsRef = collection(db, 'users', user.uid, 'meals');
        const docRef = await addDoc(mealsRef, {
            ...meal,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Meal added to Firestore:', docRef.id);
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error('❌ Add meal error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Add multiple meals to Firestore (batch)
 */
export const addMeals = async (meals) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in');
        }

        const mealsRef = collection(db, 'users', user.uid, 'meals');
        const promises = meals.map(meal =>
            addDoc(mealsRef, {
                ...meal,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            })
        );

        await Promise.all(promises);
        console.log(`✅ ${meals.length} meals added to Firestore`);
        return { success: true };
    } catch (error) {
        console.error('❌ Add meals error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Update a meal in Firestore
 */
export const updateMeal = async (mealId, updates) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in');
        }

        const mealRef = doc(db, 'users', user.uid, 'meals', mealId);
        await updateDoc(mealRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Meal updated in Firestore');
        return { success: true };
    } catch (error) {
        console.error('❌ Update meal error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Delete a meal from Firestore
 */
export const deleteMeal = async (mealId) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in');
        }

        const mealRef = doc(db, 'users', user.uid, 'meals', mealId);
        await deleteDoc(mealRef);

        console.log('✅ Meal deleted from Firestore');
        return { success: true };
    } catch (error) {
        console.error('❌ Delete meal error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Get all meals for the current user
 */
export const getMeals = async () => {
    try {
        const user = getCurrentUser();
        if (!user) {
            return { success: false, meals: [] };
        }

        const mealsRef = collection(db, 'users', user.uid, 'meals');
        const q = query(mealsRef, orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);

        const meals = [];
        querySnapshot.forEach((doc) => {
            meals.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ Retrieved ${meals.length} meals from Firestore`);
        return { success: true, meals };
    } catch (error) {
        console.error('❌ Get meals error:', error.message);
        return { success: false, error: error.message, meals: [] };
    }
};

/**
 * Listen to real-time updates for meals
 */
export const subscribeToMeals = (callback) => {
    const user = getCurrentUser();
    if (!user) {
        console.log('⚠️ No user signed in, cannot subscribe to meals');
        return () => { };
    }

    const mealsRef = collection(db, 'users', user.uid, 'meals');
    const q = query(mealsRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const meals = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            meals.push({
                id: doc.id,
                food_name: data.food_name || 'Unknown Food',
                meal_type: data.meal_type || 'Snack',
                calories: Number(data.calories) || 0,
                protein: Number(data.protein) || 0,
                carbs: Number(data.carbs) || 0,
                fat: Number(data.fat) || 0,
                fiber: Number(data.fiber) || 0,
                sugar: Number(data.sugar) || 0,
                sodium: Number(data.sodium) || 0,
                serving_size: data.serving_size || '1 serving',
                confidence: data.confidence || 'medium',
                date: data.date || new Date().toISOString().slice(0, 10),
                time: data.time || new Date().toISOString().slice(11, 16),
                photoUrl: data.photoUrl || null,
            });
        });

        console.log(`🔄 Real-time update: ${meals.length} meals`);
        callback(meals);
    }, (error) => {
        console.error('❌ Meals subscription error:', error.message);
    });

    return unsubscribe;
};

/**
 * Listen to real-time updates for user preferences
 */
export const subscribeToPreferences = (callback) => {
    const user = getCurrentUser();
    if (!user) {
        console.log('No user signed in, cannot subscribe to preferences');
        return () => { };
    }

    const userSettingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');

    const unsubscribe = onSnapshot(userSettingsRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    }, (error) => {
        console.error('Preferences subscription error:', error.message);
    });

    return unsubscribe;
};

// ============================================================================
// WEIGHT TRACKING
// ============================================================================

/**
 * Save a weight entry
 */
export const saveWeightEntry = async (entry) => {
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('User must be signed in');

        const weightRef = collection(db, 'users', user.uid, 'weightLog');
        await addDoc(weightRef, {
            weight: entry.weight,
            unit: entry.unit || 'kg',
            date: entry.date || new Date().toISOString().slice(0, 10),
            createdAt: serverTimestamp()
        });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get weight entries sorted by date
 */
export const getWeightEntries = async () => {
    try {
        const user = getCurrentUser();
        if (!user) return { success: false, entries: [] };

        const weightRef = collection(db, 'users', user.uid, 'weightLog');
        const q = query(weightRef, orderBy('date', 'desc'));
        const snapshot = await getDocs(q);

        const entries = [];
        snapshot.forEach((docItem) => {
            entries.push({ id: docItem.id, ...docItem.data() });
        });

        return { success: true, entries };
    } catch (error) {
        return { success: false, entries: [], error: error.message };
    }
};

/**
 * Delete a weight entry
 */
export const deleteWeightEntry = async (entryId) => {
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('User must be signed in');

        const entryRef = doc(db, 'users', user.uid, 'weightLog', entryId);
        await deleteDoc(entryRef);

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// ============================================================================
// GOAL PLANNING
// ============================================================================

/**
 * Save goal plan data (fitness goal, activity level, target weight, etc.)
 */
export const saveGoalPlan = async (plan) => {
    try {
        const user = getCurrentUser();
        if (!user) throw new Error('User must be signed in');

        const planRef = doc(db, 'users', user.uid, 'settings', 'goalPlan');
        await setDoc(planRef, {
            ...plan,
            updatedAt: serverTimestamp()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

/**
 * Get goal plan data
 */
export const getGoalPlan = async () => {
    try {
        const user = getCurrentUser();
        if (!user) return { success: false, plan: null };

        const planRef = doc(db, 'users', user.uid, 'settings', 'goalPlan');
        const docSnap = await getDoc(planRef);

        if (docSnap.exists()) {
            return { success: true, plan: docSnap.data() };
        }
        return { success: true, plan: null };
    } catch (error) {
        return { success: false, plan: null, error: error.message };
    }
};

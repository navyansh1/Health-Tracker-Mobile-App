import {
    ref,
    uploadBytes,
    uploadString,
    getDownloadURL,
    deleteObject,
    listAll
} from 'firebase/storage';
import { storage } from './firebaseConfig';
import { getCurrentUser } from './authService';

/**
 * Upload a file to Firebase Storage
 * @param {Blob|File} file - File to upload
 * @param {string} path - Storage path (e.g., 'meals/image.jpg')
 * @returns {Promise<Object>} Upload result with download URL
 */
export const uploadFile = async (file, path) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in to upload files');
        }

        // Create a reference with user ID in path for security
        const userPath = `users/${user.uid}/${path}`;
        const storageRef = ref(storage, userPath);

        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        console.log('✅ File uploaded successfully:', downloadURL);
        return {
            success: true,
            downloadURL,
            fullPath: snapshot.ref.fullPath,
            name: snapshot.ref.name
        };
    } catch (error) {
        console.error('❌ Upload error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Convert base64 to Blob for React Native
 * @param {string} base64 - Base64 encoded string
 * @param {string} contentType - MIME type
 * @returns {Promise<Blob>} Blob object
 */
const base64ToBlob = async (base64, contentType = 'image/jpeg') => {
    // Create a data URI from base64
    const dataUri = `data:${contentType};base64,${base64}`;

    // Fetch the data URI and convert to blob
    const response = await fetch(dataUri);
    const blob = await response.blob();
    return blob;
};

/**
 * Upload base64 image string (useful for Expo image picker)
 * Works in React Native by converting base64 to Blob first
 * @param {string} base64String - Base64 encoded image
 * @param {string} fileName - Name for the file
 * @returns {Promise<Object>} Upload result with download URL
 */
export const uploadBase64Image = async (base64String, fileName) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in to upload files');
        }

        const userPath = `users/${user.uid}/meals/${fileName}`;
        const storageRef = ref(storage, userPath);

        // Convert base64 to Blob (React Native compatible)
        const blob = await base64ToBlob(base64String, 'image/jpeg');

        // Upload blob
        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        console.log('✅ Meal photo uploaded successfully:', downloadURL);
        return {
            success: true,
            downloadURL,
            fullPath: snapshot.ref.fullPath,
            name: snapshot.ref.name
        };
    } catch (error) {
        console.error('❌ Upload error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Upload data URI (from Expo ImagePicker)
 * @param {string} uri - Data URI from image picker
 * @param {string} fileName - Name for the file
 * @returns {Promise<Object>} Upload result with download URL
 */
export const uploadImageUri = async (uri, fileName) => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in to upload files');
        }

        // Fetch the image and convert to blob
        const response = await fetch(uri);
        const blob = await response.blob();

        const userPath = `users/${user.uid}/images/${fileName}`;
        const storageRef = ref(storage, userPath);

        const snapshot = await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        console.log('✅ Image uploaded successfully:', downloadURL);
        return {
            success: true,
            downloadURL,
            fullPath: snapshot.ref.fullPath,
            name: snapshot.ref.name
        };
    } catch (error) {
        console.error('❌ Upload error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Delete a file from Firebase Storage
 * @param {string} fullPath - Full path of file in storage
 * @returns {Promise<Object>} Delete result
 */
export const deleteFile = async (fullPath) => {
    try {
        const storageRef = ref(storage, fullPath);
        await deleteObject(storageRef);

        console.log('✅ File deleted successfully');
        return { success: true };
    } catch (error) {
        console.error('❌ Delete error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get download URL for a file
 * @param {string} fullPath - Full path of file in storage
 * @returns {Promise<Object>} Result with download URL
 */
export const getFileURL = async (fullPath) => {
    try {
        const storageRef = ref(storage, fullPath);
        const downloadURL = await getDownloadURL(storageRef);

        return {
            success: true,
            downloadURL
        };
    } catch (error) {
        console.error('❌ Get URL error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * List all files in a user's folder
 * @param {string} folderPath - Folder path (e.g., 'meals')
 * @returns {Promise<Object>} List of files
 */
export const listUserFiles = async (folderPath = '') => {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('User must be signed in');
        }

        const userPath = `users/${user.uid}/${folderPath}`;
        const storageRef = ref(storage, userPath);
        const result = await listAll(storageRef);

        const files = await Promise.all(
            result.items.map(async (itemRef) => {
                const url = await getDownloadURL(itemRef);
                return {
                    name: itemRef.name,
                    fullPath: itemRef.fullPath,
                    downloadURL: url
                };
            })
        );

        console.log(`✅ Found ${files.length} files`);
        return {
            success: true,
            files
        };
    } catch (error) {
        console.error('❌ List files error:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
};

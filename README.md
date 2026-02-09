# 🥗 NutriSnap - AI-Powered Health & Meal Tracker

A modern, AI-powered meal tracking app built with React Native and Expo. Simply snap a photo of your food and let Gemini AI automatically identify it and calculate all nutritional information!

## ✨ Features

- 📸 **AI Food Analysis** - Take a photo of your meal and get instant nutritional breakdown
- 🔥 **Calorie Tracking** - Track daily calorie intake with visual progress
- 🥩 **Macro Nutrients** - Monitor protein, carbs, and fat consumption
- 📊 **Detailed Nutrition** - View fiber, sugar, and sodium for each meal
- 🎯 **Daily Goals** - Set customizable daily targets for calories and macros
- � **Smart Reminders** - Intelligent notifications to keep you on track
- �🔐 **Firebase Authentication** - Secure email/password authentication
- ☁️ **Real-time Cloud Sync** - All your data synced across devices with Firestore
- � **Offline Support** - Smart handling of network connectivity for AI features
- 🚀 **Optimized Performance** - Fast image processing and storage management
- �📱 **Modern UI** - Beautiful, health-focused interface with smooth animations
- 🌓 **Dark/Light Mode** - System, Light, or Dark mode support
- 🎨 **Theme Colors** - 9+ color themes including vibrant aesthetics like Midnight Blue, Sage Wisdom, and Berry Punch

## 🔔 Notification System

NutriSnap sends smart notifications to help you stay consistent:

| Notification | Trigger Condition | Delivery Time |
|--------------|-------------------|---------------|
| **Daily Reminder** | If you haven't logged any meals today | **Immediate** (when opening app) |
| **Lunch Reminder** | Daily lunch prompt | **12:00 PM** (Daily) |
| **Dinner Reminder** | Daily dinner prompt | **7:00 PM** (Daily) |
| **Streak Protection** | If you have a streak but haven't logged today | **Immediate** (when opening app) |
| **Protein Check** | If daily protein is < 50% of goal | **Immediate** (after logging a meal) |
| **Weekly Summary** | Weekly nutrition report | **Sundays at 8:00 PM** |

> **Note:** "Immediate" reminders trigger when you open the app to nudge you right when you are engaged. The Weekly Summary is a scheduled background notification.

## 🚀 Quick Start

```bash
cd health-tracker
npm install
npx expo start
```

Then scan the QR code with Expo Go app on your phone!

---

## 🔥 Firebase Setup (Complete Guide)

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter a project name (e.g., "NutriSnap")
4. Choose whether to enable Google Analytics (optional)
5. Click **"Create project"**
6. Wait for the project to be created, then click **"Continue"**

### Step 2: Register Your App

1. In the Firebase Console, click the **Web icon** (`</>`) to add a web app
2. Enter an app nickname (e.g., "NutriSnap Web")
3. Check **"Also set up Firebase Hosting"** (optional)
4. Click **"Register app"**
5. **Copy the Firebase config object** - you'll need this!

The config looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Step 3: Enable Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click **"Get started"**
3. Click on **"Email/Password"** under Sign-in providers
4. Enable **"Email/Password"** (toggle it ON)
5. Click **"Save"**

### Step 4: Enable Firestore Database

1. In Firebase Console, go to **Build → Firestore Database**
2. Click **"Create database"**
3. Select **"Start in test mode"** (for development)
   - ⚠️ For production, update security rules later
4. Choose a **Cloud Firestore location** closest to your users
5. Click **"Enable"**

**Important: Update Security Rules for Production**

Go to **Firestore Database → Rules** and replace with:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Click **"Publish"**

### Step 5: Enable Cloud Storage

1. In Firebase Console, go to **Build → Storage**
2. Click **"Get started"**
3. Select **"Start in test mode"** (for development)
4. Choose the same location as Firestore
5. Click **"Done"**

**Update Storage Rules for Production:**

Go to **Storage → Rules** and replace with:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Users can only access their own files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
Click **"Publish"**

### Step 6: Update Your App Config

Open `health-tracker/firebaseConfig.js` and replace the config with your own:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

## 🤖 Gemini API Setup

### Option 1: Direct Gemini API Key (Current Method)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API Key"**
3. Select or create a Google Cloud project
4. Copy your API key
5. Add it in the app's Settings screen

### Option 2: Firebase AI (Alternative - More Secure)

Firebase now offers AI features through Vertex AI integration. This is more secure as the API key is server-side.

1. In Firebase Console, go to **Build → AI**
2. Enable Vertex AI in Firebase
3. This requires billing to be enabled on your Google Cloud project
4. Update the app to use Firebase AI SDK instead of direct Gemini calls

**Note:** The current app uses direct Gemini API for simplicity. For production apps with many users, consider Firebase AI for better security and rate limiting.

---

## 📁 Project Structure

```
health-tracker/
├── App.js              # Main app component
├── firebaseConfig.js   # Firebase configuration
├── authService.js      # Authentication logic
├── firestoreService.js # Database operations (meals)
├── storageService.js   # Image storage
├── lib/gemini.js       # AI food analysis
├── package.json        # Dependencies
├── app.json            # Expo configuration
└── assets/             # App icons and images
```

---

## 🎯 How to Use

1. **Sign Up/Sign In** - Create an account or sign in
2. **Set Goals** - Go to Settings and set your daily calorie/macro goals
3. **Snap Food** - Tap the "📸 Snap Food" button and select a food photo
4. **View Analysis** - See the AI-detected food name and nutritional breakdown
5. **Track Progress** - Monitor your daily calories and macros on the home screen
6. **Edit Meals** - Tap any meal to edit nutritional values or delete it
7. **Customize** - Change theme colors and appearance in Settings

---

## 🔧 Technologies Used

- **React Native** - Mobile app framework
- **Expo** - Development platform
- **Firebase Auth** - User authentication
- **Firestore** - Real-time database
- **Firebase Storage** - Image storage
- **Gemini AI** - Food recognition and nutrition analysis
- **React Native Paper** - UI components
- **date-fns** - Date manipulation
- **expo-linear-gradient** - Beautiful gradients

---

## 🍎 Nutritional Data Tracked

For each meal, NutriSnap tracks:

| Nutrient | Unit | Description |
|----------|------|-------------|
| Calories | kcal | Total energy |
| Protein | g | Essential for muscle |
| Carbs | g | Primary energy source |
| Fat | g | Energy and nutrients |
| Fiber | g | Digestive health |
| Sugar | g | Simple carbs |
| Sodium | mg | Electrolyte balance |

---

## 🎨 Customization

- **Daily Goals**: Set your own calorie, protein, carbs, and fat targets
- **Themes**: Choose from 9+ aesthetic color themes
- **Appearance**: Switch between Light, Dark, or System mode
- **Photo Storage**: Toggle saving food photos to cloud

---

## 🔒 Privacy & Security

- All data is stored securely in Firebase
- API keys are encrypted and stored per user
- Authentication required for all operations
- Users can only access their own data
- Photos are stored in secure, user-specific folders

---

## 📱 Screenshots

The app features:
- 🏠 **Home Screen** - Daily calorie progress with macro breakdown
- 📊 **Meal Cards** - Food photos with nutritional tags
- ⚙️ **Settings** - Goal setting and theme customization
- 📸 **Analysis** - AI-powered food recognition

---

## 🆘 Troubleshooting

### "Permission denied" errors
- Check Firestore security rules are properly configured
- Ensure you're signed in to the app

### Photos not uploading
- Check Storage security rules
- Verify your Firebase Storage is enabled

### AI analysis not working
- Verify your Gemini API key is correct
- Check you have API quota remaining
- Ensure the photo is clear and well-lit

### App logs out unexpectedly
- The app uses **AsyncStorage** to keep you logged in.
- If you are being logged out after restarting the app, ensure you have internet access so the session can be refreshed.
- We have enhanced the persistence logic in `firebaseConfig.js`. If this persists, try clearing the app data and logging in again.

### App not syncing
- Check internet connection
- Verify Firebase config is correct
- Check Firestore is enabled in Firebase Console

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 👨‍💻 Developer

Built with ❤️ for health-conscious individuals!

---

**Note**: Make sure to configure Firebase before running the app. See setup instructions above.

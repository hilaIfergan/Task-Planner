// Firebase Configuration
// הוראות הגדרה מפורטות בקובץ FIREBASE_SETUP.md

// העתקי את ההגדרות מ-Firebase Console כאן:
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// בדיקה אם Firebase מוגדר
// אם לא מוגדר, האפליקציה תעבוד עם IndexedDB בלבד (אחסון מקומי)
var USE_FIREBASE = false;
if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    USE_FIREBASE = true;
}

# הוראות הגדרת Firebase לשיתוף נתונים בין דפדפנים

## למה Firebase?
Firebase Firestore מאפשר לשמור את כל המשימות בענן, כך שתוכלי לראות את הנתונים שלך מכל דפדפן או מכשיר.

## שלבי ההגדרה:

### 1. יצירת פרויקט Firebase
1. לך ל-https://console.firebase.google.com
2. לחצי על "Add project" (הוסף פרויקט)
3. הכניסי שם לפרויקט (למשל: "task-planner")
4. לחצי "Continue"
5. בחרי אם להפעיל Google Analytics (אופציונלי) ולחצי "Continue"
6. לחצי "Create project"

### 2. הוספת Web App
1. בפרויקט שיצרת, לחצי על האייקון `</>` (Add app)
2. בחרי "Web" (🌐)
3. הכניסי שם לאפליקציה (למשל: "Task Planner")
4. לחצי "Register app"
5. העתיקי את ההגדרות שמופיעות (firebaseConfig)

### 3. הגדרת Firestore Database
1. בתפריט השמאלי, לחצי על "Firestore Database"
2. לחצי "Create database"
3. בחרי "Start in test mode" (לצורך התחלה)
4. בחרי מיקום (למשל: "europe-west" או "us-central")
5. לחצי "Enable"

### 4. עדכון הקוד
1. פתחי את הקובץ `firebase-config.js`
2. העתיקי את ההגדרות מ-Firebase Console והדבקי במקום:
   ```javascript
   const firebaseConfig = {
       apiKey: "הדבקי כאן",
       authDomain: "הדבקי כאן",
       projectId: "הדבקי כאן",
       storageBucket: "הדבקי כאן",
       messagingSenderId: "הדבקי כאן",
       appId: "הדבקי כאן"
   };
   ```

### 5. הגדרת כללי אבטחה (חשוב!)
1. ב-Firestore Database, לחצי על "Rules"
2. החלפי את הכללים ל:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /tasks/{taskId} {
         // כל אחד יכול לקרוא ולכתוב (לצורך התחלה)
         // בעתיד אפשר להוסיף אימות משתמשים
         allow read, write: if true;
       }
     }
   }
   ```
3. לחצי "Publish"

## איך זה עובד?
- כל משימה נשמרת גם ב-IndexedDB (לעבודה offline) וגם ב-Firebase (לשיתוף)
- כשאת פותחת את האפליקציה, היא מסנכרנת את הנתונים מ-Firebase
- כל שינוי שאת עושה נשלח מיד ל-Firebase
- אם אין חיבור לאינטרנט, הנתונים נשמרים מקומית ומסונכרנים כשהחיבור חוזר

## בדיקה
1. פתחי את האפליקציה בדפדפן אחד
2. הוסיפי משימה
3. פתחי את האפליקציה בדפדפן אחר (או במכשיר אחר)
4. המשימה אמורה להופיע!

## בעיות נפוצות
- **"Firebase לא זמין"** - ודאי שההגדרות ב-`firebase-config.js` נכונות
- **"Permission denied"** - ודאי שכללי האבטחה ב-Firestore מוגדרים נכון
- **נתונים לא מסתנכרנים** - בדקי את הקונסול בדפדפן (F12) לשגיאות

## עלויות
Firebase Firestore בחינם עד:
- 50,000 קריאות/יום
- 20,000 כתיבות/יום
- 20,000 מחיקות/יום
- 1GB אחסון

זה יותר מדי למשימות אישיות! 🎉

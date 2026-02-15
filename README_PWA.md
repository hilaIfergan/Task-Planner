# Task Planner - PWA (Progressive Web App)

אפליקציית Web מתקדמת לתכנון משימות יומיות ושעתיות עם תזכורות.

## תכונות

✅ תצוגה יומית עם breakdown שעתי (0-23)  
✅ יצירה ועריכה של משימות  
✅ סימון משימות שהושלמו  
✅ תכנון מחדש של משימות שלא הושלמו  
✅ תזכורות והתראות  
✅ ממשק בעברית מלא עם RTL  
✅ עבודה offline עם IndexedDB  
✅ Service Worker לאחסון מקומי  
✅ ניתן להוסיף למסך הבית  

## התקנה באייפון

### שלב 1: העלאת הקבצים לשרת
1. העלה את כל הקבצים בתיקייה `PWA` לשרת Web (או GitHub Pages, Netlify, וכו')
2. ודא שהקבצים נגישים דרך HTTPS (חובה ל-PWA)

### שלב 2: פתיחה באייפון
1. פתח את Safari באייפון
2. נווט לכתובת של האפליקציה
3. לחץ על כפתור השיתוף (החץ למעלה)
4. בחר "הוסף למסך הבית"
5. האפליקציה תופיע על המסך כמו אפליקציה רגילה

## התקנה מקומית (לפיתוח)

### אפשרות 1: Python Simple Server
```bash
cd PWA
python3 -m http.server 8000
```
פתח בדפדפן: `http://localhost:8000`

### אפשרות 2: Node.js http-server
```bash
npm install -g http-server
cd PWA
http-server -p 8000
```

### אפשרות 3: VS Code Live Server
1. התקן את ההרחבה "Live Server" ב-VS Code
2. לחץ ימני על `index.html` → "Open with Live Server"

## מבנה הקבצים

```
PWA/
├── index.html              # המסך הראשי
├── manifest.json           # הגדרות PWA
├── service-worker.js       # Service Worker לעבודה offline
├── styles.css              # עיצוב
├── app.js                  # לוגיקה של האפליקציה
├── icon-192.png            # אייקון 192x192 (צריך ליצור)
├── icon-512.png            # אייקון 512x512 (צריך ליצור)
└── README_PWA.md           # קובץ זה
```

## יצירת אייקונים

צריך ליצור שני אייקונים:
- `icon-192.png` - 192x192 פיקסלים
- `icon-512.png` - 512x512 פיקסלים

אפשר להשתמש בכלי כמו:
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

## דרישות

- דפדפן תומך ב-Service Workers (Safari 11.1+, Chrome, Firefox)
- HTTPS (חובה ל-PWA, חוץ מ-localhost)
- IndexedDB support
- Notifications API support

## תכונות טכניות

### אחסון נתונים
- **IndexedDB** - אחסון מקומי של כל המשימות
- **Service Worker Cache** - אחסון קבצי האפליקציה לעבודה offline

### תזכורות
- **Notifications API** - התראות דפדפן
- תזכורות מתוזמנות עם `setTimeout`
- תמיכה בהתראות push (דורש שרת)

### Responsive Design
- עיצוב מותאם למובייל
- תמיכה ב-safe area של iPhone
- ממשק RTL לעברית

## פתרון בעיות

### האפליקציה לא נטענת
- ודא שכל הקבצים נמצאים באותה תיקייה
- ודא שהשרת מחזיר את הקבצים עם headers נכונים
- בדוק את ה-console לדיווחי שגיאות

### Service Worker לא עובד
- ודא שהאתר על HTTPS (או localhost)
- בדוק ב-DevTools → Application → Service Workers
- נסה לרענן את הדף

### תזכורות לא עובדות
- ודא שהרשאות ניתנו בדפדפן
- ב-Safari: Settings → Safari → Notifications
- בדפדפנים אחרים: בדוק את הגדרות ההתראות

### הנתונים לא נשמרים
- בדוק את IndexedDB ב-DevTools → Application → IndexedDB
- ודא שהדפדפן תומך ב-IndexedDB

## הערות חשובות

- כל הנתונים נשמרים מקומית במכשיר
- אין צורך בחיבור לאינטרנט לאחר הטעינה הראשונה
- האפליקציה עובדת במצב offline לחלוטין
- תזכורות דורשות הרשאות מהמשתמש

## שיפורים עתידיים אפשריים

- סנכרון בענן (Firebase, Supabase)
- התראות push אמיתיות
- ייבוא/ייצוא משימות
- קטגוריות ותגיות
- חיפוש משימות

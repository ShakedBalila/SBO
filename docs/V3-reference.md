כן. הייתי הופך את V3 מ"אפליקציה האישית שלך" ל־**Product Specification אמיתי ל-SBO כמוצר לקהל הרחב**, אבל שומר על הפשטות וה-Dashboard שאהבת.

:::writing{variant="document" id="73146" title="SBO — Product Specification V3"}
# SBO — Product Specification V3

## 1. חזון המוצר

**SBO** היא פלטפורמה אישית לניהול ומעקב אחר תחומים שונים בחיי היום-יום מתוך מקום אחד.

במקום להשתמש במספר אפליקציות נפרדות למשימות, שתייה, תזונה, רכב ומעקבים נוספים, המשתמש מקבל Dashboard אישי ומודולרי המרכז את המידע החשוב לו.

### העיקרון המרכזי

**One place. Your life. Your dashboard.**

כל משתמש בונה לעצמו את ה-SBO שמתאים לו.

---

# 2. קהל היעד

SBO אינה מיועדת עוד למשתמש יחיד.

המערכת מתוכננת מראש כמוצר Multi-User שיכול לשרת מספר גדול של משתמשים.

כל משתמש מקבל:

- חשבון אישי
- Dashboard אישי
- נתונים פרטיים
- מודולים פעילים לבחירתו
- הגדרות אישיות
- יעדים אישיים
- היסטוריה אישית
- התראות אישיות

המידע של משתמש אחד מופרד לחלוטין מהמידע של משתמש אחר.

---

# 3. עקרון Product Architecture

SBO תיבנה לפי העיקרון:

## Personal-first. Public-ready.

הגרסה הראשונה יכולה להתחיל עם מספר קטן מאוד של משתמשים, אך הארכיטקטורה לא תניח שקיים משתמש יחיד.

כל מידע במערכת יהיה משויך לחשבון משתמש.

לדוגמה:

User → Tasks

User → Water Logs

User → Vehicles

User → Nutrition

User → Settings

User → Notifications

כך ניתן יהיה להגדיל את מספר המשתמשים בעתיד ללא בנייה מחדש של המערכת.

---

# 4. פלטפורמות

SBO תהיה Web Application.

המערכת תעבוד דרך דפדפן ותותאם ל:

- Desktop
- Laptop
- Smartphone
- Tablet / iPad

הממשק יהיה Responsive.

בעתיד ניתן יהיה לשקול PWA או אפליקציות Native.

---

# 5. חשבון משתמש

כל משתמש יוכל ליצור חשבון אישי.

המערכת תכלול:

- Sign Up
- Login
- Logout
- Forgot Password
- Reset Password
- אימות כתובת אימייל
- ניהול Session
- מחיקת חשבון

בעתיד ניתן יהיה להוסיף:

- Sign in with Google
- Sign in with Apple
- Passkeys
- Two-Factor Authentication

---

# 6. Onboarding

משתמש חדש לא ייכנס ישירות למערכת ריקה.

לאחר יצירת החשבון יופיע תהליך Onboarding קצר.

## שלב 1 — Welcome

הסבר קצר:

SBO מרכזת את המעקבים והארגון האישי שלך במקום אחד.

## שלב 2 — בחירת מודולים

המשתמש יבחר במה הוא רוצה להשתמש.

לדוגמה:

☐ Tasks  
☐ Water  
☐ Car  
☐ Nutrition

המשתמש אינו חייב להפעיל את כולם.

## שלב 3 — הגדרות בסיסיות

בהתאם למודולים שנבחרו, SBO תשאל רק את השאלות הרלוונטיות.

לדוגמה:

Water → יעד שתייה.

Nutrition → יעד קלורי וחלבון.

Car → הוספת רכב.

Tasks → העדפות בסיסיות.

## שלב 4 — Dashboard

המשתמש מגיע ל-SBO האישי שלו.

---

# 7. Main Dashboard

ה-Main Dashboard הוא מרכז המוצר.

הוא מורכב מ-Cards מודולריים.

לדוגמה:

## Tasks

- משימות להיום
- משימות שהושלמו
- Overdue
- Priority

## Water

- כמות שנשתתה
- יעד
- אחוז השלמה

## Car

- הוצאה חודשית
- תדלוק אחרון
- טיפול הבא
- ביטוח / טסט קרובים

## Nutrition

- קלוריות
- חלבון
- אחוז עמידה ביעדים

לחיצה על Card פותחת את ה-Dashboard המלא של אותו מודול.

---

# 8. התאמה אישית של Dashboard

כל משתמש יכול לבחור אילו Cards יוצגו.

לדוגמה:

משתמש א':

Tasks  
Water  
Nutrition

משתמש ב':

Tasks  
Car

משתמש ג':

Water  
Nutrition

בעתיד ניתן יהיה לאפשר:

- שינוי סדר Cards
- שינוי גודל
- הסתרה
- הוספת Widgets
- בחירת מידע שיופיע בכל Card

---

# 9. Navigation

## Desktop

Sidebar קבוע.

אפשרויות לדוגמה:

Home  
Tasks  
Water  
Car  
Nutrition  
History / Analytics  
Notifications  
Settings

## Mobile

Bottom Navigation.

לדוגמה:

Home  
Tasks  
Water  
Nutrition  
More

הניווט יתאים אוטומטית למודולים שהמשתמש הפעיל.

---

# 10. Tasks Module

מערכת ניהול משימות אישית.

כל משימה משויכת למשתמש.

### מידע אפשרי

- Title
- Description
- Category
- Priority
- Status
- Start Date
- Due Date
- Time
- Progress
- Recurrence
- Notes

### תצוגות

Today  
Week  
Upcoming  
Inbox  
Overdue  
Completed

### יכולות

- יצירת משימה
- עריכה
- מחיקה
- השלמה
- דחייה
- משימות חוזרות
- משימות נגררות
- חיפוש
- סינון

היסטוריית הפעולות תישמר לצורך Analytics עתידי.

---

# 11. Water Module

כל משתמש יכול להגדיר יעד שתייה אישי.

### Dashboard

יוצגו:

כמות שנשתתה  
יעד  
אחוז השלמה  
כמות שנותרה

### Quick Add

המשתמש יוכל ליצור מיכלים קבועים.

לדוגמה:

250ml  
500ml  
750ml  
1L

לחיצה אחת מוסיפה את הכמות.

### Visual Progress

אלמנט גרפי יתמלא בהתאם להתקדמות היומית.

### History

Day  
Week  
Month

כולל:

- ממוצע
- עמידה ביעד
- מגמות

---

# 12. Car Module

כל משתמש יכול להוסיף רכב אחד או יותר.

### Vehicle

- Manufacturer
- Model
- Year
- Fuel Type
- License Number
- Current Mileage

### Fuel

כל תדלוק יכול לכלול:

- Date
- Mileage
- Liters
- Price/Liter
- Total Cost

המערכת תחשב:

- Fuel Economy
- Cost per Kilometer
- Monthly Fuel Cost
- Annual Fuel Cost

### Maintenance

- טיפולים
- תיקונים
- מוסכים
- עלויות
- קילומטראז'

### Insurance

- סוג
- חברה
- מחיר
- התחלה
- סיום

### Test / Registration

- תאריך
- תאריך הבא
- עלות
- Reminder

---

# 13. Nutrition Module

כל משתמש מקבל מערכת תזונה אישית.

### Goals

- Daily Calories
- Daily Protein

בעתיד:

- Carbohydrates
- Fat
- Fiber

### Food Logging

אפשרות להוסיף מזון לפי:

- חיפוש
- מזונות שמורים
- Favorites
- הוספה ידנית
- Barcode

### Meals

Breakfast  
Lunch  
Dinner  
Snacks

### Dashboard

Calories:

Consumed / Goal / Remaining

Protein:

Consumed / Goal / Remaining

### History

Daily  
Weekly  
Monthly

---

# 14. Food Database

במוצר ציבורי יש להפריד בין שני סוגי מזונות.

## Global Foods

מוצרים הזמינים לכל המשתמשים.

## Personal Foods

מוצרים שמשתמש מסוים יצר לעצמו.

כך משתמש יכול ליצור למשל:

"השייק הקבוע שלי"

בלי שהמוצר יתווסף אוטומטית למאגר של כל משתמשי SBO.

---

# 15. Supplements

מערכת כללית למעקב תוספים.

לא רק Creatine.

משתמש יכול להוסיף:

- Supplement Name
- Dosage
- Schedule
- Reminder

ולסמן:

Taken / Skipped

המערכת תשמור היסטוריה.

---

# 16. Notifications

לכל משתמש יהיה Notification Center.

התראות יכולות להגיע מתוך:

- Tasks
- Water
- Car
- Nutrition
- Supplements

כל משתמש יבחר אילו התראות הוא רוצה לקבל.

בעתיד ניתן לתמוך ב:

- In-App
- Push
- Email

---

# 17. History

ל-SBO יהיה מנגנון היסטוריה מרכזי.

נתונים חשובים לא ייעלמו לאחר השלמת פעולה.

לדוגמה:

Completed Task  
Fuel Entry  
Water Day  
Nutrition Day  
Vehicle Service

המידע ישמש גם ל-Analytics.

---

# 18. Analytics

Analytics יהיו אישיים לכל משתמש.

### Tasks

- Completion Rate
- Overdue Rate
- Weekly Productivity

### Water

- Daily Average
- Goal Completion
- Weekly Trends

### Car

- Monthly Cost
- Fuel Consumption
- Cost per Kilometer
- Annual Cost

### Nutrition

- Average Calories
- Average Protein
- Goal Completion

---

# 19. Search

חיפוש מרכזי במערכת.

לדוגמה:

"Toyota"

יכול להציג את הרכב ואת הטיפולים שלו.

"Chicken"

יכול להציג מזונות.

"Gym"

יכול להציג משימות.

תוצאות החיפוש יהיו מוגבלות אך ורק למידע שהמשתמש מורשה לראות.

---

# 20. Privacy

Privacy היא דרישת יסוד של SBO.

לכל משתמש תהיה גישה רק למידע שלו.

המערכת צריכה למנוע גישה בין חשבונות גם במקרה של ניסיון לשנות URL או בקשת API באופן ידני.

מידע רגיש לא ייחשף למשתמשים אחרים.

---

# 21. Security

המערכת תתוכנן מראש עם:

- Authentication
- Authorization
- Secure Sessions
- Password Hashing
- HTTPS
- Database Access Rules
- Rate Limiting
- Input Validation
- Protection against common web attacks

הרשאות לא יסתמכו רק על ה-Frontend.

כל בקשה לנתונים תיבדק גם בשרת.

---

# 22. Privacy & Health Data

מכיוון ש-SBO יכולה להכיל מידע הקשור לתזונה, משקל, שתייה ותוספים, יש להתייחס אליו כמידע פרטי ורגיש.

לפני השקה ציבורית יש לבדוק את דרישות הפרטיות והרגולציה הרלוונטיות למדינות שבהן SBO תפעל.

אין להציג חישובים תזונתיים כהמלצה רפואית.

---

# 23. Data Ownership

עיקרון מוצר:

## Your data belongs to you.

המשתמש יוכל:

- לראות את המידע שלו
- לערוך אותו
- למחוק אותו
- לייצא אותו
- למחוק את החשבון

מחיקת חשבון תכלול מנגנון ברור לטיפול בנתוני המשתמש בהתאם למדיניות המוצר והדרישות החוקיות.

---

# 24. Backup

המערכת תבצע גיבויים בצד השרת.

אין להסתמך על המכשיר של המשתמש לצורך שמירת המידע.

בנוסף, ניתן בעתיד לאפשר למשתמש לבצע Export אישי.

---

# 25. Sync

שינוי שמתבצע במכשיר אחד צריך להופיע במכשירים האחרים.

לדוגמה:

המשתמש מוסיף 500ml מים בטלפון.

לאחר פתיחת SBO במחשב, הנתון המעודכן מופיע גם שם.

השרת וה-Database יהיו מקור האמת המרכזי.

---

# 26. מודולריות

SBO לא תהיה מערכת עם ארבעה פיצ'רים קשיחים.

היא תהיה פלטפורמת Modules.

### Launch Modules

Tasks  
Water  
Car  
Nutrition

### Future Modules

Sleep  
Fitness  
Weight  
Habits  
Expenses  
Goals  
Medication  
Mood  
Calendar

הוספת מודול חדש לא אמורה לדרוש שינוי מהותי במודולים הקיימים.

---

# 27. Module Marketplace — Future

בעתיד ניתן לשקול מסך:

**Explore Modules**

המשתמש יוכל להוסיף ולהסיר מודולים מה-SBO שלו.

לדוגמה:

+ Sleep  
+ Expenses  
+ Fitness

אין צורך לבנות Marketplace אמיתי ב-V1.

אבל הארכיטקטורה צריכה לאפשר את הרעיון.

---

# 28. מערכת הרשאות עתידית

ב-V1 כל חשבון הוא אישי.

בעתיד ניתן לשקול:

- Family
- Couple
- Shared Vehicle
- Shared Tasks
- Coach / Client
- Business / Team

לכן מבנה הנתונים לא צריך להניח שכל אובייקט יכול להיות שייך אך ורק למשתמש יחיד לנצח.

עם זאת, Sharing אינו חלק מה-MVP.

---

# 29. Admin System

כאשר SBO הופכת למוצר ציבורי, נדרש Dashboard נפרד למנהל המערכת.

Admin יוכל לראות מידע תפעולי כגון:

- מספר משתמשים
- Signups
- Active Users
- System Errors
- Module Usage
- Storage Usage
- System Health

Admin לא אמור לקבל גישה חופשית למידע האישי של משתמשים רק משום שהוא Admin.

---

# 30. Observability

במוצר ציבורי צריך לדעת כאשר משהו נשבר.

המערכת תתוכנן לתמוך ב:

- Error Logging
- Performance Monitoring
- Server Logs
- Database Monitoring
- Failed Requests
- Backup Monitoring

---

# 31. Subscription Ready

אין חובה לגבות כסף בגרסה הראשונה.

אבל כדאי שמבנה המוצר יאפשר בעתיד:

### Free

מודולים ויכולות בסיסיות.

### Premium

יכולות מתקדמות.

### Future

Family / Pro / Additional Plans

אין צורך לבנות Billing ב-MVP.

---

# 32. Feature Entitlements

אין לקודד פיצ'רים בצורה שמניחה שכל משתמש מקבל תמיד הכול.

בעתיד המערכת תוכל לדעת אילו יכולות זמינות לכל משתמש בהתאם ל:

- Plan
- Module
- Permissions
- Experimental Features

---

# 33. Feature Flags

רצוי לאפשר הפעלה הדרגתית של יכולות.

לדוגמה:

Barcode Scanner מופעל תחילה ל-5% מהמשתמשים.

לאחר בדיקות:

25%

50%

100%

כך ניתן להשיק פיצ'רים חדשים בצורה מבוקרת.

---

# 34. Localization

המערכת תיבנה מראש כך שתוכל לתמוך במספר שפות.

לדוגמה:

עברית  
English

חשוב במיוחד לתכנן תמיכה ב:

RTL — Hebrew

LTR — English

טקסטים בממשק לא יהיו מקודדים בצורה שתמנע תרגום עתידי.

---

# 35. Units

משתמשים במדינות שונות משתמשים ביחידות שונות.

לכן SBO צריכה להיות מוכנה ל:

### Water

ml / L / oz

### Weight

kg / lb

### Distance

km / miles

### Fuel

L/100km  
km/L  
MPG

### Currency

₪  
$  
€  
ומטבעות נוספים.

---

# 36. Time & Date

כל משתמש יוכל להיות באזור זמן שונה.

לכן יש להפריד בין:

- הזמן הנשמר במערכת
- Timezone של המשתמש
- הדרך שבה הזמן מוצג

אותו עיקרון חל על פורמט תאריך ושעה.

---

# 37. Accessibility

הממשק צריך להתחשב גם בנגישות.

לדוגמה:

- Contrast
- Keyboard Navigation
- Screen Readers
- Touch Targets
- Font Scaling

צבע לא יהיה הדרך היחידה להעביר סטטוס.

לדוגמה:

משימה דחופה לא תהיה רק אדומה — היא תקבל גם סימון או טקסט.

---

# 38. Responsive UX

## Desktop

Sidebar + Dashboard רחב.

## Tablet

Dashboard מותאם ל-2–3 Cards בשורה.

## Mobile

Cards אנכיים / Grid מצומצם.

Bottom Navigation.

פעולות נפוצות יהיו נגישות ביד אחת.

---

# 39. Design System

SBO תקבל Design System אחיד.

כל מודול יקבל זהות משלו, אך יישאר חלק מאותה מערכת.

לדוגמה:

Tasks → Blue

Water → Light Blue

Car → Green

Nutrition → Orange

הצבע אינו הדרך היחידה לזהות את המודול.

לכל מודול יהיו גם:

- Icon
- Name
- Visual Language

---

# 40. Quick Actions

אחת ממטרות המוצר היא לצמצם חיכוך.

פעולות נפוצות צריכות להיות מהירות מאוד.

לדוגמה:

**Water**

+500ml

לחיצה אחת.

**Tasks**

Complete

לחיצה אחת.

**Nutrition**

Favorite Food → Add

מספר לחיצות מינימלי.

**Car**

Add Fuel

טופס קצר וברור.

---

# 41. Empty States

מכיוון שמשתמש חדש מתחיל ללא מידע, לכל מודול יהיה Empty State איכותי.

במקום להציג מסך ריק:

### Water

"עדיין לא רשמת שתייה היום."

[ + Add Water ]

### Car

"עוד לא הוספת רכב."

[ + Add Vehicle ]

כך SBO מדריכה את המשתמש מה לעשות.

---

# 42. Error States

יש לתכנן גם מה קורה כאשר משהו נכשל.

לדוגמה:

- אין אינטרנט
- שמירה נכשלה
- Barcode לא נמצא
- Server unavailable
- Session expired

המערכת תציג הודעה ברורה ותנסה למנוע אובדן מידע.

---

# 43. Offline / Poor Connection — Future

בעתיד ניתן לשקול יכולות Offline.

לדוגמה:

המשתמש מוסיף מים ללא אינטרנט.

המידע נשמר זמנית במכשיר ומסתנכרן כאשר החיבור חוזר.

אין חובה לממש זאת ב-MVP.

---

# 44. Public Product Analytics

בנוסף ל-Analytics האישי של המשתמש, SBO תצטרך בעתיד Product Analytics.

לדוגמה:

- כמה משתמשים נרשמים
- כמה מסיימים Onboarding
- איזה מודול הכי נפוץ
- Daily Active Users
- Weekly Active Users
- Retention
- Feature Adoption

Analytics של המוצר צריכים להיבנות תוך התחשבות בפרטיות המשתמשים.

---

# 45. MVP ציבורי

ה-MVP לא צריך לכלול את כל החזון.

## Account

Sign Up  
Login  
Password Reset  
Settings

## Onboarding

בחירת מודולים.

## Dashboard

Cards אישיים.

## Tasks

ניהול משימות בסיסי ומלא.

## Water

מעקב יומי.

## Car

רכב + תדלוקים + טיפולים בסיסיים.

## Nutrition

קלוריות + חלבון + מזונות.

## System

Database  
Multi-user  
Responsive  
Authentication  
Authorization  
Backup  
Basic Notifications

---

# 46. מה לא בונים ב-MVP

לא נבנה עדיין:

- Social Network
- Friends
- Community
- Marketplace מלא
- Family Sharing
- AI Assistant
- Native Apps
- Apple Health Integration
- Google Health Integration
- Smartwatch
- Advanced Analytics
- Full Offline Mode
- Complex Billing
- Enterprise Features

העיקרון:

**לא לבנות עכשיו את העתיד — רק לא לחסום אותו.**

---

# 47. שלבי הפיתוח

## Phase 1 — Product & UX

אפיון המסכים וחוויית המשתמש.

## Phase 2 — Technical Architecture

Frontend  
Backend  
Database  
Authentication  
Hosting  
Security

## Phase 3 — Core Platform

Users  
Sessions  
Modules  
Settings  
Dashboard

## Phase 4 — Modules

Tasks  
Water  
Car  
Nutrition

## Phase 5 — Notifications & History

## Phase 6 — Testing

Desktop  
Mobile  
Tablet  
Security  
Multi-user isolation

## Phase 7 — Private Alpha

שימוש אישי ומשתמשים בודדים.

## Phase 8 — Closed Beta

קבוצת משתמשים קטנה.

## Phase 9 — Public Beta

פתיחה הדרגתית.

## Phase 10 — Public Launch

---

# 48. אסטרטגיית השקה

למרות שהמערכת מתוכננת לקהל הרחב, לא מומלץ להתחיל ישר עם קהל גדול.

המסלול המומלץ:

**Personal Use**

↓

**Private Alpha**

↓

**Friends / Test Users**

↓

**Closed Beta**

↓

**Public Beta**

↓

**Public Product**

כך ניתן ללמוד איך אנשים באמת משתמשים ב-SBO לפני השקעה גדולה בתשתיות ובפיצ'רים.

---

# 49. North Star

SBO מצליחה כאשר המשתמש פותח אותה באופן טבעי כחלק מהיום שלו.

המטרה אינה לגרום למשתמש להזין כמה שיותר מידע.

המטרה היא:

**לתת למשתמש תמונה ברורה של הדברים שחשובים לו — עם מינימום מאמץ.**

---

# 50. הגדרת SBO V3

**SBO היא פלטפורמת Personal Dashboard מודולרית המאפשרת לכל משתמש לבחור, לנהל ולעקוב אחר התחומים החשובים לו מתוך מערכת אחת, פרטית, פשוטה ומותאמת אישית.**

המערכת מתחילה בארבעה מודולים:

**Tasks • Water • Car • Nutrition**

אך הארכיטקטורה, ה-UX ומבנה הנתונים מתוכננים מראש כך שהמוצר יוכל לצמוח למודולים נוספים, מספר רב של משתמשים ומודל עסקי בעתיד.

## Product Principle

**Simple enough for one person.  
Built correctly for many.**
:::

מבחינתי **V3 צריך להחליף את V2 כמסמך האב של הפרויקט**. V2 עדיין שימושי כהיסטוריה של הרעיון המקורי, אבל מכאן הייתי מקבל את ההחלטות הטכניות לפי V3.

והדבר החשוב: זה **לא אומר שאנחנו צריכים לבנות עכשיו SaaS ענק**. להפך — נבנה גרסה ראשונה פשוטה בשבילך, רק עם Database, Users והרשאות בצורה נכונה מההתחלה. כך אתה תהיה למעשה **User #1 של SBO**.

השלב הבא שלנו יכול להיות **V3.1 — UX/UI Specification**, ושם כבר הייתי יורד למסכים עצמם: Login → Onboarding → Main Dashboard → Tasks → Water → Car → Nutrition, כולל מה בדיוק נמצא בכל Card ובכל לחיצה.

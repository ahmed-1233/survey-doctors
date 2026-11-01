# دليل أطباء السيرفي

نظام لإدارة أطباء السيرفي: تبحث بالاختصاص والمنطقة (مثل "الحي اطفال")، وتضيف وتعدّل وتحذف. HTML وCSS وJavaScript عادي بدون framework، والبيانات على Supabase.

## هيكل المشروع

```
survey-doctors/
├── index.html          الصفحة
├── css/style.css       التصميم (الألوان كلها بـ :root فوق)
├── js/config.js        مفاتيح Supabase ← أول ملف تعدّله
├── js/seed.js          بيانات السيرفي (134 طبيب) للوضع المحلي
├── js/store.js         طبقة البيانات: Supabase أو localStorage
├── js/app.js           البحث، الفلاتر، الإضافة والتعديل
└── supabase/
    ├── schema.sql      الجدول والصلاحيات والـ Realtime
    └── seed.sql        إدخال الـ 134 طبيب
```

## التشغيل

### 1) شغّله محلياً أول شي
1. افتح المجلد بـ VS Code.
2. نزّل إضافة **Live Server**.
3. كليك يمين على `index.html` واختار **Open with Live Server**.

يشتغل فوراً بالوضع المحلي: البيانات تنحفظ على متصفحك بس.

### 2) اربطه بـ Supabase حتى تصير البيانات مشتركة
1. سوّي مشروع جديد على supabase.com.
2. روح **SQL Editor** وشغّل `supabase/schema.sql`.
3. شغّل `supabase/seed.sql` حتى يدخل الـ 134 طبيب.
4. من **Project Settings → API** انسخ `Project URL` و `anon public key`.
5. حطهم بـ `js/config.js`.
6. حدّث الصفحة. هسه أي تعديل يوصل لكل الأجهزة مباشرة.

### 3) انشره أونلاين
اسحب المجلد على **Netlify Drop** (app.netlify.com/drop)، أو ارفعه على GitHub وانشره بـ **Vercel** أو **GitHub Pages**. ماكو build، ملفات ثابتة بس.

## ملاحظات
- **الأمان:** الصلاحيات هسه مفتوحة، يعني أي واحد عنده الرابط يكدر يعدّل. إذا تريد تسجيل دخول، غيّر `anon` إلى `authenticated` بـ `schema.sql` وضيف Supabase Auth.
- **الألوان:** كلها متغيرات بـ `:root` بأول `style.css`، و `--brand` هو اللون الأزرق.
- **فهم البحث:** الكلمات اللي يفهمها البحث (عظام = كسور، كلية = جراحة كلى…) بدالة `rebuild()` بـ `app.js`.

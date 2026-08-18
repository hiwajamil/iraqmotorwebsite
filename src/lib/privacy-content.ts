import type { Locale } from "@/lib/i18n";

export type PrivacySection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type PrivacyDoc = {
  title: string;
  lastUpdated: string;
  intro: string;
  sections: PrivacySection[];
};

const en: PrivacyDoc = {
  title: "Privacy Policy",
  lastUpdated: "Last updated: 17 August 2026",
  intro:
    "Iraq Motors (“we”, “us”) operates iraqmotors.net and the Iraq Motors mobile app — a marketplace for buying and selling cars in Iraq. This policy explains what personal information we collect, how we use it, and the choices you have.",
  sections: [
    {
      heading: "Who this applies to",
      paragraphs: [
        "This policy covers the Iraq Motors website, mobile applications, and related APIs. By creating an account, listing a vehicle, contacting a seller, submitting a help request, or otherwise using our services, you agree to this policy.",
      ],
    },
    {
      heading: "Information we collect",
      paragraphs: [
        "The information we collect depends on how you use Iraq Motors:",
      ],
      bullets: [
        "Account details: phone number, email address, display name, city, account type (individual or showroom), showroom name, owner name, and profile photo. Sign-in is handled by Firebase Authentication.",
        "Listings: vehicle details, photos, price, location, and other information you submit when you sell a car. Public listing details may be visible to other users.",
        "Messages and bids: in-app messages, bid amounts, and related contact details you share with other users.",
        "Help and lead requests: name, email, WhatsApp number, and the reason you contacted us.",
        "Payments: if you buy a listing boost, we record order status and references. Card details are processed by N-Genius; we do not store full card numbers.",
        "Device and usage: pages and screens you view, general device information, and approximate location derived from IP. We use Google Analytics with IP anonymization. The mobile app may receive push notifications via Firebase Cloud Messaging.",
        "Security: Cloudflare Turnstile (website) or Firebase App Check (app) to reduce automated abuse.",
        "Preferences stored on your device: language, theme, and whether you dismissed the help widget.",
      ],
    },
    {
      heading: "How we use information",
      paragraphs: ["We use personal information to:"],
      bullets: [
        "Provide, operate, and improve the marketplace, including listings, search, comparison, messages, and your account.",
        "Verify accounts, prevent fraud and spam, and keep the platform secure.",
        "Process listing payments and send related receipts or status updates.",
        "Respond to support requests and follow up on help-widget submissions.",
        "Send optional alerts you choose (such as price or new-match alerts) and, on the app, push notifications.",
        "Understand how the service is used so we can improve it (analytics).",
        "Comply with legal obligations and enforce our terms.",
      ],
    },
    {
      heading: "How we share information",
      paragraphs: [
        "We do not sell your personal information. We share it only as needed to run the service:",
      ],
      bullets: [
        "Other users: public listing information (such as vehicle details, photos, city, and seller display name). Phone numbers are shared when you choose to be contacted, or when a buyer uses in-app contact features.",
        "Service providers: Firebase (authentication, notifications, and related Google services), Cloudflare (hosting, image storage, and bot protection), Google Analytics, and N-Genius (payments).",
        "Legal and safety: if required by law, or to protect users, our rights, or the integrity of the marketplace.",
      ],
    },
    {
      heading: "Cookies and similar technologies",
      paragraphs: [
        "The website uses essential storage for sign-in, language, and theme. Google Analytics may set cookies to measure traffic, with IP anonymization enabled. You can block analytics cookies in your browser; the site will still work. The mobile app uses similar on-device storage for preferences and authentication.",
      ],
    },
    {
      heading: "Retention",
      paragraphs: [
        "We keep account, listing, message, payment, and support records for as long as needed to provide the service, resolve disputes, and meet legal or accounting requirements. You may ask us to delete your account; some records may be retained where we have a legitimate need (for example, completed payments or abuse prevention).",
      ],
    },
    {
      heading: "Your choices",
      paragraphs: [
        "You can update your profile and notification preferences in account settings. You can sign out at any time. To request access, correction, or deletion of your personal information, contact us using the help widget on this website. We may need to verify that the request comes from the account holder.",
      ],
    },
    {
      heading: "Children",
      paragraphs: [
        "Iraq Motors is not directed at children. You must be old enough under applicable law to enter a contract. We do not knowingly collect personal information from children under 13. If you believe a child has provided us information, contact us and we will delete it.",
      ],
    },
    {
      heading: "International processing",
      paragraphs: [
        "Our providers (including Google/Firebase, Cloudflare, and N-Genius) may process data on servers outside Iraq. By using Iraq Motors you understand that your information may be transferred to and stored in those locations, with safeguards those providers apply.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "We may update this policy from time to time. The “Last updated” date at the top will change when we do. Continued use of Iraq Motors after an update means you accept the revised policy.",
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        "Questions about this policy or your data: use the help widget on iraqmotors.net, or write to us at Iraq Motors, Iraq. This page is the privacy policy for both the website and the Iraq Motors mobile app.",
      ],
    },
  ],
};

const ar: PrivacyDoc = {
  title: "سياسة الخصوصية",
  lastUpdated: "آخر تحديث: ١٧ آب / أغسطس ٢٠٢٦",
  intro:
    "تدير Iraq Motors («نحن») موقع iraqmotors.net وتطبيق Iraq Motors — سوقاً لبيع وشراء السيارات في العراق. توضح هذه السياسة المعلومات الشخصية التي نجمعها، وكيف نستخدمها، والخيارات المتاحة لك.",
  sections: [
    {
      heading: "من تشمل هذه السياسة",
      paragraphs: [
        "تغطي هذه السياسة موقع Iraq Motors وتطبيقاته وواجهات البرمجة المرتبطة به. بإنشاء حساب، أو نشر إعلان، أو التواصل مع بائع، أو إرسال طلب مساعدة، أو استخدام خدماتنا بأي شكل، فإنك توافق على هذه السياسة.",
      ],
    },
    {
      heading: "المعلومات التي نجمعها",
      paragraphs: ["تعتمد المعلومات التي نجمعها على طريقة استخدامك للمنصة:"],
      bullets: [
        "بيانات الحساب: رقم الهاتف، البريد الإلكتروني، الاسم الظاهر، المدينة، نوع الحساب (فرد أو معرض)، اسم المعرض، اسم المالك، وصورة الملف. يتم تسجيل الدخول عبر Firebase Authentication.",
        "الإعلانات: تفاصيل المركبة، الصور، السعر، الموقع، وأي معلومات تقدمها عند البيع. قد تظهر تفاصيل الإعلان للعامة.",
        "الرسائل والعروض: الرسائل داخل التطبيق، مبالغ العروض، وبيانات التواصل التي تشاركها مع مستخدمين آخرين.",
        "طلبات المساعدة: الاسم، البريد الإلكتروني، رقم واتساب، وسبب التواصل.",
        "المدفوعات: إذا اشتريت تعزيزاً للإعلان، نسجّل حالة الطلب والمراجع. تتم معالجة بيانات البطاقة عبر N-Genius ولا نخزّن أرقام البطاقات كاملة.",
        "الجهاز والاستخدام: الصفحات والشاشات التي تزورها، معلومات عامة عن الجهاز، وموقع تقريبي من عنوان IP. نستخدم Google Analytics مع إخفاء عنوان IP. قد يتلقى التطبيق إشعارات عبر Firebase Cloud Messaging.",
        "الأمان: Cloudflare Turnstile (الموقع) أو Firebase App Check (التطبيق) للحد من الإساءة الآلية.",
        "تفضيلات على جهازك: اللغة، المظهر، وما إذا أغلقت أداة المساعدة.",
      ],
    },
    {
      heading: "كيف نستخدم المعلومات",
      paragraphs: ["نستخدم المعلومات الشخصية من أجل:"],
      bullets: [
        "تقديم السوق وتشغيله وتحسينه، بما في ذلك الإعلانات والبحث والمقارنة والرسائل وحسابك.",
        "التحقق من الحسابات، ومنع الاحتيال والرسائل المزعجة، والحفاظ على أمان المنصة.",
        "معالجة مدفوعات تعزيز الإعلانات وإرسال الإيصالات أو تحديثات الحالة.",
        "الرد على طلبات الدعم ومتابعة نماذج المساعدة.",
        "إرسال التنبيهات التي تختارها (مثل تنبيهات السعر أو المطابقات الجديدة) وإشعارات التطبيق.",
        "فهم كيفية استخدام الخدمة لتحسينها (التحليلات).",
        "الامتثال للالتزامات القانونية وتطبيق شروطنا.",
      ],
    },
    {
      heading: "كيف نشارك المعلومات",
      paragraphs: [
        "لا نبيع معلوماتك الشخصية. نشاركها فقط بالقدر اللازم لتشغيل الخدمة:",
      ],
      bullets: [
        "المستخدمون الآخرون: معلومات الإعلان العامة (مثل تفاصيل المركبة والصور والمدينة واسم البائع). تُشارك أرقام الهاتف عندما تختار أن يتم التواصل معك أو عند استخدام ميزات التواصل داخل التطبيق.",
        "مقدمو الخدمات: Firebase (المصادقة والإشعارات وخدمات Google ذات الصلة)، وCloudflare (الاستضافة وتخزين الصور والحماية من الروبوتات)، وGoogle Analytics، وN-Genius (المدفوعات).",
        "القانون والسلامة: إذا طُلب ذلك قانوناً، أو لحماية المستخدمين أو حقوقنا أو سلامة السوق.",
      ],
    },
    {
      heading: "ملفات تعريف الارتباط والتقنيات المشابهة",
      paragraphs: [
        "يستخدم الموقع تخزيناً أساسياً لتسجيل الدخول واللغة والمظهر. قد يضع Google Analytics ملفات تعريف ارتباط لقياس الزيارات مع تفعيل إخفاء عنوان IP. يمكنك حظر ملفات التحليلات من المتصفح وسيبقى الموقع يعمل. يستخدم التطبيق تخزيناً مشابهاً على الجهاز للتفضيلات والمصادقة.",
      ],
    },
    {
      heading: "مدة الاحتفاظ",
      paragraphs: [
        "نحتفظ بسجلات الحساب والإعلانات والرسائل والمدفوعات والدعم طالما كان ذلك لازماً لتقديم الخدمة وحل النزاعات والوفاء بالمتطلبات القانونية أو المحاسبية. يمكنك طلب حذف حسابك؛ وقد نحتفظ ببعض السجلات عند وجود حاجة مشروعة (مثل المدفوعات المكتملة أو منع الإساءة).",
      ],
    },
    {
      heading: "خياراتك",
      paragraphs: [
        "يمكنك تحديث ملفك الشخصي وتفضيلات الإشعارات من إعدادات الحساب. يمكنك تسجيل الخروج في أي وقت. لطلب الاطلاع على معلوماتك أو تصحيحها أو حذفها، تواصل معنا عبر أداة المساعدة في هذا الموقع. قد نحتاج إلى التحقق من أن الطلب صادر عن صاحب الحساب.",
      ],
    },
    {
      heading: "الأطفال",
      paragraphs: [
        "Iraq Motors غير موجّه للأطفال. يجب أن تكون في سن يسمح لك قانوناً بإبرام عقد. لا نجمع عن علم معلومات شخصية من أطفال دون 13 عاماً. إذا اعتقدت أن طفلاً قدّم لنا معلومات، تواصل معنا وسنحذفها.",
      ],
    },
    {
      heading: "المعالجة الدولية",
      paragraphs: [
        "قد يعالج مقدمو الخدمة لدينا (بما في ذلك Google/Firebase وCloudflare وN-Genius) البيانات على خوادم خارج العراق. باستخدامك Iraq Motors فإنك تدرك أن معلوماتك قد تُنقل وتُخزَّن في تلك المواقع وفقاً للضمانات التي يطبقها هؤلاء المزودون.",
      ],
    },
    {
      heading: "التغييرات",
      paragraphs: [
        "قد نحدّث هذه السياسة من وقت لآخر. يتغيّر تاريخ «آخر تحديث» في أعلى الصفحة عند ذلك. استمرارك في استخدام Iraq Motors بعد التحديث يعني قبولك للسياسة المعدّلة.",
      ],
    },
    {
      heading: "التواصل",
      paragraphs: [
        "للاستفسارات حول هذه السياسة أو بياناتك: استخدم أداة المساعدة على iraqmotors.net، أو راسلنا على Iraq Motors، العراق. هذه الصفحة هي سياسة الخصوصية للموقع ولتطبيق Iraq Motors.",
      ],
    },
  ],
};

const ku: PrivacyDoc = {
  title: "سیاسەتی تایبەتمەندی",
  lastUpdated: "دوایین نوێکردنەوە: ١٧ی ئاب ٢٠٢٦",
  intro:
    "Iraq Motors («ئێمە») iraqmotors.net و ئەپی Iraq Motors بەڕێوە دەبات — بازاڕێک بۆ کڕین و فرۆشتنی ئۆتۆمبێل لە عێراق. ئەم سیاسەتە ڕوونی دەکاتەوە چ زانیارییەکی کەسی کۆدەکەینەوە، چۆن بەکاری دەهێنین، و چ بژاردەیەکت هەیە.",
  sections: [
    {
      heading: "ئەم سیاسەتە بۆ کێیە",
      paragraphs: [
        "ئەم سیاسەتە ماڵپەڕی Iraq Motors، ئەپەکان و APIـی پەیوەندیدار دەگرێتەوە. بە دروستکردنی هەژمار، بڵاوکردنەوەی ڕیکلام، پەیوەندی بە فرۆشیار، ناردنی داواکاری یارمەتی، یان بەکارهێنانی خزمەتگوزارییەکانمان، ڕەزامەندی لەسەر ئەم سیاسەتە دەدەیت.",
      ],
    },
    {
      heading: "زانیارییەکانی کۆدەکەینەوە",
      paragraphs: [
        "ئەو زانیارییانەی کۆدەکەینەوە پشت بە چۆنیەتی بەکارهێنانت دەبەستێت:",
      ],
      bullets: [
        "وردەکاری هەژمار: ژمارەی مۆبایل، ئیمەیڵ، ناوی پیشاندان، شار، جۆری هەژمار (تاکەکەس یان شۆڕووم)، ناوی شۆڕووم، ناوی خاوەن، و وێنەی پرۆفایل. چوونەژوورەوە لە ڕێگەی Firebase Authenticationـەوە دەکرێت.",
        "ڕیکلامەکان: وردەکاری ئۆتۆمبێل، وێنە، نرخ، شوێن، و زانیاری دیکە کە لە کاتی فرۆشتندا پێشکەشی دەکەیت. وردەکاری گشتی ڕیکلامەکە ڕەنگە بۆ بەکارهێنەرانی دیکە دیاربێت.",
        "نامە و پێشنیارەکان: نامەکانی ناو ئەپ، بڕی پێشنیار، و زانیاری پەیوەندی کە لەگەڵ بەکارهێنەرانی دیکە هاوبەشی دەکەیت.",
        "داواکاری یارمەتی: ناو، ئیمەیڵ، ژمارەی واتساپ، و هۆکاری پەیوەندیکردن.",
        "پارەدان: ئەگەر بەهێزکردنی ڕیکلام بکڕیت، دۆخی داواکاری و ژمارەی ئاماژە تۆمار دەکەین. زانیاری کارت لە ڕێگەی N-Geniusـەوە چارەسەر دەکرێت؛ ژمارەی تەواوی کارت هەڵناگرین.",
        "ئامێر و بەکارهێنان: پەڕە و شاشەکانی سەردانت، زانیاری گشتی ئامێر، و شوێنی نزیکەیی لە IP. Google Analytics بە نهێنیکردنی IP بەکاردەهێنین. ئەپەکە ڕەنگە ئاگادارکردنەوە لە ڕێگەی Firebase Cloud Messaging وەربگرێت.",
        "ئاسایش: Cloudflare Turnstile (ماڵپەڕ) یان Firebase App Check (ئەپ) بۆ کەمکردنەوەی خراپەکاری ئۆتۆماتیکی.",
        "هەڵبژاردەکانی سەر ئامێرەکەت: زمان، ڕووکار، و ئەوەی ئامرازی یارمەتیت داخستووە یان نا.",
      ],
    },
    {
      heading: "چۆن زانیاری بەکاردەهێنین",
      paragraphs: ["زانیاری کەسی بۆ ئەم مەبەستانە بەکاردەهێنین:"],
      bullets: [
        "پێشکەشکردن، کارپێکردن و باشترکردنی بازاڕەکە، لەوانە ڕیکلام، گەڕان، بەراورد، نامە و هەژمارەکەت.",
        "پشتڕاستکردنەوەی هەژمار، ڕێگری لە فێڵ و سپام، و پاراستنی سەلامەتی پلاتفۆرمەکە.",
        "چارەسەرکردنی پارەدانی بەهێزکردنی ڕیکلام و ناردنی وەسڵ یان نوێکردنەوەی دۆخ.",
        "وەڵامدانەوەی داواکاری پشتگیری و شوێنکەوتنی فۆرمی یارمەتی.",
        "ناردنی ئاگادارکردنەوە هەڵبژێردراوەکان (وەک ئاگاداری نرخ یان هاوتای نوێ) و ئاگادارکردنەوەی ئەپ.",
        "تێگەیشتن لە چۆنیەتی بەکارهێنانی خزمەتگوزاری بۆ باشترکردنی (شیکاری).",
        "جێبەجێکردنی ئەرکی یاسایی و مەرجەکانمان.",
      ],
    },
    {
      heading: "چۆن زانیاری هاوبەش دەکەین",
      paragraphs: [
        "زانیاری کەسیت نانفرۆشین. تەنها بەو بڕەی پێویستە بۆ کارپێکردنی خزمەتگوزاری هاوبەشی دەکەین:",
      ],
      bullets: [
        "بەکارهێنەرانی دیکە: زانیاری گشتی ڕیکلام (وەک وردەکاری ئۆتۆمبێل، وێنە، شار، و ناوی فرۆشیار). ژمارەی مۆبایل هاوبەش دەکرێت کاتێک هەڵدەبژێریت پەیوەندیت پێوە بکرێت، یان کاتێک تایبەتمەندی پەیوەندی ناو ئەپ بەکاردەهێنرێت.",
        "دابینکەرانی خزمەتگوزاری: Firebase (ناسنامە، ئاگادارکردنەوە و خزمەتگوزارییەکانی Google)، Cloudflare (هۆست، هەڵگرتنی وێنە و پاراستن لە بۆت)، Google Analytics، و N-Genius (پارەدان).",
        "یاسا و سەلامەتی: ئەگەر یاسا داوای بکات، یان بۆ پاراستنی بەکارهێنەران، مافەکانمان، یان سەلامەتی بازاڕەکە.",
      ],
    },
    {
      heading: "کووکی و تەکنەلۆژیای هاوشێوە",
      paragraphs: [
        "ماڵپەڕەکە هەڵگرتنی پێویست بەکاردەهێنێت بۆ چوونەژوورەوە، زمان و ڕووکار. Google Analytics ڕەنگە کووکی دابنێت بۆ پێوانی هاتوچۆ، لەگەڵ نهێنیکردنی IP. دەتوانیت کووکیی شیکاری لە وێبگەڕەکەتدا ڕێگری لێ بکەیت؛ ماڵپەڕەکە هەر کار دەکات. ئەپەکە هەڵگرتنی هاوشێوە لەسەر ئامێر بۆ هەڵبژاردە و ناسنامە بەکاردەهێنێت.",
      ],
    },
    {
      heading: "ماوەی هێشتنەوە",
      paragraphs: [
        "تۆمارەکانی هەژمار، ڕیکلام، نامە، پارەدان و پشتگیری هەڵدەگرین تا ئەو کاتەی پێویستە بۆ پێشکەشکردنی خزمەتگوزاری، چارەسەرکردنی ناکۆکی، و پێداویستی یاسایی یان ژمێریاری. دەتوانیت داوای سڕینەوەی هەژمار بکەیت؛ هەندێک تۆمار ڕەنگە بهێڵرێنەوە کاتێک پێویستییەکی ڕەوا هەیە (بۆ نموونە پارەدانی تەواوکراو یان ڕێگری لە خراپەکاری).",
      ],
    },
    {
      heading: "بژاردەکانت",
      paragraphs: [
        "دەتوانیت پرۆفایل و هەڵبژاردەی ئاگادارکردنەوە لە ڕێکخستنی هەژمار نوێ بکەیتەوە. دەتوانیت لە هەر کاتێکدا بچیتە دەرەوە. بۆ داوای دەستگەیشتن، ڕاستکردنەوە، یان سڕینەوەی زانیاری کەسیت، لە ڕێگەی ئامرازی یارمەتی ئەم ماڵپەڕە پەیوەندیمان پێوە بکە. ڕەنگە پێویست بێت پشتڕاست بکەینەوە کە داواکارییەکە لە خاوەنی هەژمارەوەیە.",
      ],
    },
    {
      heading: "منداڵان",
      paragraphs: [
        "Iraq Motors بۆ منداڵان نییە. دەبێت تەمەنت ئەوەندە بێت کە یاسا ڕێگەت پێبدات گرێبەست ببەستیت. بە زانین زانیاری کەسی لە منداڵانی خوار ١٣ ساڵ کۆناکەینەوە. ئەگەر پێت وایە منداڵێک زانیاری پێشکەش کردووە، پەیوەندیمان پێوە بکە بۆ سڕینەوەی.",
      ],
    },
    {
      heading: "چارەسەری نێودەوڵەتی",
      paragraphs: [
        "دابینکەرەکانمان (لەوانە Google/Firebase، Cloudflare و N-Genius) ڕەنگە داتا لە سێرڤەری دەرەوەی عێراق چارەسەر بکەن. بە بەکارهێنانی Iraq Motors تێدەگەیت کە زانیارییەکانت ڕەنگە بگوازرێنەوە و لەو شوێنانە هەڵبگیرێن، بەو پاراستنانەی ئەو دابینکارانە جێبەجێی دەکەن.",
      ],
    },
    {
      heading: "گۆڕانکارییەکان",
      paragraphs: [
        "ڕەنگە ئەم سیاسەتە لە کاتێک بۆ کاتێکی دیکە نوێ بکەینەوە. بەرواری «دوایین نوێکردنەوە» لە سەرەوە دەگۆڕێت. بەردەوامبوون لە بەکارهێنانی Iraq Motors دوای نوێکردنەوە واتای قبوڵکردنی سیاسەتی نوێکراوە.",
      ],
    },
    {
      heading: "پەیوەندی",
      paragraphs: [
        "پرسیار دەربارەی ئەم سیاسەتە یان داتاکانت: ئامرازی یارمەتی لە iraqmotors.net بەکاربهێنە، یان بنووسە بۆ Iraq Motors، عێراق. ئەم پەڕەیە سیاسەتی تایبەتمەندییە بۆ ماڵپەڕ و ئەپی Iraq Motors.",
      ],
    },
  ],
};

export const privacyContent: Record<Locale, PrivacyDoc> = { en, ar, ku };

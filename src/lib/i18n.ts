export type Locale = "en" | "ar" | "ku";

const dict = {
  en: {
    browse: "All Models",
    compare: "Compare Cars",
    showrooms: "Showrooms",
    sell: "Sell",
    dashboard: "Account",
    admin: "Admin",
    signIn: "Sign in",
    signOut: "Sign out",
    heroTitle: "Find your next car in Iraq",
    heroSubtitle:
      "Browse verified listings from individuals and showrooms across the country.",
    browseCars: "Browse cars",
    sellYourCar: "Sell your car",
    recommended: "Recommended for you",
    availableListings: "Available listings",
    all: "All",
    newCars: "New",
    used: "Used",
    electric: "Electric",
    noBids: "No bids yet",
    sold: "Sold",
    viewAll: "View all",
    browseBrands: "Browse brands",
  },
  ar: {
    browse: "كل الموديلات",
    compare: "مقارنة السيارات",
    showrooms: "المعارض",
    sell: "بيع",
    dashboard: "الحساب",
    admin: "الإدارة",
    signIn: "تسجيل الدخول",
    signOut: "خروج",
    heroTitle: "اعثر على سيارتك التالية في العراق",
    heroSubtitle: "تصفح إعلانات موثقة من الأفراد والمعارض في جميع أنحاء البلاد.",
    browseCars: "تصفح السيارات",
    sellYourCar: "بع سيارتك",
    recommended: "موصى به لك",
    availableListings: "الإعلانات المتاحة",
    all: "الكل",
    newCars: "جديد",
    used: "مستعمل",
    electric: "كهربائي",
    noBids: "لا توجد مزايدات",
    sold: "مباع",
    viewAll: "عرض الكل",
    browseBrands: "تصفح العلامات",
  },
  ku: {
    browse: "هەموو مۆدێلەکان",
    compare: "بەراوردکردنی ئۆتۆمبێل",
    showrooms: "شۆڕوومەکان",
    sell: "فرۆشتن",
    dashboard: "هەژمار",
    admin: "بەڕێوەبەر",
    signIn: "چوونەژوورەوە",
    signOut: "دەرچوون",
    heroTitle: "ئۆتۆمبێلی داهاتووت لە عێراق بدۆزەرەوە",
    heroSubtitle:
      "لیستە پشتڕاستکراوەکان لە تاکەکەس و شۆڕوومەکان لە هەموو وڵاتدا بگەڕێ.",
    browseCars: "گەڕان بە ئۆتۆمبێل",
    sellYourCar: "ئۆتۆمبێلەکەت بفرۆشە",
    recommended: "پێشنیارکراو بۆ تۆ",
    availableListings: "لیستە بەردەستەکان",
    all: "هەموو",
    newCars: "نوێ",
    used: "بەکارهاتوو",
    electric: "کارەبایی",
    noBids: "هێشتا نرخ دانەنراوە",
    sold: "فرۆشراو",
    viewAll: "هەمووی ببینە",
    browseBrands: "براندەکان بگەڕێ",
  },
} as const;

export type DictKey = keyof (typeof dict)["en"];

export function t(locale: Locale, key: DictKey) {
  return dict[locale][key] ?? dict.en[key];
}

export function isRtl(locale: Locale) {
  return locale === "ar" || locale === "ku";
}

export const IRAQ_CITIES = [
  "سلێمانی",
  "هەولێر",
  "دهۆک",
  "کەرکوک",
  "بەغداد",
  "بەسرە",
  "نەینەوا",
  "کەربەلا",
  "نەجەف",
] as const;

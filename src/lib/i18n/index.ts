<<<<<<< HEAD
export * from "./LocaleProvider";
export * from "./locales";
=======
"use client";

import { useState, useEffect } from "react";

export type SupportedLanguage = "tr" | "en" | "ar";

const dictionaries = {
  tr: {
    // Navbar
    "nav.services": "Hizmetler",
    "nav.howItWorks": "Nasıl Çalışır?",
    "nav.about": "Hakkımızda",
    "nav.soon": "Yakında",
    // Hero
    "hero.badge": "PREMIUM • GÜVEN • HIZ",
    "hero.title": "İhtiyacın olan hizmete ulaşmanın ",
    "hero.titleHighlight": "en hızlı yolu.",
    "hero.subtitle": "Usta, tamir, bakım, temizlik ve daha fazlası Fuwu’da. Güvenilir hizmetlere çok yakında tek tıkla ulaş.",
    "hero.ctaPrimary": "Yakında",
    "hero.ctaSecondary": "Nasıl Çalışır?",
    // Features
    "features.title": "Neden Fuwu?",
    "features.trust.title": "Güvenilir Ustalar",
    "features.trust.desc": "Tüm ustalarımız özenle seçilir ve onaylanır.",
    "features.speed.title": "Hızlı Çözüm",
    "features.speed.desc": "Saniyeler içinde ihtiyacınıza uygun hizmeti bulun.",
    "features.support.title": "7/24 Destek",
    "features.support.desc": "Herhangi bir sorunda yanınızdayız.",
    // Provider Card
    "provider.inspectProfile": "Profili İncele",
    "provider.availability.available": "Müsait",
    "provider.availability.busy": "Yoğun",
    "provider.availability.offline": "Çevrimdışı",
  },
  en: {
    // Navbar
    "nav.services": "Services",
    "nav.howItWorks": "How It Works?",
    "nav.about": "About Us",
    "nav.soon": "Coming Soon",
    // Hero
    "hero.badge": "PREMIUM • TRUST • SPEED",
    "hero.title": "The fastest way to reach the service ",
    "hero.titleHighlight": "you need.",
    "hero.subtitle": "Handyman, repair, maintenance, cleaning and more at Fuwu. Reach reliable services with one click very soon.",
    "hero.ctaPrimary": "Coming Soon",
    "hero.ctaSecondary": "How It Works?",
    // Features
    "features.title": "Why Fuwu?",
    "features.trust.title": "Reliable Professionals",
    "features.trust.desc": "All our professionals are carefully selected and approved.",
    "features.speed.title": "Fast Solution",
    "features.speed.desc": "Find the service that suits your needs in seconds.",
    "features.support.title": "24/7 Support",
    "features.support.desc": "We are with you for any problem.",
    // Provider Card
    "provider.inspectProfile": "View Profile",
    "provider.availability.available": "Available",
    "provider.availability.busy": "Busy",
    "provider.availability.offline": "Offline",
  },
  ar: {
    // Navbar
    "nav.services": "الخدمات",
    "nav.howItWorks": "كيف تعمل؟",
    "nav.about": "معلومات عنا",
    "nav.soon": "قريباً",
    // Hero
    "hero.badge": "جودة عالية • ثقة • سرعة",
    "hero.title": "أسرع طريقة للوصول إلى الخدمة ",
    "hero.titleHighlight": "التي تحتاجها.",
    "hero.subtitle": "حرفي، إصلاح، صيانة، تنظيف وأكثر في فوو. الوصول إلى خدمات موثوقة بنقرة واحدة قريباً جداً.",
    "hero.ctaPrimary": "قريباً",
    "hero.ctaSecondary": "كيف تعمل؟",
    // Features
    "features.title": "لماذا فوو؟",
    "features.trust.title": "حرفيون موثوقون",
    "features.trust.desc": "يتم اختيار واعتماد جميع حرفيينا بعناية.",
    "features.speed.title": "حل سريع",
    "features.speed.desc": "ابحث عن الخدمة التي تناسب احتياجاتك في ثوان.",
    "features.support.title": "دعم 24/7",
    "features.support.desc": "نحن معك في أي مشكلة.",
    // Provider Card
    "provider.inspectProfile": "عرض الملف الشخصي",
    "provider.availability.available": "متاح",
    "provider.availability.busy": "مشغول",
    "provider.availability.offline": "غير متصل",
  }
};

export function useTranslation() {
  const [language, setLanguage] = useState<SupportedLanguage>("tr");

  useEffect(() => {
    const savedLang = localStorage.getItem("fuwu_language") as SupportedLanguage;
    if (savedLang && ["tr", "en", "ar"].includes(savedLang)) {
      setLanguage(savedLang);
      document.documentElement.lang = savedLang;
      document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";
    }
  }, []);

  const changeLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang);
    localStorage.setItem("fuwu_language", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  };

  const t = (key: keyof typeof dictionaries.tr) => {
    // Fallback to Turkish if key is missing in the selected language
    return dictionaries[language]?.[key] || dictionaries["tr"][key] || key;
  };

  return { language, changeLanguage, t };
}
>>>>>>> 41e55ab (Full marketplace backend auth and production update)

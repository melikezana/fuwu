export type NavigationLink = {
  id: string;
  label: string;
  href: string;
};

export const appRoutes = {
  home: "/",
  providers: "/providers",
  login: "/login",
  waitlist: "/waitlist",
  request: "/request",
  providerApplication: "/provider-application",
  services: "/#services",
  about: "/#about",
  howItWorks: "/#how-it-works",
  trust: "/#trust",
  faq: "/#faq",
} as const;

export const ctaLabels = {
  findProvider: "Usta Bul",
  login: "Giriş Yakında",
  request: "Talep Oluştur",
  waitlist: "Talep Oluştur",
  provider: "Usta Ağına Katıl",
} as const;

export const navigationLinks: NavigationLink[] = [
  {
    id: "services",
    label: "Hizmetler",
    href: appRoutes.services,
  },
  {
    id: "providers",
    label: ctaLabels.findProvider,
    href: appRoutes.providers,
  },
  {
    id: "about",
    label: "Hakkımızda",
    href: appRoutes.about,
  },
  {
    id: "how-it-works",
    label: "Nasıl Çalışır?",
    href: appRoutes.howItWorks,
  },
  {
    id: "trust",
    label: "Fuwu Güvencesi",
    href: appRoutes.trust,
  },
];

export const footerLinks: NavigationLink[] = [
  {
    id: "providers",
    label: ctaLabels.findProvider,
    href: appRoutes.providers,
  },
  {
    id: "services",
    label: "Hizmetler",
    href: appRoutes.services,
  },
  {
    id: "about",
    label: "Hakkımızda",
    href: appRoutes.about,
  },
  {
    id: "how-it-works",
    label: "Nasıl İlerler?",
    href: appRoutes.howItWorks,
  },
  {
    id: "trust",
    label: "Fuwu Güvencesi",
    href: appRoutes.trust,
  },
  {
    id: "provider-application",
    label: ctaLabels.provider,
    href: appRoutes.providerApplication,
  },
];

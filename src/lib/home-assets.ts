export type HomeAssetPath = `/${string}`;
export type HomeCategoryAssetPath = HomeAssetPath | null;

export const homeAssets = {
  categories: {
    ac: "/images/home/Meshy_AI_category-ac.png",
    "carpet-cleaner": "/images/home/Meshy_AI_carpet-cleaner-with-rug-v2.png",
    "carpet-cleaning": "/images/home/Meshy_AI_carpet-cleaner-with-rug-v2.png",
    cleaning: "/images/home/Meshy_AI_category-cleaning-v2.png",
    electric: "/images/home/Meshy_AI_category-electric-pilot.png",
    electrical: "/images/home/Meshy_AI_category-electric-pilot.png",
    furniture: "/images/home/Meshy_AI_chair-assembly-icon%20(1).png",
    "mobilya-montaj": "/images/home/Meshy_AI_chair-assembly-icon%20(1).png",
    "mobilya-montaji": "/images/home/Meshy_AI_chair-assembly-icon%20(1).png",
    "furniture-assembly": "/images/home/Meshy_AI_chair-assembly-icon%20(1).png",
    locksmith: "/images/home/Meshy_AI_category-locksmith.png",
    moving: "/images/home/Meshy_AI_moving-truck-icon.png",
    "moving-help": "/images/home/Meshy_AI_moving-truck-icon.png",
    "moving-truck": "/images/home/Meshy_AI_moving-truck-icon.png",
    paint: "/images/home/Meshy_AI_category-paint.png",
    painting: "/images/home/Meshy_AI_category-paint.png",
    plumbing: "/images/home/Meshy_AI_category-plumbing.png",
    "pool-garden": "/images/home/Meshy_AI_pool-garden-icon-v3.png",
    renovation: "/images/home/Meshy_AI_category-renovation.png",
    "ev-tadilati": "/images/home/Meshy_AI_category-renovation.png",
    "climate-appliance-service": "/images/home/Meshy_AI_category-ac.png",
  } satisfies Record<string, HomeCategoryAssetPath>,
  characters: {
    customer: "/images/home/Meshy_AI_customer-character.png",
    provider: "/images/home/Meshy_AI_provider-character.png",
  },
  payment: {
    lockCard: "/images/home/Meshy_AI_payment-lock-card.png",
  },
  steps: {
    compareProviders: "/images/home/Meshy_AI_step-compare-providers-v2.png",
    confirmService: "/images/home/Meshy_AI_step-confirm-service.png",
    selectService: "/images/home/Meshy_AI_step-select-service-v2.png",
  },
  trust: {
    securityShield: "/images/home/Meshy_AI_security-shield.png",
  },
} as const;

export function getHomeCategoryAssetPath(serviceId: string): HomeAssetPath | null {
  return homeAssets.categories[serviceId as keyof typeof homeAssets.categories] ?? null;
}

import { appRoutes } from "@/lib/constants/navigation";
import { serviceCategories, type Service } from "@/lib/constants/services";

export const serviceCategoryIds = [
  "plumbing",
  "locksmith",
  "electrical",
  "cleaning",
  "carpet-cleaning",
  "climate-appliance-service",
  "furniture-assembly",
  "painting",
  "moving-help",
] as const;

export const sceneServiceIds = [
  "locksmith",
  "furniture-assembly",
  "painting",
  "electrical",
  "cleaning",
  "climate-appliance-service",
  "plumbing",
] as const;

export type ServiceCategoryId = (typeof serviceCategoryIds)[number];
export type SceneServiceId = (typeof sceneServiceIds)[number];
export type ServiceCategoryMapKey = ServiceCategoryId | "all-services";

export type ServiceCategoryTarget = {
  ctaLabel: "Ustaları Gör";
  description: string;
  href: string;
  iconName?: Service["iconName"];
  id: ServiceCategoryMapKey;
  label: string;
  slug: string | null;
};

function findService(serviceId: ServiceCategoryId) {
  const service = serviceCategories.find((item) => item.id === serviceId);

  if (!service) {
    throw new Error(`Missing service category mapping for ${serviceId}`);
  }

  return service;
}

function createServiceTarget(serviceId: ServiceCategoryId): ServiceCategoryTarget {
  const service = findService(serviceId);

  return {
    ctaLabel: "Ustaları Gör",
    description: service.description,
    href: service.href,
    iconName: service.iconName,
    id: serviceId,
    label: service.title,
    slug: service.slug,
  };
}

export const serviceCategoryMap = {
  locksmith: createServiceTarget("locksmith"),
  plumbing: createServiceTarget("plumbing"),
  electrical: createServiceTarget("electrical"),
  cleaning: createServiceTarget("cleaning"),
  "carpet-cleaning": createServiceTarget("carpet-cleaning"),
  "climate-appliance-service": createServiceTarget("climate-appliance-service"),
  "furniture-assembly": createServiceTarget("furniture-assembly"),
  painting: createServiceTarget("painting"),
  "moving-help": createServiceTarget("moving-help"),
  "all-services": {
    ctaLabel: "Ustaları Gör",
    description: "Fuwu'daki tüm aktif hizmet kategorilerini ve ustaları keşfet.",
    href: appRoutes.providers,
    id: "all-services",
    label: "Tüm Hizmetler",
    slug: null,
  },
} satisfies Record<ServiceCategoryMapKey, ServiceCategoryTarget>;

export const sceneServiceTargets = sceneServiceIds.map((serviceId) => serviceCategoryMap[serviceId]);

export function getServiceCategoryTarget(serviceId: ServiceCategoryMapKey) {
  return serviceCategoryMap[serviceId];
}

export function getServiceCategoryTargetById(serviceId: string) {
  if (Object.prototype.hasOwnProperty.call(serviceCategoryMap, serviceId)) {
    return serviceCategoryMap[serviceId as ServiceCategoryMapKey];
  }

  return null;
}

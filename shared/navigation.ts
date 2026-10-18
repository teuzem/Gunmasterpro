export const PUBLIC_NAVIGATION = {
  catalogue: "/catalogue",
  favourites: "/favoris",
  tracking: "/suivi",
  help: "/aide",
  about: "/a-propos",
  privacy: "/confidentialite",
  legal: "/mentions-legales",
  terms: "/conditions",
  compliance: "/conformite",
} as const;

export function isPublicNavigationHref(href: string) {
  return Object.values(PUBLIC_NAVIGATION).includes(href as (typeof PUBLIC_NAVIGATION)[keyof typeof PUBLIC_NAVIGATION]);
}

export function isAgeGateRequired(isDevelopment: boolean, queryString: string, ageVerified: boolean) {
  const developmentPreview = isDevelopment && new URLSearchParams(queryString).get("preview") === "full";
  return !developmentPreview && !ageVerified;
}

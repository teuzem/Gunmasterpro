export type AppTheme = "light" | "dark";

export function cycleTheme(theme: AppTheme): AppTheme {
  return theme === "light" ? "dark" : "light";
}

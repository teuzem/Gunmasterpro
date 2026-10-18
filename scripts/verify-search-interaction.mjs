import { chromium } from "playwright-core";

const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";

async function dismissAgeGate(page) {
  const button = page.getByRole("button", { name: /J’ai 18 ans ou plus/i });
  if (await button.isVisible().catch(() => false)) await button.click();
}

async function expectProductOrCategoryNavigation(page) {
  await page.waitForURL(/\/(produit|categorie)\//, { timeout: 10_000 });
  if (!/\/(produit|categorie)\//.test(page.url())) throw new Error(`Navigation de résultat inattendue : ${page.url()}`);
}

async function main() {
  const browser = await chromium.launch({ executablePath: "/usr/bin/chromium", headless: true, args: ["--no-sandbox"] });
  try {
    const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktop.goto(`${baseUrl}/?geo=off`, { waitUntil: "networkidle" });
    await dismissAgeGate(desktop);
    const desktopInput = desktop.locator(".global-search input");
    await desktopInput.fill("beretta");
    await desktop.locator("#header-search-results [role=option]").first().waitFor();
    await desktopInput.press("ArrowDown");
    const selected = desktop.locator("#header-search-results [role=option][aria-selected=true]");
    if (await selected.count() !== 1) throw new Error("La flèche bas ne sélectionne pas une suggestion desktop.");
    await desktopInput.press("Enter");
    await expectProductOrCategoryNavigation(desktop);

    const mobile = await browser.newPage({ viewport: { width: 375, height: 812 } });
    await mobile.goto(`${baseUrl}/?geo=off`, { waitUntil: "networkidle" });
    await dismissAgeGate(mobile);
    await mobile.locator(".header-search-trigger").click();
    const mobileInput = mobile.locator(".mobile-search-panel input");
    await mobileInput.fill("beretta");
    const firstMobileResult = mobile.locator(".mobile-search-panel [role=option]").first();
    await firstMobileResult.waitFor();
    await firstMobileResult.click();
    await expectProductOrCategoryNavigation(mobile);

    console.log("Recherche interactive validée : ArrowDown/Enter desktop et clic mobile.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

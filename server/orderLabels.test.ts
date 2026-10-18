import { describe, expect, it } from "vitest";
import { translations } from "../client/src/lib/storefront";

describe("order journey labels", () => {
  it("defines localized labels for cards, checkout and final submission", () => {
    expect(translations.fr.actions.order).toBe("Commander");
    expect(translations.en.actions.order).toBe("Order");
    expect(translations.de.actions.order).toBe("Bestellen");

    expect(translations.fr.actions.checkout).toBe("Finaliser ma commande");
    expect(translations.en.actions.checkout).toBe("Finalize my order");
    expect(translations.de.actions.checkout).toBe("Meine Bestellung abschließen");

    expect(translations.fr.actions.sendOrder).toBe("Envoyer ma commande");
    expect(translations.en.actions.sendOrder).toBe("Send my order");
    expect(translations.de.actions.sendOrder).toBe("Meine Bestellung senden");
  });
});

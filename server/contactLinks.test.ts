import { describe, expect, it } from "vitest";
import {
  buildTelegramConversationUrl,
  buildWhatsappConversationUrl,
  normalizeTelegramHandle,
  normalizeWhatsappNumber,
} from "../shared/contactLinks";

describe("contact conversation links", () => {
  it("targets the configured Telegram username instead of the share composer", () => {
    expect(buildTelegramConversationUrl("@guns_master", "Bonjour !")).toBe("https://t.me/guns_master?text=Bonjour%20!");
    expect(buildTelegramConversationUrl("https://t.me/guns_master", "Bonjour !")).toContain("https://t.me/guns_master?");
    expect(buildTelegramConversationUrl("guns_master", "Bonjour !")).not.toContain("/share/url");
  });

  it("normalizes Telegram usernames safely", () => {
    expect(normalizeTelegramHandle(" @guns_master ")).toBe("guns_master");
    expect(normalizeTelegramHandle("https://t.me/guns_master?foo=bar")).toBe("guns_master");
    expect(normalizeTelegramHandle("not valid")).toBeNull();
  });

  it("keeps WhatsApp links addressable by an international number", () => {
    expect(normalizeWhatsappNumber("+33 7 48 67 48 07")).toBe("33748674807");
    expect(buildWhatsappConversationUrl("+33 7 48 67 48 07", "Bonjour !")).toBe("https://wa.me/33748674807?text=Bonjour%20!");
  });
});

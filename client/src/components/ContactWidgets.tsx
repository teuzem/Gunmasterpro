import { useCommerce } from "@/contexts/CommerceContext";
import { trpc } from "@/lib/trpc";
import { buildTelegramConversationUrl, buildWhatsappConversationUrl } from "@shared/contactLinks";
import { MessageCircle, Send } from "lucide-react";

const contactCopy = {
  fr: {
    whatsapp: "Écrire sur WhatsApp",
    telegram: "Ouvrir Telegram",
    whatsappMessage: "Bonjour GunsMasterPro, je souhaite être conseillé(e) sur un produit et les formalités applicables.",
    telegramMessage: "Bonjour GunsMasterPro, je suis intéressé(e) par l’achat d’une arme à feu sur votre site et souhaite obtenir un conseil personnalisé.",
  },
  en: {
    whatsapp: "Chat on WhatsApp",
    telegram: "Open Telegram",
    whatsappMessage: "Hello GunsMasterPro, I would like advice about a product and the applicable requirements.",
    telegramMessage: "Hello GunsMasterPro, I am interested in purchasing a firearm on your website and would like personalised advice.",
  },
  de: {
    whatsapp: "Über WhatsApp schreiben",
    telegram: "Telegram öffnen",
    whatsappMessage: "Guten Tag GunsMasterPro, ich wünsche Beratung zu einem Produkt und den geltenden Anforderungen.",
    telegramMessage: "Guten Tag GunsMasterPro, ich interessiere mich für den Kauf einer Feuerwaffe auf Ihrer Website und wünsche eine persönliche Beratung.",
  },
} as const;

/** Opens the configured Telegram profile directly with a ready-to-send message draft. */
export function openTelegramConversation(message: string, handle = "tom_glock") {
  window.open(buildTelegramConversationUrl(handle, message), "_blank", "noopener,noreferrer");
}

/** Global seller contact controls for the official WhatsApp and Telegram conversations. */
export function ContactWidgets() {
  const { locale } = useCommerce();
  const copy = contactCopy[locale];
  const settings = trpc.settings.public.useQuery(undefined, { staleTime: 0, refetchInterval: 15_000, refetchIntervalInBackground: true });
  const whatsappNumber = settings.data?.whatsappNumber || "33748674807";
  const telegramHandle = settings.data?.telegramHandle || "tom_glock";
  const openWhatsApp = () => {
    window.open(buildWhatsappConversationUrl(whatsappNumber, copy.whatsappMessage), "_blank", "noopener,noreferrer");
  };
  const openTelegram = () => openTelegramConversation(copy.telegramMessage, telegramHandle);

  return <aside className="gmp-chat-stack" aria-label="GunsMasterPro contact options">
    <button type="button" onClick={openWhatsApp} className="gmp-chat-widget gmp-chat-whatsapp" aria-label={copy.whatsapp}>
      <MessageCircle aria-hidden="true" />
      <span className="gmp-chat-widget-label">{copy.whatsapp}</span>
    </button>
    <button type="button" onClick={openTelegram} className="gmp-chat-widget gmp-chat-telegram" aria-label={`${copy.telegram} · ${copy.telegramMessage}`}>
      <Send aria-hidden="true" />
      <span className="gmp-chat-widget-label">{copy.telegram}</span>
    </button>
  </aside>;
}

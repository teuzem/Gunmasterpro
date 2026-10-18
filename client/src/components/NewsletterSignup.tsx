import { useCommerce } from "@/contexts/CommerceContext";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link } from "wouter";

const copy = {
  fr: { eyebrow: "L’actualité GunsMasterPro", title: "Recevez nos nouveautés, en gardant le contrôle.", lead: "Sélections, informations de disponibilité et repères éditoriaux. Aucun partage de votre adresse et désinscription possible à tout moment.", placeholder: "Votre adresse e-mail", consent: "J’accepte de recevoir la newsletter GunsMasterPro et reconnais avoir lu la politique de confidentialité.", action: "S’inscrire", privacyPrefix: "Vos données restent protégées. Lire notre", privacyLink: "politique de confidentialité", success: "Merci, votre inscription est confirmée.", resumed: "Votre inscription est de nouveau active.", already: "Cette adresse est déjà inscrite.", error: "Impossible d’enregistrer votre inscription pour le moment." },
  en: { eyebrow: "GunsMasterPro updates", title: "Receive our updates while staying in control.", lead: "Selections, availability information and editorial guidance. Your address is never shared and you can unsubscribe at any time.", placeholder: "Your email address", consent: "I agree to receive the GunsMasterPro newsletter and acknowledge the privacy policy.", action: "Subscribe", privacyPrefix: "Your data stays protected. Read our", privacyLink: "privacy policy", success: "Thank you, your subscription is confirmed.", resumed: "Your subscription is active again.", already: "This address is already subscribed.", error: "We cannot save your subscription at the moment." },
  de: { eyebrow: "GunsMasterPro-Updates", title: "Neuigkeiten erhalten und trotzdem die Kontrolle behalten.", lead: "Auswahl, Verfügbarkeitsinformationen und redaktionelle Hinweise. Ihre Adresse wird nicht weitergegeben; eine Abmeldung ist jederzeit möglich.", placeholder: "Ihre E-Mail-Adresse", consent: "Ich stimme dem Erhalt des GunsMasterPro-Newsletters zu und nehme die Datenschutzerklärung zur Kenntnis.", action: "Anmelden", privacyPrefix: "Ihre Daten bleiben geschützt. Lesen Sie unsere", privacyLink: "Datenschutzerklärung", success: "Vielen Dank, Ihre Anmeldung ist bestätigt.", resumed: "Ihre Anmeldung ist wieder aktiv.", already: "Diese Adresse ist bereits angemeldet.", error: "Ihre Anmeldung kann derzeit nicht gespeichert werden." },
} as const;

export function NewsletterSignup() {
  const { locale } = useCommerce();
  const t = copy[locale];
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState<string>();
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: (result) => {
      setFeedback(result.alreadyActive ? t.already : result.resumed ? t.resumed : t.success);
      setEmail("");
      setConsent(false);
    },
    onError: () => setFeedback(t.error),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFeedback(undefined);
    if (!consent) return;
    subscribe.mutate({ email, locale, consent: true });
  };
  return <section className="footer-newsletter"><div className="content-rail footer-newsletter-inner"><div className="footer-newsletter-copy"><p className="eyebrow">{t.eyebrow}</p><h2>{t.title}</h2><p>{t.lead}</p></div><form className="footer-newsletter-form" onSubmit={submit}><div className="footer-newsletter-input"><Mail aria-hidden="true"/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t.placeholder} autoComplete="email" required/><button type="submit" disabled={!consent || subscribe.isPending}>{subscribe.isPending ? "…" : t.action}</button></div><label className="footer-newsletter-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>{t.consent}</span></label><p className="footer-newsletter-privacy"><ShieldCheck aria-hidden="true"/>{t.privacyPrefix} <Link href="/confidentialite">{t.privacyLink}</Link>.</p>{feedback && <p className="footer-newsletter-feedback" role="status"><CheckCircle2 aria-hidden="true"/>{feedback}</p>}</form></div></section>;
}

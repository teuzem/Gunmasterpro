import { useCommerce } from "@/contexts/CommerceContext";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Cookie, Mail, ShieldCheck, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "wouter";

const promptCopy = {
  fr: {
    cookieEyebrow: "Vos préférences", cookieTitle: "Un parcours sous votre contrôle.", cookieLead: "Nous utilisons le stockage essentiel pour mémoriser votre langue, votre sélection et vos décisions de consentement. Avec votre accord, nous pouvons aussi mesurer les usages afin d’améliorer l’expérience.", essential: "Conserver l’essentiel", accept: "Accepter et continuer", privacy: "Lire la confidentialité",
    newsletterEyebrow: "Sélection privée", newsletterTitle: "Recevez les nouveautés utiles.", newsletterLead: "Des repères de disponibilité, sélections et informations éditoriales. Vous gardez le contrôle et pouvez vous désinscrire à tout moment.", email: "Votre adresse e-mail", consent: "J’accepte de recevoir la newsletter GunsMasterPro et reconnais avoir lu la politique de confidentialité.", subscribe: "Recevoir les actualités", privacyPrefix: "Vos données restent protégées. Lire notre", privacyLink: "politique de confidentialité", success: "Votre inscription est confirmée.", close: "Fermer cette invitation",
  },
  en: {
    cookieEyebrow: "Your preferences", cookieTitle: "A journey under your control.", cookieLead: "We use essential storage to remember your language, selection and consent choices. With your permission, we may also measure usage to improve the experience.", essential: "Keep essentials only", accept: "Accept and continue", privacy: "Read privacy notice",
    newsletterEyebrow: "Private selection", newsletterTitle: "Receive useful updates.", newsletterLead: "Availability markers, curated selections and editorial information. You stay in control and can unsubscribe at any time.", email: "Your email address", consent: "I agree to receive the GunsMasterPro newsletter and acknowledge the privacy policy.", subscribe: "Receive updates", privacyPrefix: "Your data remains protected. Read our", privacyLink: "privacy policy", success: "Your subscription is confirmed.", close: "Close this invitation",
  },
  de: {
    cookieEyebrow: "Ihre Einstellungen", cookieTitle: "Ein Ablauf unter Ihrer Kontrolle.", cookieLead: "Wir nutzen den notwendigen Speicher, um Sprache, Auswahl und Einwilligungen zu speichern. Mit Ihrer Zustimmung können wir die Nutzung messen, um die Erfahrung zu verbessern.", essential: "Nur Erforderliches behalten", accept: "Akzeptieren und fortfahren", privacy: "Datenschutz lesen",
    newsletterEyebrow: "Private Auswahl", newsletterTitle: "Erhalten Sie nützliche Neuigkeiten.", newsletterLead: "Verfügbarkeitsinformationen, kuratierte Auswahl und redaktionelle Hinweise. Sie behalten die Kontrolle und können sich jederzeit abmelden.", email: "Ihre E-Mail-Adresse", consent: "Ich stimme dem GunsMasterPro-Newsletter zu und nehme die Datenschutzerklärung zur Kenntnis.", subscribe: "Neuigkeiten erhalten", privacyPrefix: "Ihre Daten bleiben geschützt. Lesen Sie unsere", privacyLink: "Datenschutzerklärung", success: "Ihre Anmeldung ist bestätigt.", close: "Diese Einladung schließen",
  },
} as const;

const canPresentPrompt = () => Boolean(localStorage.getItem("gmp-age-verified") && localStorage.getItem("gmp-geo-choice"));

export function EngagementPrompts() {
  const { locale, geoPromptOpen } = useCommerce();
  const copy = promptCopy[locale];
  const [cookieOpen, setCookieOpen] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const cookieOpenRef = useRef(false);
  const newsletterOpenRef = useRef(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [feedback, setFeedback] = useState("");
  const subscribe = trpc.newsletter.subscribe.useMutation({
    onSuccess: () => { setFeedback(copy.success); localStorage.setItem("gmp-newsletter-prompt-dismissed", "subscribed"); },
  });

  useEffect(() => { cookieOpenRef.current = cookieOpen; }, [cookieOpen]);
  useEffect(() => { newsletterOpenRef.current = newsletterOpen; }, [newsletterOpen]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const preview = new URLSearchParams(window.location.search).get("popup");
    if (preview === "newsletter") setNewsletterOpen(true);
    if (preview === "cookie") setCookieOpen(true);
  }, []);

  useEffect(() => {
    const tryOpen = (kind: "cookie" | "newsletter") => {
      const blocked = geoPromptOpen || !canPresentPrompt() || cookieOpenRef.current || newsletterOpenRef.current;
      if (blocked) return window.setTimeout(() => tryOpen(kind), 3_000);
      if (kind === "cookie" && !localStorage.getItem("gmp-cookie-choice")) setCookieOpen(true);
      if (kind === "newsletter" && !localStorage.getItem("gmp-newsletter-prompt-dismissed")) setNewsletterOpen(true);
    };
    const newsletterTimer = window.setTimeout(() => tryOpen("newsletter"), 30_000);
    const cookieTimer = window.setTimeout(() => tryOpen("cookie"), 60_000);
    return () => { window.clearTimeout(newsletterTimer); window.clearTimeout(cookieTimer); };
  }, [geoPromptOpen]);

  useEffect(() => {
    document.body.classList.toggle("gmp-engagement-open", cookieOpen || newsletterOpen);
    return () => document.body.classList.remove("gmp-engagement-open");
  }, [cookieOpen, newsletterOpen]);

  const chooseCookies = (choice: "essential" | "accepted") => { localStorage.setItem("gmp-cookie-choice", choice); setCookieOpen(false); };
  const closeNewsletter = () => { localStorage.setItem("gmp-newsletter-prompt-dismissed", "dismissed"); setNewsletterOpen(false); };
  const submitNewsletter = (event: FormEvent) => { event.preventDefault(); if (!consent) return; subscribe.mutate({ email, locale, consent: true }); };

  return <div className="engagement-layer" aria-live="polite">
    {cookieOpen && <section className="engagement-card engagement-cookie" role="dialog" aria-label={copy.cookieTitle}><div className="engagement-icon"><Cookie/></div><p className="eyebrow">{copy.cookieEyebrow}</p><h2>{copy.cookieTitle}</h2><p>{copy.cookieLead}</p><div className="engagement-actions"><button type="button" className="engagement-secondary" onClick={() => chooseCookies("essential")}>{copy.essential}</button><button type="button" className="engagement-primary" onClick={() => chooseCookies("accepted")}>{copy.accept}</button></div><Link href="/confidentialite" className="engagement-link"><ShieldCheck/>{copy.privacy}</Link></section>}
    {newsletterOpen && <section className="engagement-card engagement-newsletter" role="dialog" aria-label={copy.newsletterTitle}><button type="button" className="engagement-close" onClick={closeNewsletter} aria-label={copy.close}><X/></button><div className="engagement-icon"><Mail/></div><p className="eyebrow">{copy.newsletterEyebrow}</p><h2>{copy.newsletterTitle}</h2><p>{copy.newsletterLead}</p><form onSubmit={submitNewsletter}><input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={copy.email} className="store-input"/><label className="engagement-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)}/><span>{copy.consent}</span></label><button type="submit" disabled={!consent || subscribe.isPending} className="engagement-primary">{subscribe.isPending ? "…" : copy.subscribe}</button></form><p className="engagement-link"><ShieldCheck/>{copy.privacyPrefix} <Link href="/confidentialite">{copy.privacyLink}</Link>.</p>{feedback && <p className="engagement-success"><CheckCircle2/>{feedback}</p>}</section>}
  </div>;
}

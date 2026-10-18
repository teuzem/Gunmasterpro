import { useCommerce } from "@/contexts/CommerceContext";
import { formatMoney, translations } from "@/lib/storefront";
import { Minus, PackageCheck, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { evaluateCoupon } from "@shared/commerce";

const copy = {
  fr: { eyebrow: "Demande accompagnée", title: "Votre sélection", lead: "Revoyez les références, leurs quantités et le montant estimatif avant de poursuivre vers la demande accompagnée.", checkout: "Préparer ma demande", empty: "Votre sélection est vide.", catalogue: "Explorer le catalogue", confidence: "Les disponibilités et conditions applicables sont revues avant toute confirmation." },
  en: { eyebrow: "Guided request", title: "Your selection", lead: "Review references, quantities and the estimated amount before proceeding to a guided request.", checkout: "Prepare my request", empty: "Your selection is empty.", catalogue: "Browse catalogue", confidence: "Availability and applicable conditions are reviewed before any confirmation." },
  de: { eyebrow: "Begleitete Anfrage", title: "Ihre Auswahl", lead: "Prüfen Sie Referenzen, Mengen und den geschätzten Betrag, bevor Sie mit der begleiteten Anfrage fortfahren.", checkout: "Meine Anfrage vorbereiten", empty: "Ihre Auswahl ist leer.", catalogue: "Katalog erkunden", confidence: "Verfügbarkeit und anwendbare Bedingungen werden vor einer Bestätigung geprüft." },
} as const;

export default function CartPage() {
  const { locale, cart, changeQuantity, removeFromCart, couponCode, setCartOpen } = useCommerce();
  const t = translations[locale];
  const text = copy[locale];
  const subtotal = cart.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
  const appliedCoupon = evaluateCoupon(couponCode, subtotal);
  const total = subtotal + appliedCoupon.priceAdjustmentCents;
  return <main className="gmp-page min-h-screen bg-[#071015]"><section className="container py-10 lg:py-14"><p className="eyebrow">{text.eyebrow}</p><h1 className="font-display mt-2 text-5xl text-white">{text.title}</h1><p className="mt-4 max-w-2xl leading-7 text-slate-400">{text.lead}</p>{cart.length ? <div className="cart-page-grid mt-10 grid gap-6"><div className="space-y-4">{cart.map(({ product, quantity }) => <article key={product.id} className="cart-page-line gmp-card rounded-2xl border border-white/8 p-4"><Link href={`/produit/${product.slug}`}><img src={product.imageUrl} alt={`${product.name} — ${product.brand}`} loading="lazy"/></Link><div className="cart-page-line-details min-w-0 flex-1"><Link href={`/produit/${product.slug}`} className="font-display text-3xl text-white">{product.name}</Link><p className="mt-1 text-sm text-slate-400">{product.brand} · {formatMoney(product.priceCents, locale)}</p><div className="cart-page-line-actions mt-4"><div className="product-quantity-control"><button onClick={() => changeQuantity(product.id, quantity - 1)} aria-label="-"><Minus/></button><output>{quantity}</output><button onClick={() => changeQuantity(product.id, quantity + 1)} aria-label="+"><Plus/></button></div><button onClick={() => removeFromCart(product.id)} className="inline-flex items-center gap-2 text-xs font-bold text-[#e58383]"><Trash2 className="h-4 w-4"/>{t.actions.remove}</button></div></div><div className="cart-page-line-total"><span>{t.cart.subtotal}</span><strong>{formatMoney(product.priceCents * quantity, locale)}</strong></div></article>)}</div><aside className="cart-page-summary gmp-card rounded-3xl border border-white/8 p-6"><PackageCheck/><p>{t.cart.subtotal}</p><strong>{formatMoney(total, locale)}</strong>{couponCode && <span>{couponCode}</span>}<small>{text.confidence}</small><button onClick={() => setCartOpen(true)}><ShoppingBag/>{text.checkout}</button></aside></div> : <div className="cart-page-empty gmp-card mt-10 rounded-3xl border border-dashed border-white/15 p-10 text-center"><ShoppingBag className="mx-auto h-8 w-8 text-[#d7b46a]"/><p>{text.empty}</p><Link href="/catalogue">{text.catalogue}</Link></div>}</section></main>;
}

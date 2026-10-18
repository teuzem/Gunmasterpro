import { ProductCard, ProductComparison } from "@/components/storefront";
import { useCommerce } from "@/contexts/CommerceContext";
import { StoreProduct, translations } from "@/lib/storefront";
import { trpc } from "@/lib/trpc";
import { Scale, SearchCheck, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

const copy = {
  fr: { eyebrow: "Étude des références", title: "Comparateur de produits", lead: "Conservez jusqu’à trois références, visualisez les écarts techniques et préparez votre demande avec un récapitulatif lisible.", empty: "Sélectionnez des références depuis le catalogue pour démarrer une comparaison détaillée.", explore: "Explorer le catalogue", focus: "Lecture structurée", focusLead: "Prix, disponibilité, caractéristiques, dimensions et spécifications dynamiques sont regroupés dans une seule vue." },
  en: { eyebrow: "Reference review", title: "Product comparator", lead: "Keep up to three references, review their technical differences and prepare your request with a readable summary.", empty: "Select references from the catalogue to start a detailed comparison.", explore: "Browse catalogue", focus: "Structured review", focusLead: "Price, availability, dimensions and dynamic specifications are brought together in one view." },
  de: { eyebrow: "Referenzvergleich", title: "Produktvergleich", lead: "Behalten Sie bis zu drei Referenzen, prüfen Sie technische Unterschiede und bereiten Sie Ihre Anfrage übersichtlich vor.", empty: "Wählen Sie Referenzen im Katalog aus, um einen detaillierten Vergleich zu beginnen.", explore: "Katalog entdecken", focus: "Strukturierte Übersicht", focusLead: "Preis, Verfügbarkeit, Maße und dynamische Spezifikationen werden in einer Ansicht zusammengeführt." },
} as const;

export default function ComparisonPage() {
  const { locale, compareIds } = useCommerce();
  const t = translations[locale];
  const text = copy[locale];
  const catalogue = trpc.catalogue.list.useQuery();
  const products = (catalogue.data ?? []) as StoreProduct[];
  const selected = products.filter((product) => compareIds.includes(product.id));
  const suggestions = products.filter((product) => !compareIds.includes(product.id)).slice(0, 6);
  return <main className="gmp-page min-h-screen bg-[#071015]"><section className="container py-10 lg:py-14"><div className="comparison-page-hero gmp-card rounded-3xl border border-white/8 p-6 sm:p-9"><div><p className="eyebrow">{text.eyebrow}</p><h1 className="font-display mt-2 text-5xl text-white sm:text-6xl">{text.title}</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{text.lead}</p></div><div className="comparison-page-metrics"><Scale/><strong>{selected.length}/3</strong><span>{t.actions.compare}</span></div></div></section>{selected.length ? <ProductComparison products={products}/> : <section className="container pb-10"><div className="comparison-empty gmp-card rounded-3xl border border-dashed border-white/15 p-8 text-center"><SearchCheck className="mx-auto h-8 w-8 text-[#d7b46a]"/><h2 className="font-display mt-4 text-3xl text-white">{text.empty}</h2><Link href="/catalogue" className="mt-6 inline-flex rounded-xl bg-[#d7b46a] px-5 py-3 text-sm font-bold text-[#0a1217]">{text.explore}</Link></div></section>}<section className="container pb-16"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="eyebrow">GunsMasterPro</p><h2 className="font-display mt-1 text-4xl text-white">{text.focus}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{text.focusLead}</p></div><ShieldCheck className="h-7 w-7 text-[#d7b46a]"/></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{suggestions.map((product) => <ProductCard key={product.id} product={product}/>)}</div></section></main>;
}

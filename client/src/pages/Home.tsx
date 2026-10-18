import { PickupMap, ProductCard, ProductComparison } from "@/components/storefront";
import { FAQSection } from "@/components/FAQSection";
import { useCommerce } from "@/contexts/CommerceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { categoryCopy, categoryLabel } from "@/lib/categoryTranslations";
import { heroSlides as localizedHeroSlides, heroUi } from "@/lib/homeHeroContent";
import { StoreProduct, translations } from "@/lib/storefront";
import { trpc } from "@/lib/trpc";
import { shouldAutoplayCarousel } from "@shared/motion";
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, ChevronLeft, ChevronRight, CirclePause, CirclePlay, Crosshair, Layers3, MapPinned, ShieldCheck, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

type HeroCopy = { eyebrow: string; title: string; description: string; label: string };
type RenderHeroSlide = { image: string; targetPath: string; copy: Record<"fr" | "en" | "de", HeroCopy>; altText: Record<"fr" | "en" | "de", string> };

const sellingPointIcons = [Target, MapPinned, Crosshair, BadgeCheck, ShieldCheck];

// Couvertures contrôlées visuellement dans le lot Pak Arms autorisé : chaque image
// présente le produit tenu en main. L’ordre est éditorial et stable pour l’accueil.
const handheldCatalogueSlugs = [
  "pakarms-sidhu-moosewala-1911-pak-made-9mm-9591",
  "pakarms-tt-30-bore-gold-plated-x-engraved-pak-made-9319",
  "pakarms-hs-h11-pro-made-in-croatia-9mm-9141",
  "pakarms-hs-h11-9mm-made-in-crotia-9129",
  "pakarms-taurus-gx2-brazil-9mm-compact-pistol-8967",
  "pakarms-glock-26-gen4-compact-laser-stippling-skull-bagging-9mm-8872",
  "pakarms-taurus-1911-commander-45acp-brazil-8828",
  "pakarms-cz-75-duty-p-07-pak-made-9mm-8776",
  "pakarms-stippling-glock-19x-mos-a-copy-9mm-8735",
  "pakarms-beretta-1957-model-copy-compact-mini-pistol-25-bore-8701",
  "pakarms-zastava-m57-9-shot-30-bore-a-copy-8567",
  "pakarms-glock-19-gen5-customized-modefied-redot-9mm-a-copy-8554",
  "pakarms-30-bore-tt-golden-7-shot-a-copy-8541",
  "pakarms-colt-1911-gold-plated-parts-engraving-9mm-a-copy-8524",
  "pakarms-30-bore-7-shot-customized-golden-parts-8508",
  "pakarms-baikal-442-makarov-38-bore-pak-made-8189",
  "pakarms-30-bore-zigana-x-shot-14-rounds-capacity-8013",
  "pakarms-zigana-px9-high-copy-9mm-7997",
  "pakarms-camouflage-beretta-m9a4-7965",
  "pakarms-camouflage-zigana-9mm-commando-7953",
  "pakarms-custom-30-bore-14-rounds-capacity-7925",
  "pakarms-hs9-sub-compact-9mm-high-quality-a-copy-7636",
  "pakarms-stoeger-cougar-8000-fl-9mm-a-copy-7504",
  "pakarms-usa-beretta-92fs-with-1-magzine-9mm-7490",
  "pakarms-custom-laser-stippling-glock-19x-redot-high-quality-9mm-pak-made-7405",
  "pakarms-custom-glock-26-compact-pak-made-ladies-pistol-7391",
  "pakarms-stoeger-cougar-30-bore-pak-made-high-quality-7376",
  "pakarms-stoeger-cougar-800fl-a-high-quality-copy-7329",
  "pakarms-glock-26-camo-9mm-a-copy-7212",
  "pakarms-custom-glock-19x-9mm-two-tone-7042",
];

function QuickCatalogueCard({ product, locale }: { product: StoreProduct; locale: "fr" | "en" | "de" }) {
  const t = translations[locale];
  const formatLocale = locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "fr-FR";
  const price = new Intl.NumberFormat(formatLocale, { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(product.priceCents / 100);
  return <article className="quick-catalogue-card group overflow-hidden rounded-xl border border-white/10 bg-[#101a22] shadow-[0_12px_32px_rgba(0,0,0,.16)] transition duration-200 hover:-translate-y-1 hover:border-[#d7b46a]/55">
    <Link href={`/produit/${product.slug}`} className="block" aria-label={`${t.actions.details} · ${product.name}`}>
      <div className="quick-catalogue-media relative aspect-[1.25] overflow-hidden bg-[#15232d]"><img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" width="400" height="320" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/><div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#071015]/80 to-transparent"/><span className="quick-catalogue-category absolute bottom-2 left-2 rounded-md bg-[#0a1117]/80 px-2 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#e7cb84]">{t.category[product.category]}</span></div>
      <div className="quick-catalogue-copy p-3.5"><p className="quick-catalogue-brand truncate text-[10px] font-bold uppercase tracking-[.12em] text-[#d7b46a]">{product.brand}</p><h3 className="quick-catalogue-title mt-1 min-h-10 line-clamp-2 font-display text-lg leading-5 text-white transition group-hover:text-[#e5c97f]">{product.name}</h3><div className="quick-catalogue-meta mt-3 flex items-center justify-between gap-2 border-t border-white/7 pt-2.5"><span className="truncate text-xs text-slate-400">{product.caliber || "—"}</span><strong className="quick-catalogue-price shrink-0 text-sm text-[#e8ce8b]">{price}</strong></div></div>
    </Link>
  </article>;
}

export default function Home() {
  const { locale } = useCommerce();
  const t = translations[locale];
  const { theme } = useTheme();
  const productsQuery = trpc.catalogue.list.useQuery();
  const categoryQuery = trpc.categories.list.useQuery();
  const heroQuery = trpc.homepage.heroSlides.useQuery();
  const products = (productsQuery.data ?? []) as StoreProduct[];
  const categories = categoryQuery.data ?? [];
  const fallbackHeroSlides: RenderHeroSlide[] = localizedHeroSlides.map((item) => ({ image: item.image, targetPath: `/produit/${item.product}`, copy: item.copy, altText: { fr: heroUi.fr.imageAlt, en: heroUi.en.imageAlt, de: heroUi.de.imageAlt } }));
  const persistedHeroSlides: RenderHeroSlide[] = (heroQuery.data ?? []).map((item) => ({ image: item.imageUrl, targetPath: item.targetPath, copy: { fr: { eyebrow: item.eyebrow.fr, title: item.title.fr, description: item.description.fr, label: item.ctaLabel.fr }, en: { eyebrow: item.eyebrow.en, title: item.title.en, description: item.description.en, label: item.ctaLabel.en }, de: { eyebrow: item.eyebrow.de, title: item.title.de, description: item.description.de, label: item.ctaLabel.de } }, altText: item.altText }));
  const heroSlides = persistedHeroSlides.length ? persistedHeroSlides : fallbackHeroSlides;
  const handheldProducts = handheldCatalogueSlugs.map((slug) => products.find((product) => product.slug === slug)).filter((product): product is StoreProduct => Boolean(product));
  const [activeSlide, setActiveSlide] = useState(() => {
    const requested = typeof window !== "undefined" ? Number(new URLSearchParams(window.location.search).get("slide")) : 0;
    return Number.isInteger(requested) && requested >= 0 && requested < fallbackHeroSlides.length ? requested : 0;
  });
  const [paused, setPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const slide = heroSlides[activeSlide] ?? heroSlides[0]!;
  const slideCopy = slide.copy[locale];
  const heroText = heroUi[locale];
  const categoryText = categoryCopy[locale];
  const sellingPoints = t.home.reasons.map(([title, body], index) => ({ icon: sellingPointIcons[index] ?? Target, title, body }));
  const overlay = theme === "dark" ? "bg-[linear-gradient(90deg,#071015_0%,rgba(7,16,21,.92)_32%,rgba(7,16,21,.27)_70%,rgba(7,16,21,.88)_100%)]" : "bg-[linear-gradient(90deg,#f6f9fd_0%,rgba(246,249,253,.97)_36%,rgba(246,249,253,.7)_58%,rgba(246,249,253,.38)_76%,rgba(246,249,253,.86)_100%)]";
  useEffect(() => { const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const sync = () => setPrefersReducedMotion(media.matches); sync(); media.addEventListener("change", sync); return () => media.removeEventListener("change", sync); }, []);
  useEffect(() => { if (activeSlide >= heroSlides.length) setActiveSlide(0); }, [activeSlide, heroSlides.length]);
  useEffect(() => { if (!shouldAutoplayCarousel(paused, prefersReducedMotion)) return; const timer = window.setInterval(() => setActiveSlide((index) => (index + 1) % heroSlides.length), 6800); return () => window.clearInterval(timer); }, [heroSlides.length, paused, prefersReducedMotion]);
  const previous = () => setActiveSlide((index) => (index - 1 + heroSlides.length) % heroSlides.length);
  const next = () => setActiveSlide((index) => (index + 1) % heroSlides.length);

  return <main className="gmp-page home-page min-h-screen overflow-hidden bg-[#071015]">
    <section className="relative min-h-[740px] overflow-hidden border-b border-white/8" aria-label={heroText.label}>
      <img key={slide.image} src={slide.image} alt={slide.altText[locale] || heroText.imageAlt} fetchPriority="high" loading="eager" decoding="async" width="1920" height="1080" onError={(event) => { event.currentTarget.style.display = "none"; }} className={`absolute inset-0 h-full w-full object-cover object-center ${prefersReducedMotion ? "" : "animate-[fadeIn_.7s_ease-out]"}`}/>
      <div className={`absolute inset-0 ${overlay}`}/>
      <div className="relative container flex min-h-[740px] items-center py-24"><div className="max-w-2xl">
        <p className="eyebrow text-[#e6c97e]">{slideCopy.eyebrow}</p>
        <h1 className="hero-title mt-4 text-white">{slideCopy.title}</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">{slideCopy.description}</p>
        <div className="mt-9 flex flex-wrap gap-3"><Link href={slide.targetPath} className="inline-flex items-center gap-2 rounded-xl bg-[#d7b46a] px-5 py-3.5 text-sm font-bold text-[#091116] hover:bg-[#e6cc88]">{slideCopy.label}<ArrowRight className="h-4 w-4"/></Link><a href="#categories" className="inline-flex items-center gap-2 rounded-xl border border-white/18 px-5 py-3.5 text-sm font-bold text-white hover:border-[#d7b46a]/70">{heroText.browse}<Layers3 className="h-4 w-4"/></a></div>
        <div className="mt-10 flex items-center gap-3 text-xs text-slate-400"><ShieldCheck className="h-5 w-5 text-[#d7b46a]"/>{heroText.notice}</div>
      </div></div>
      <div className="hero-carousel-controls absolute bottom-6 right-4 z-10 flex items-center gap-3 sm:right-8"><button onClick={previous} aria-label={heroText.previous} className="hero-control"><ChevronLeft/></button><button onClick={() => setPaused(!paused)} aria-label={paused ? heroText.play : heroText.pause} className="hero-control hero-control-play">{paused || prefersReducedMotion ? <CirclePlay/> : <CirclePause/>}<span className="hidden text-xs font-bold sm:inline">{paused || prefersReducedMotion ? heroText.play : heroText.pause}</span></button><button onClick={next} aria-label={heroText.next} className="hero-control"><ChevronRight/></button></div>
      <div className="absolute bottom-0 left-0 right-0 border-t border-white/8 bg-[#091218]/90 backdrop-blur"><div className="container hero-pagination flex items-center gap-2 overflow-x-auto py-4"><span className="mr-2 shrink-0 text-[10px] font-bold uppercase tracking-[.16em] text-white/70">{heroText.scenes}</span>{heroSlides.map((item, index) => <button key={item.image} onClick={() => setActiveSlide(index)} aria-label={heroText.showScene(index + 1)} aria-current={index === activeSlide ? "true" : undefined} className={`shrink-0 rounded-full transition-all ${index === activeSlide ? "is-active" : ""}`}/>)}</div></div>
    </section>

    <section className="container py-16"><div className="mb-10 max-w-3xl"><p className="eyebrow">{t.home.reasonsEyebrow}</p><h2 className="section-title">{t.home.reasonsTitle}</h2><p className="mt-4 max-w-2xl text-slate-400">{t.home.reasonsLead}</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{sellingPoints.map((point) => <article key={point.title} className="gmp-card rounded-2xl border border-white/8 bg-[#101b23] p-5"><point.icon className="h-5 w-5 text-[#d7b46a]"/><h3 className="font-display mt-5 text-2xl text-white">{point.title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{point.body}</p></article>)}</div></section>

    <section className="border-y border-white/7 bg-[#0b161e]"><div className="container py-20"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">{t.home.featuredEyebrow}</p><h2 className="section-title">{t.home.featuredTitle}</h2><p className="mt-3 max-w-2xl text-slate-400">{t.home.featuredLeadLong}</p></div><Link href="/catalogue" className="text-sm font-bold text-[#e4c67e] hover:text-white">{t.home.viewCatalogue} <ArrowRight className="ml-1 inline h-4 w-4"/></Link></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{productsQuery.isLoading ? Array.from({ length: 12 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-xl bg-white/5"/>) : handheldProducts.map((product) => <QuickCatalogueCard key={product.id} product={product} locale={locale}/>)}</div></div></section>

    <section id="categories" className="category-catalogue-section border-y border-slate-200/80"><div className="container py-20"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">{categoryText.eyebrow}</p><h2 className="section-title">{categoryText.title}</h2><p className="mt-3 max-w-3xl text-slate-400">{categoryText.body}</p></div><Link href="/catalogue" className="category-browse-button inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold">{categoryText.browse}<ArrowRight className="h-4 w-4"/></Link></div><div className="category-catalogue-grid mt-9">{categoryQuery.isLoading ? Array.from({ length: 12 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-xl bg-slate-200/70 dark:bg-white/5"/>) : categories.map((category) => <Link key={category.id} href={`/catalogue?category=${category.parentCategory}`} className="category-catalogue-card group"><div className="category-catalogue-media"><img src={encodeURI(category.imageUrl)} alt={`${categoryLabel(locale, category.slug, category.label)} — ${category.parentCategory}`} decoding="async" width="600" height="400" sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/media-fallback.svg"; }} className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/></div><div className="category-catalogue-label"><span className="text-[10px] font-bold uppercase tracking-[.14em]">{category.parentCategory}</span><h3>{categoryLabel(locale, category.slug, category.label)}</h3><span className="category-explore">{categoryText.explore}<ArrowRight className="h-3.5 w-3.5"/></span></div></Link>)}</div></div></section>

    <ProductComparison products={products}/><FAQSection />
  </main>;
}

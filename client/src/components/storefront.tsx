import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { openTelegramConversation } from "@/components/ContactWidgets";
import { useCommerce } from "@/contexts/CommerceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { formatMoney, Locale, StoreProduct, translations } from "@/lib/storefront";
import { comparisonValuesDiffer, evaluateCoupon } from "@shared/commerce";
import { isAgeGateRequired } from "@shared/access";
import { getGlobalSearchSuggestions, GlobalSearchSuggestion } from "@shared/search";
import { trpc } from "@/lib/trpc";
import { buildWhatsappConversationUrl } from "@shared/contactLinks";
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardCopy, CircleHelp, FileText, FolderPlus, Heart, Home, Languages, MapPin, Menu, Minus, Moon, PackageSearch, Plus, Scale, Search, ShieldCheck, ShoppingBag, Star, Sun, Trash2, UserRound, X, Eye } from "lucide-react";
import { FormEvent, KeyboardEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const emblem = "/favicon.png";
const developmentQuery = (key: string) => typeof window !== "undefined" && import.meta.env.DEV ? new URLSearchParams(window.location.search).get(key) : null;
function BrandMark({ compact = false }: { compact?: boolean }) {
  return <div className={`brand-mark ${compact ? "is-compact" : ""}`} aria-label="GunsMasterPro"><img src={emblem} alt="GunsMasterPro — catalogue européen de produits de tir" className="brand-emblem object-cover"/><span className="brand-wordmark">GUNS<span>MASTER</span><i>PRO</i></span></div>;
}
const EuropeanMark = () => <svg className="gmp-eu-mark" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1756b5"/>{[[12,4.2],[15.9,5.25],[18.75,8.1],[19.8,12],[18.75,15.9],[15.9,18.75],[12,19.8],[8.1,18.75],[5.25,15.9],[4.2,12],[5.25,8.1],[8.1,5.25]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.05" fill="#f4d56f"/>)}</svg>;
const headerCopy = {
  fr: { search: "Rechercher", searchHint: "pistolets, revolvers, carabines, optiques…", product: "Produit", category: "Catégorie", noResults: "Aucun résultat direct. Lancez la recherche complète.", viewAll: "Voir tous les résultats pour", mobileNav: "Navigation mobile" },
  en: { search: "Search", searchHint: "pistols, revolvers, rifles, optics…", product: "Product", category: "Category", noResults: "No direct result. Run a full search.", viewAll: "View all results for", mobileNav: "Mobile navigation" },
  de: { search: "Suchen", searchHint: "Pistolen, Revolver, Büchsen, Optiken…", product: "Produkt", category: "Kategorie", noResults: "Kein direktes Ergebnis. Starten Sie die vollständige Suche.", viewAll: "Alle Ergebnisse anzeigen für", mobileNav: "Mobile Navigation" },
} as const;
const comparisonCopy = {
  fr: "Les écarts entre modèles et spécifications sont mis en évidence pour accélérer la lecture.",
  en: "Differences between models and specifications are highlighted to make review faster.",
  de: "Unterschiede zwischen Modellen und Spezifikationen werden für eine schnellere Übersicht hervorgehoben.",
} as const;
const checkoutCopy = {
  fr: { error: "La demande n’a pas pu être enregistrée. Réessayez dans un instant.", greeting: "Bonjour GunsMasterPro,", request: "Demande", customer: "Client", email: "E-mail", phone: "Téléphone", products: "Produits", total: "Total estimatif", coupon: "Code avantage", countryConsent: "J’accepte que le pays détecté avec mon accord soit joint à cette demande pour le suivi opérationnel. Aucune position précise n’est collectée." },
  en: { error: "Your request could not be recorded. Please try again in a moment.", greeting: "Hello GunsMasterPro,", request: "Request", customer: "Customer", email: "Email", phone: "Phone", products: "Products", total: "Estimated total", coupon: "Benefit code", countryConsent: "I agree that the country detected with my permission is attached to this request for operational follow-up. No precise location is collected." },
  de: { error: "Ihre Anfrage konnte nicht gespeichert werden. Bitte versuchen Sie es gleich noch einmal.", greeting: "Guten Tag GunsMasterPro,", request: "Anfrage", customer: "Kunde", email: "E-Mail", phone: "Telefon", products: "Produkte", total: "Geschätzte Summe", coupon: "Vorteilscode", countryConsent: "Ich stimme zu, dass das mit meiner Zustimmung erkannte Land zur operativen Nachverfolgung dieser Anfrage beigefügt wird. Es wird kein genauer Standort erfasst." },
} as const;

function HighlightedSearchText({ text, query }: { text: string; query: string }) {
  const term = query.trim();
  if (term.length < 2) return <>{text}</>;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const chunks = text.split(new RegExp(`(${escaped})`, "ig"));
  return <>{chunks.map((chunk, index) => chunk.toLocaleLowerCase() === term.toLocaleLowerCase() ? <mark key={`${chunk}-${index}`}>{chunk}</mark> : <span key={`${chunk}-${index}`}>{chunk}</span>)}</>;
}

function SearchSuggestionCards({ suggestions, query, locale, activeIndex, onSelect, loading, compact = false }: { suggestions: GlobalSearchSuggestion[]; query: string; locale: "fr" | "en" | "de"; activeIndex: number; onSelect: (href: string) => void; loading: boolean; compact?: boolean }) {
  const t = translations[locale];
  const productStatus = (stock?: number) => stock === undefined || stock > 3 ? t.product.stock : stock > 0 ? t.product.lowStock : t.product.outOfStock;
  if (loading && !suggestions.length) return <div className="search-results-loading" role="status"><span className="search-results-spinner"/>{locale === "fr" ? "Recherche en cours…" : locale === "de" ? "Suche läuft…" : "Searching…"}</div>;
  return <>{suggestions.map((suggestion, index) => suggestion.kind === "product" ? <button key={`${suggestion.kind}-${suggestion.href}`} type="button" role="option" aria-selected={activeIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(suggestion.href)} className={`global-search-product-card ${activeIndex === index ? "is-active" : ""} ${compact ? "is-compact" : ""}`}><span className="global-search-product-media">{suggestion.imageUrl ? <img src={suggestion.imageUrl} alt={suggestion.title} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/media-fallback.svg"; }}/> : <PackageSearch/>}</span><span className="global-search-product-copy"><strong><HighlightedSearchText text={suggestion.title} query={query}/></strong><small><HighlightedSearchText text={suggestion.detail} query={query}/></small><i className={`search-stock-status ${suggestion.stock !== undefined && suggestion.stock < 1 ? "is-out" : suggestion.stock !== undefined && suggestion.stock <= 3 ? "is-limited" : ""}`}>{productStatus(suggestion.stock)}</i></span><span className="global-search-product-price">{suggestion.priceCents !== undefined ? formatMoney(suggestion.priceCents, locale) : <ArrowRight/>}</span></button> : <button key={`${suggestion.kind}-${suggestion.href}`} type="button" role="option" aria-selected={activeIndex === index} onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(suggestion.href)} className={`global-search-category-card ${activeIndex === index ? "is-active" : ""}`}><PackageSearch/><span><strong><HighlightedSearchText text={suggestion.title} query={query}/></strong><small><HighlightedSearchText text={suggestion.detail} query={query}/></small></span><span className="search-kind">{locale === "fr" ? "Catégorie" : locale === "de" ? "Kategorie" : "Category"}</span></button>)}</>;
}

export function StoreHeader() {
  const { locale, setLocale, cart, setCartOpen, compareIds } = useCommerce();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();
  const wishlist = trpc.wishlist.list.useQuery(undefined, { enabled: isAuthenticated });
  const [search, setSearch] = useState(() => developmentQuery("search") ?? "");
  const deferredSearch = useDeferredValue(search);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(() => developmentQuery("menu") === "1");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(() => Boolean(developmentQuery("search")));
  const [location, navigate] = useLocation();
  const t = translations[locale];
  const ui = headerCopy[locale];
  const searchTerm = deferredSearch.trim();
  const immediateSearchTerm = search.trim();
  const isSearchPending = immediateSearchTerm !== searchTerm;
  const productSearch = trpc.catalogue.list.useQuery(searchTerm.length >= 2 ? { search: searchTerm } : undefined, { enabled: searchTerm.length >= 2 });
  const categories = trpc.categories.list.useQuery();
  const suggestions = useMemo(() => getGlobalSearchSuggestions(searchTerm, productSearch.data ?? [], categories.data ?? []), [searchTerm, productSearch.data, categories.data]);
  const visibleSuggestions = isSearchPending ? [] : suggestions;
  useEffect(() => setActiveSuggestion(-1), [searchTerm]);
  const chooseSuggestion = (href: string) => { navigate(href); setSearch(""); setActiveSuggestion(-1); setMenuOpen(false); };
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const submitSearch = (event: FormEvent) => { event.preventDefault(); if (activeSuggestion >= 0 && visibleSuggestions[activeSuggestion]) chooseSuggestion(visibleSuggestions[activeSuggestion].href); else { navigate(`/catalogue?q=${encodeURIComponent(search.trim())}`); setMenuOpen(false); } };
  const handleSearchKeyboard = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && visibleSuggestions.length) { event.preventDefault(); setActiveSuggestion((current) => (current + 1) % visibleSuggestions.length); }
    if (event.key === "ArrowUp" && visibleSuggestions.length) { event.preventDefault(); setActiveSuggestion((current) => (current <= 0 ? visibleSuggestions.length - 1 : current - 1)); }
    if (event.key === "Escape") { setSearch(""); setActiveSuggestion(-1); }
  };
  return <><header className="gmp-header sticky top-0 z-40 border-b border-white/8 bg-[#081016]/92 backdrop-blur-xl">
    <div className="gmp-reassurance-bar border-b border-white/6 bg-[#0d171f] text-[11px] text-slate-300"><div className="container flex min-h-8 items-center justify-between gap-3 py-1"><div className="flex min-w-0 items-center gap-3"><span className="flex min-w-0 items-center gap-1.5"><EuropeanMark/><span className="hidden truncate sm:inline">{t.header.europeanSupplier}</span><span className="sm:hidden">{t.header.europeanSupplierCompact}</span></span><span className="hidden items-center gap-1.5 border-l border-white/15 pl-3 sm:flex"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#e4c67e]"/>{t.header.adultProtection}</span><span className="gmp-mobile-adult-badge sm:hidden"><ShieldCheck className="h-3 w-3"/>18+</span></div><Link href="/suivi" className="shrink-0 font-semibold hover:text-white">{t.nav.tracking}</Link></div></div>
    <div className="container flex h-20 items-center gap-4">
      <Link href="/" className="brand-lockup flex min-w-0 items-center gap-3 shrink-0"><BrandMark /></Link>
      <nav className="hidden lg:flex items-center gap-6 ml-5 text-sm font-medium text-slate-300"><Link href="/catalogue" className="hover:text-white">{t.nav.catalogue}</Link><Link href="/favoris" className="hover:text-white">{t.nav.collections}</Link><Link href="/comparateur" className="hover:text-white">{t.actions.compare}</Link><Link href="/suivi" className="hover:text-white">{t.nav.tracking}</Link><Link href="/conseiller" className="hover:text-white">{t.nav.contact}</Link></nav>
      <div className="relative ml-auto hidden max-w-xl flex-1 xl:block"><form onSubmit={submitSearch} className="global-search flex items-center rounded-xl border px-3"><Search className="h-4 w-4 shrink-0"/><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={handleSearchKeyboard} aria-autocomplete="list" aria-controls="header-search-results" aria-expanded={search.trim().length >= 2} placeholder={`${t.nav.search} · ${ui.searchHint}`} className="h-11 w-full bg-transparent px-3 text-sm outline-none"/><button aria-label={ui.search} className="grid h-8 w-8 place-items-center rounded-lg"><ArrowRight className="h-4 w-4"/></button></form>{search.trim().length >= 2 && <div id="header-search-results" role="listbox" className="global-search-results absolute left-0 right-0 top-[calc(100%+.45rem)] z-50 overflow-hidden rounded-xl border shadow-2xl">{visibleSuggestions.length || isSearchPending || productSearch.isFetching ? <SearchSuggestionCards suggestions={visibleSuggestions} query={search} locale={locale} activeIndex={activeSuggestion} onSelect={chooseSuggestion} loading={isSearchPending || productSearch.isFetching}/> : <p className="search-results-empty">{ui.noResults}</p>}<button type="button" onClick={() => { navigate(`/catalogue?q=${encodeURIComponent(search.trim())}`); setSearch(""); }} className="search-results-all"><Search className="h-3.5 w-3.5"/>{ui.viewAll} « {search.trim()} »<ArrowRight className="ml-auto h-3.5 w-3.5"/></button></div>}</div>
      <div className="language-switcher hidden md:flex" role="group" aria-label={t.header.language}><Languages className="h-3.5 w-3.5" aria-hidden="true"/>{(["fr", "en", "de"] as const).map((code) => <button key={code} onClick={() => setLocale(code)} aria-label={t.header.languages[code]} aria-pressed={locale === code} className={locale === code ? "is-active" : ""}>{code.toUpperCase()}</button>)}</div>
      <button onClick={toggleTheme} aria-label={theme === "dark" ? t.header.lightTheme : t.header.darkTheme} className="header-icon-action header-theme-trigger grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-200 hover:border-[#d7b46a]/60">{theme === "dark" ? <Sun className="h-4 w-4"/> : <Moon className="h-4 w-4"/>}</button>
      <Link href="/favoris" className="header-icon-action header-wishlist-trigger relative hidden md:grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-200 hover:border-[#d7b46a]/60" aria-label={t.actions.save}><Heart className="h-4 w-4"/>{isAuthenticated && (wishlist.data?.length ?? 0) > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ba3d3d] px-1 text-[9px] font-bold text-white">{wishlist.data?.length}</span>}</Link>
      <button onClick={() => isAuthenticated ? toast.success(user?.name ?? t.actions.account) : startLogin()} className="header-account-trigger hidden md:flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs text-slate-200 hover:border-[#d7b46a]/60">{isAuthenticated ? (user?.name?.split(" ")[0] ?? t.actions.account) : t.actions.login}</button>
      <button onClick={() => setMobileSearchOpen(true)} aria-label={t.nav.search} className="header-icon-action header-search-trigger grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white lg:hidden"><Search className="h-5 w-5"/></button>
      <button onClick={() => setCartOpen(true)} className="header-cart-trigger relative grid h-10 w-10 place-items-center rounded-lg bg-[#d7b46a] text-[#10191f] hover:bg-[#e4c57e]" aria-label={t.actions.cart}><ShoppingBag className="h-4 w-4"/>{itemCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#ba3d3d] px-1 text-[9px] font-bold text-white">{itemCount}</span>}</button>
      <button onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? t.header.closeMenu : t.nav.menu} aria-expanded={menuOpen} className="header-icon-action header-menu-trigger grid h-10 w-10 place-items-center rounded-lg border border-white/10 text-white lg:hidden">{menuOpen ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}</button>
    </div>
    {compareIds.length > 0 && <div className="comparison-header-dock border-t border-white/8 bg-[#111d26]"><div className="container flex h-9 items-center justify-between text-xs text-slate-300"><span className="comparison-header-count flex items-center gap-2"><Scale className="h-3.5 w-3.5 text-[#d7b46a]"/>{compareIds.length}/3 {t.actions.compare.toLowerCase()}</span><a href="#comparison" className="comparison-header-link text-[#e5c97f] hover:text-white">{t.actions.compare}</a></div></div>}
  </header>{mobileSearchOpen && <MobileSearchPanel locale={locale} onClose={() => setMobileSearchOpen(false)}/>} {menuOpen && <MobileMenuPanel locale={locale} setLocale={setLocale} theme={theme} toggleTheme={() => toggleTheme?.()} cartCount={itemCount} onCart={() => { setCartOpen(true); setMenuOpen(false); }} onClose={() => setMenuOpen(false)} isAuthenticated={isAuthenticated} userName={user?.name}/>}<nav aria-label={ui.mobileNav} className="mobile-bottom-nav lg:hidden"><Link href="/" className={location === "/" ? "is-active" : ""}><Home/><span>{t.nav.home}</span></Link><Link href="/catalogue" className={location.startsWith("/catalogue") ? "is-active" : ""}><PackageSearch/><span>{t.nav.catalogue}</span></Link><Link href="/favoris" className={location === "/favoris" ? "is-active" : ""}><Heart/><span>{t.nav.favourites}</span></Link><Link href="/suivi" className={location === "/suivi" ? "is-active" : ""}><ClipboardCopy/><span>{t.nav.tracking}</span></Link><Link href="/panier" className={location === "/panier" ? "is-active" : ""}><ShoppingBag/>{itemCount > 0 && <i>{itemCount}</i>}<span>{t.actions.cart}</span></Link></nav></>;
}

function MobileSearchPanel({ locale, onClose }: { locale: "fr" | "en" | "de"; onClose: () => void }) {
  const t = translations[locale];
  const [, navigate] = useLocation();
  const [search, setSearch] = useState(() => developmentQuery("search") ?? "");
  const deferredSearch = useDeferredValue(search);
  const term = deferredSearch.trim();
  const immediateTerm = search.trim();
  const isPending = immediateTerm !== term;
  const products = trpc.catalogue.list.useQuery(term.length >= 2 ? { search: term } : undefined, { enabled: term.length >= 2 });
  const categories = trpc.categories.list.useQuery();
  const suggestions = useMemo(() => getGlobalSearchSuggestions(term, products.data ?? [], categories.data ?? []), [term, products.data, categories.data]);
  const visibleSuggestions = isPending ? [] : suggestions;
  const go = (href: string) => { navigate(href); onClose(); };
  const viewAll = () => go(`/catalogue?q=${encodeURIComponent(search.trim())}`);
  const title = locale === "fr" ? "Recherche catalogue" : locale === "de" ? "Katalogsuche" : "Catalogue search";
  const empty = locale === "fr" ? "Aucune référence directe." : locale === "de" ? "Keine direkte Referenz." : "No direct reference.";
  return <div className="mobile-search-layer lg:hidden" role="presentation"><button className="mobile-menu-backdrop" aria-label={t.header.closeMenu} onClick={onClose}/><section className="mobile-search-panel" role="dialog" aria-modal="true" aria-label={title}><div className="mobile-search-panel-head"><div><BrandMark compact /><h2>{title}</h2></div><button onClick={onClose} aria-label={t.header.closeMenu}><X/></button></div><form onSubmit={(event) => { event.preventDefault(); viewAll(); }} className="mobile-search-search"><Search/><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.nav.search}/><button aria-label={t.nav.search}><ArrowRight/></button></form>{search.trim().length >= 2 ? <div className="mobile-search-results" role="listbox">{visibleSuggestions.length || isPending || products.isFetching ? <SearchSuggestionCards suggestions={visibleSuggestions.slice(0, 6)} query={search} locale={locale} activeIndex={-1} onSelect={go} loading={isPending || products.isFetching} compact/> : <p className="search-results-empty">{empty}</p>}<button type="button" className="search-results-all" onClick={viewAll}><Search/>{locale === "fr" ? "Voir tout le catalogue" : locale === "de" ? "Gesamten Katalog anzeigen" : "View full catalogue"}<ArrowRight/></button></div> : <p className="mobile-search-hint">{locale === "fr" ? "Saisissez au moins deux caractères pour découvrir les références, catégories et disponibilités." : locale === "de" ? "Geben Sie mindestens zwei Zeichen ein, um Referenzen, Kategorien und Verfügbarkeiten zu entdecken." : "Enter at least two characters to discover references, categories and availability."}</p>}</section></div>;
}

function MobileMenuPanel({ locale, setLocale, theme, toggleTheme, cartCount, onCart, onClose, isAuthenticated, userName }: { locale: "fr" | "en" | "de"; setLocale: (locale: "fr" | "en" | "de") => void; theme: "dark" | "light"; toggleTheme: () => void; cartCount: number; onCart: () => void; onClose: () => void; isAuthenticated: boolean; userName?: string | null }) {
  const t = translations[locale];
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const term = deferredSearch.trim();
  const immediateTerm = search.trim();
  const isSearchPending = immediateTerm !== term;
  const products = trpc.catalogue.list.useQuery(term.length >= 2 ? { search: term } : undefined, { enabled: term.length >= 2 });
  const categories = trpc.categories.list.useQuery();
  const suggestions = useMemo(() => getGlobalSearchSuggestions(term, products.data ?? [], categories.data ?? []), [term, products.data, categories.data]);
  const visibleSuggestions = isSearchPending ? [] : suggestions;
  const go = (href: string) => { navigate(href); onClose(); };
  return <div className="mobile-menu-layer lg:hidden" role="presentation"><button className="mobile-menu-backdrop" aria-label={t.header.closeMenu} onClick={onClose}/><aside className="mobile-menu-panel" role="dialog" aria-modal="true" aria-label={t.nav.menu}><div className="mobile-menu-panel-head"><div><BrandMark compact /><h2>{t.nav.menu}</h2></div><button onClick={onClose} aria-label={t.header.closeMenu}><X/></button></div><form onSubmit={(event) => { event.preventDefault(); go(`/catalogue?q=${encodeURIComponent(search.trim())}`); }} className="mobile-menu-search"><Search/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.nav.search}/><button aria-label={t.nav.search}><ArrowRight/></button></form>{search.trim().length >= 2 && <div className="mobile-menu-suggestions" role="listbox">{visibleSuggestions.length || isSearchPending || products.isFetching ? <SearchSuggestionCards suggestions={visibleSuggestions.slice(0, 5)} query={search} locale={locale} activeIndex={-1} onSelect={go} loading={isSearchPending || products.isFetching} compact/> : <p className="search-results-empty">{locale === "fr" ? "Aucun résultat direct." : locale === "de" ? "Kein direktes Ergebnis." : "No direct result."}</p>}<button type="button" className="search-results-all" onClick={() => go(`/catalogue?q=${encodeURIComponent(search.trim())}`)}><Search/>{locale === "fr" ? "Voir tous les résultats" : locale === "de" ? "Alle Ergebnisse anzeigen" : "View all results"}<ArrowRight/></button></div>}<div className="mobile-menu-section"><p>{t.nav.catalogue}</p><button onClick={() => go("/catalogue")}><PackageSearch/>{t.nav.catalogue}<ArrowRight/></button><button onClick={() => go("/favoris")}><Star/>{t.nav.collections}<ArrowRight/></button><button onClick={() => go("/comparateur")}><Scale/>{t.actions.compare}<ArrowRight/></button><button onClick={() => go("/conseiller")}><CircleHelp/>{t.nav.contact}<ArrowRight/></button></div><div className="mobile-menu-section"><p>{t.nav.support}</p><button onClick={() => go("/suivi")}><ClipboardCopy/>{t.nav.tracking}<ArrowRight/></button><button onClick={() => go("/aide")}><CircleHelp/>{t.nav.support}<ArrowRight/></button><button onClick={() => go("/conformite")}><ShieldCheck/>{t.nav.information}<ArrowRight/></button><button onClick={() => go("/conditions")}><FileText/>{t.nav.terms}<ArrowRight/></button></div><div className="mobile-menu-tools"><div className="language-switcher" role="group" aria-label={t.header.language}><Languages/>{(["fr", "en", "de"] as const).map((code) => <button key={code} onClick={() => setLocale(code)} aria-pressed={locale === code} className={locale === code ? "is-active" : ""}>{code.toUpperCase()}</button>)}</div><button onClick={toggleTheme}>{theme === "dark" ? <Sun/> : <Moon/>}{theme === "dark" ? t.header.lightTheme : t.header.darkTheme}</button></div><div className="mobile-menu-actions"><button onClick={onCart}><ShoppingBag/>{t.actions.cart}{cartCount > 0 && <span>{cartCount}</span>}</button><button onClick={() => isAuthenticated ? toast.success(userName ?? t.actions.account) : startLogin()}><UserRound/>{isAuthenticated ? (userName?.split(" ")[0] ?? t.actions.account) : t.actions.login}</button></div></aside></div>;
}

export function ProductCard({ product }: { product: StoreProduct }) {
  const { locale, addToCart } = useCommerce();
  const { isAuthenticated } = useAuth();
  const wishlist = trpc.wishlist.list.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();
  const wishToggle = trpc.wishlist.toggle.useMutation({ onSuccess: () => utils.wishlist.list.invalidate() });
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const cardGallery = useMemo(() => Array.from(new Set([product.imageUrl, ...(product.gallery ?? [])])).slice(0, 8), [product.gallery, product.imageUrl]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryRunning, setGalleryRunning] = useState(false);
  const collections = trpc.collections.list.useQuery(undefined, { enabled: isAuthenticated && collectionPickerOpen });
  const addCollectionItem = trpc.collections.addItem.useMutation({ onSuccess: () => { setCollectionPickerOpen(false); utils.collections.list.invalidate(); toast.success(t.actions.saved); } });
  const t = translations[locale];
  const saved = Boolean(wishlist.data?.some((entry) => entry.product.id === product.id));
  const stockState = product.stock < 1 ? "out" : product.stock <= 3 ? "low" : "available";
  const stockLabel = stockState === "out" ? t.product.outOfStock : stockState === "low" ? t.product.lowStock : t.product.stock;
  const toggleSave = () => { if (!isAuthenticated) { toast.info(t.ui.syncWishlist); startLogin(); return; } wishToggle.mutate({ productId: product.id }); };
  const openCollectionPicker = () => { if (!isAuthenticated) { toast.info(t.ui.syncWishlist); startLogin(); return; } setCollectionPickerOpen(true); };
  const rating = product.reviewCount ? (product.ratingCenti ?? 0) / 100 : null;
  useEffect(() => { setGalleryIndex(0); }, [product.id]);
  useEffect(() => {
    if (!galleryRunning || cardGallery.length < 2) return;
    const timer = window.setInterval(() => setGalleryIndex((index) => (index + 1) % cardGallery.length), 1300);
    return () => window.clearInterval(timer);
  }, [galleryRunning, cardGallery.length]);
  const showGalleryImage = (index: number) => setGalleryIndex((index + cardGallery.length) % cardGallery.length);
  return <><article className="gmp-card product-card group overflow-hidden rounded-2xl border border-white/8 bg-[#101a22]">
    <div className="product-card-media relative aspect-[1.05] overflow-hidden bg-[#15232d]" onMouseEnter={() => setGalleryRunning(true)} onMouseLeave={() => setGalleryRunning(false)}><Link href={`/produit/${product.slug}`} className="absolute inset-0 z-0" aria-label={`${t.actions.details} · ${product.name}`}><img src={cardGallery[galleryIndex] ?? product.imageUrl} alt={product.name} loading="lazy" decoding="async" width="480" height="457" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/></Link><div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-[#071015]/80 via-transparent to-transparent"/><div className="product-card-category absolute left-3 top-3 z-10 rounded-full border border-[#d7b46a]/35 bg-[#0a1117]/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.13em] text-[#e2c57e]">{t.category[product.category]}</div><button onClick={toggleSave} aria-label={t.actions.save} className={`product-card-action absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border backdrop-blur ${saved ? "is-saved" : ""}`}><Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`}/></button><button onClick={openCollectionPicker} aria-label={t.product.saveToCollection} className="product-card-action absolute right-3 top-14 z-10 grid h-9 w-9 place-items-center rounded-full border backdrop-blur"><FolderPlus className="h-4 w-4"/></button>{cardGallery.length > 1 && <><div className="product-card-gallery-controls"><button type="button" onClick={() => showGalleryImage(galleryIndex - 1)} aria-label={`${t.product.gallery} -`}><ChevronLeft/></button><button type="button" onClick={() => showGalleryImage(galleryIndex + 1)} aria-label={`${t.product.gallery} +`}><ChevronRight/></button></div><div className="product-card-gallery-dots">{cardGallery.map((image, index) => <button type="button" key={image} onClick={() => showGalleryImage(index)} className={index === galleryIndex ? "is-active" : ""} aria-label={`${t.product.gallery} ${index + 1}`}/>)}</div></>}<div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between gap-2"><span className="product-card-brand text-xs">{product.brand}</span><span className="product-card-price rounded-md bg-[#d7b46a] px-2 py-1 text-xs font-bold text-[#0a1217]">{formatMoney(product.priceCents, locale)}</span></div></div>
    <div className="p-4"><Link href={`/produit/${product.slug}`} className="block"><h3 className="font-display text-xl leading-tight text-white transition group-hover:text-[#e5c97f]">{product.name}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-slate-400">{product.excerpt}</p></Link>{rating !== null && <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#e4c67e]"><Star className="h-3.5 w-3.5 fill-current"/>{rating.toFixed(1)} <span className="font-normal text-slate-400">({product.reviewCount})</span></div>}<div className="mt-4 flex items-center justify-between border-t border-white/7 pt-3 text-xs text-slate-400"><span>{product.caliber}</span><span className={`product-stock-status is-${stockState}`}>{stockLabel}</span></div><div className="mt-4"><button disabled={product.stock < 1} onClick={() => addToCart(product)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#d7b46a] py-2 text-xs font-bold text-[#091116] hover:bg-[#e6c983] disabled:cursor-not-allowed disabled:opacity-45"><Plus className="h-3.5 w-3.5"/>{t.actions.order}</button></div></div>
  </article>{collectionPickerOpen && <div className="fixed inset-0 z-[75] grid place-items-center bg-[#020609]/75 p-4"><section role="dialog" aria-modal="true" className="gmp-card w-full max-w-md rounded-2xl border border-white/10 bg-[#101a22] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><BrandMark compact /><h2 className="font-display mt-1 text-3xl text-white">{t.product.saveToCollection}</h2></div><button type="button" onClick={() => setCollectionPickerOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/8" aria-label={t.actions.cancel}><X className="h-5 w-5"/></button></div>{collections.isLoading ? <div className="mt-6 h-20 animate-pulse rounded-xl bg-white/5"/> : collections.data?.length ? <div className="mt-6 max-h-[50vh] space-y-2 overflow-y-auto">{collections.data.map((collection) => <button key={collection.id} type="button" disabled={addCollectionItem.isPending} onClick={() => addCollectionItem.mutate({ collectionId: collection.id, productId: product.id })} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.02] p-4 text-left hover:border-[#d7b46a]/55"><span><strong className="block text-sm text-white">{collection.isSystemSaved ? t.wishlist.saved : collection.name}</strong><small className="mt-1 block text-xs text-slate-500">{collection.items.length} {t.wishlist.itemCount}</small></span><Plus className="h-4 w-4 text-[#d7b46a]"/></button>)}</div> : <div className="mt-6 rounded-xl border border-dashed border-white/14 p-5 text-sm leading-6 text-slate-400"><p>{t.wishlist.collectionEmpty}</p><Link href="/favoris" onClick={() => setCollectionPickerOpen(false)} className="mt-4 inline-flex rounded-lg bg-[#d7b46a] px-4 py-2.5 text-xs font-bold text-[#091116]">{t.wishlist.create}</Link></div>}</section></div>}</>;
}

function CartGalleryPreview({ product, onPreview }: { product: StoreProduct; onPreview: (product: StoreProduct) => void }) {
  const images = useMemo(() => Array.from(new Set([product.imageUrl, ...(product.gallery ?? [])].filter(Boolean))), [product.gallery, product.imageUrl]);
  const [index, setIndex] = useState(0);
  useEffect(() => { setIndex(0); }, [product.id]);
  useEffect(() => {
    if (images.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % images.length), 1800);
    return () => window.clearInterval(timer);
  }, [images.length]);
  const activeImage = images[index] ?? product.imageUrl;
  return <div className="cart-gallery-preview" aria-label={`${product.name} — ${index + 1}/${images.length}`}>
    <img key={activeImage} src={activeImage} alt={product.name} className="cart-gallery-preview-image" />
    <button type="button" className="cart-gallery-preview-quick" onClick={() => onPreview(product)} aria-label={`Aperçu rapide — ${product.name}`} title="Aperçu rapide"><Eye className="h-4 w-4"/></button>
    {images.length > 1 && <div className="cart-gallery-preview-dots" aria-hidden="true">{images.map((image, dotIndex) => <span key={image} className={dotIndex === index ? "is-active" : ""}/>)}</div>}
  </div>;
}

function QuickProductPreview({ product, locale, onClose }: { product: StoreProduct; locale: Locale; onClose: () => void }) {
  const t = translations[locale];
  const quickPreviewTitle = locale === "fr" ? `La référence ${product.name} en détail` : locale === "de" ? `Die Referenz ${product.name} im Detail` : `The reference ${product.name} in detail`;
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const wishlist = trpc.wishlist.list.useQuery(undefined, { enabled: isAuthenticated });
  const wishToggle = trpc.wishlist.toggle.useMutation({ onSuccess: () => utils.wishlist.list.invalidate() });
  const saved = Boolean(wishlist.data?.some((entry) => entry.product.id === product.id));
  const toggleSave = () => { if (!isAuthenticated) { toast.info(t.ui.syncWishlist); startLogin(); return; } wishToggle.mutate({ productId: product.id }); };
  const shareProduct = async () => { const url = `${window.location.origin}/produit/${product.slug}`; try { if (navigator.share) await navigator.share({ title: product.name, text: product.excerpt, url }); else { await navigator.clipboard.writeText(url); toast.success(t.product.copied); } } catch { /* User cancellation is intentional. */ } };
  const images = Array.from(new Set([product.imageUrl, ...(product.gallery ?? [])].filter(Boolean)));
  const stockState = product.stock < 1 ? "out" : product.stock < 3 ? "low" : "available";
  const stockLabel = product.stock < 1 ? t.product.outOfStock : product.stock < 3 ? t.product.lowStock : `${product.stock} ${t.product.availabilityCount}`;
  return <div className="quick-preview-backdrop" role="dialog" aria-modal="true" aria-label={quickPreviewTitle} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="quick-preview-modal">
      <div className="quick-preview-head"><div><BrandMark compact /><h2 className={`quick-preview-title ${quickPreviewTitle.length > 72 ? "is-very-long" : quickPreviewTitle.length > 52 ? "is-extra-long" : quickPreviewTitle.length > 36 ? "is-long" : ""}`}>{quickPreviewTitle}</h2><div className="quick-preview-actions"><button type="button" onClick={toggleSave} className={`quick-preview-action ${saved ? "is-saved" : ""}`} aria-pressed={saved}><Heart className={saved ? "fill-current" : ""}/><span>{t.actions.save}</span></button><button type="button" onClick={shareProduct} className="quick-preview-action"><ClipboardCopy/><span>{t.actions.share}</span></button></div></div><button type="button" onClick={onClose} className="quick-preview-close" aria-label={t.actions.cancel}><X/></button></div>
      <div className="quick-preview-gallery">{images.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${product.name} — ${t.product.gallery} ${index + 1}`} />)}</div>
      <div className="quick-preview-summary"><div className="quick-preview-meta"><span className="quick-preview-category">{t.category[product.category]}</span><span className={`product-stock-status is-${stockState}`}>{stockLabel}</span></div><strong className="quick-preview-price">{formatMoney(product.priceCents, locale)}</strong><p>{product.excerpt || product.description}</p><dl><div><dt>{t.catalogue.caliber}</dt><dd>{product.caliber}</dd></div><div><dt>{t.catalogue.material}</dt><dd>{product.material}</dd></div><div><dt>{t.product.capacity}</dt><dd>{product.capacity}</dd></div><div><dt>{t.product.model}</dt><dd>{product.model || product.name}</dd></div></dl></div>
    </section>
  </div>;
}

export function CartDrawer() {
  const { locale, cart, changeQuantity, removeFromCart, couponCode, setCouponCode, cartOpen, setCartOpen } = useCommerce();
  const [checkout, setCheckout] = useState(() => Boolean(developmentQuery("checkout")));
  const [couponDraft, setCouponDraft] = useState(couponCode ?? "");
  const [previewProduct, setPreviewProduct] = useState<StoreProduct | null>(null);
  const t = translations[locale];
  const subtotal = cart.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
  const appliedCoupon = evaluateCoupon(couponCode, subtotal);
  const total = subtotal + appliedCoupon.priceAdjustmentCents;
  if (!cartOpen) return null;
  const applyCoupon = () => {
    const coupon = evaluateCoupon(couponDraft, subtotal);
    if (!coupon.valid || !coupon.code) { setCouponCode(null); return toast.error(t.product.couponInvalid); }
    setCouponCode(coupon.code);
    toast.success(t.product.couponValid);
  };
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#02070a]/70" role="dialog" aria-modal="true"><aside className="cart-drawer-panel flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#0c151c] shadow-2xl"><div className="flex items-center justify-between border-b border-white/8 p-5"><div><BrandMark compact /><h2 className="cart-drawer-title font-display text-2xl text-white">{t.cart.title}</h2></div><button onClick={() => setCartOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/8"><X className="h-5 w-5"/></button></div><div className="cart-drawer-scroll flex-1 overflow-y-auto p-5">{cart.length === 0 ? <div className="grid h-48 place-items-center rounded-xl border border-dashed border-white/12 text-sm text-slate-400">{t.cart.empty}</div> : <div className="space-y-3">{cart.map(({ product, quantity }) => <div key={product.id} className="flex gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3"><CartGalleryPreview product={product} onPreview={setPreviewProduct}/><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{product.name}</p><p className="mt-1 text-xs text-slate-400">{formatMoney(product.priceCents, locale)}</p><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-lg border border-white/10"><button onClick={() => changeQuantity(product.id, quantity - 1)} className="p-1.5 text-slate-300"><Minus className="h-3.5 w-3.5"/></button><span className="w-7 text-center text-xs text-white">{quantity}</span><button onClick={() => changeQuantity(product.id, quantity + 1)} className="p-1.5 text-slate-300"><Plus className="h-3.5 w-3.5"/></button></div><button onClick={() => removeFromCart(product.id)} className="p-1 text-slate-500 hover:text-[#dc6c6c]"><Trash2 className="h-4 w-4"/></button></div></div></div>)}</div>}<p className="mt-6 text-xs leading-5 text-slate-500">{t.cart.info}</p></div><div className="border-t border-white/8 p-5"><label className="block text-xs font-bold uppercase tracking-[.1em] text-slate-500">{t.product.coupon}<div className="mt-2 flex gap-2"><input value={couponDraft} onChange={(event) => setCouponDraft(event.target.value)} placeholder="GUNMASTER26" className="store-input min-w-0 flex-1"/><button type="button" onClick={applyCoupon} className="rounded-lg border border-[#d7b46a]/45 px-3 text-xs font-bold text-[#e5c97f]">{t.actions.apply}</button></div></label>{couponCode && <p className="mt-2 text-xs font-semibold text-emerald-300">{couponCode} · {t.product.couponValid}</p>}<div className="mb-4 mt-4 flex items-end justify-between"><span className="text-sm text-slate-400">{t.cart.subtotal}</span><strong className="font-display text-3xl text-[#e8ce8b]">{formatMoney(total, locale)}</strong></div><button disabled={!cart.length} onClick={() => setCheckout(true)} className="w-full rounded-xl bg-[#d7b46a] px-4 py-3 text-sm font-bold text-[#0b1217] disabled:cursor-not-allowed disabled:opacity-40">{t.actions.checkout}</button></div></aside>{checkout && <CheckoutModal onClose={() => setCheckout(false)} />}{previewProduct && <QuickProductPreview product={previewProduct} locale={locale} onClose={() => setPreviewProduct(null)} />}</div>;
}

function CheckoutModal({ onClose }: { onClose: () => void }) {
  const { locale, countryCode, cart, couponCode, setCartOpen } = useCommerce();
  const checkoutPreview = developmentQuery("checkout");
  const [form, setForm] = useState({ customerName: "", customerEmail: "", customerPhone: "", consent: false, countryContextConsent: false });
  const [success, setSuccess] = useState<{ reference: string; totalCents: number } | null>(() => checkoutPreview === "success" ? { reference: "GMP-PREVIEW-18", totalCents: 0 } : null);
  const t = translations[locale];
  const copy = checkoutCopy[locale];
  const create = trpc.orders.create.useMutation({ onError: () => toast.error(copy.error) });
  const settings = trpc.settings.public.useQuery(undefined, { staleTime: 0, refetchInterval: 15_000, refetchIntervalInBackground: true });
  const handleSubmit = (event: FormEvent) => { event.preventDefault(); if (!form.consent) return toast.error(t.cart.consent); create.mutate({ ...form, locale, countryCode, couponCode: couponCode ?? undefined, items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })) }, { onSuccess: (result) => setSuccess({ reference: result.reference, totalCents: result.totalCents }) }); };
  const openConversation = (channel: "whatsapp" | "telegram") => { if (!success) return; const absoluteImage = (url: string) => url.startsWith("http") ? url : `${window.location.origin}${url}`; const lines = cart.map((line, index) => `${index + 1}. ${line.product.name}\n   ${locale === "fr" ? "Référence" : locale === "de" ? "Referenz" : "Reference"}: ${line.product.slug}\n   ${locale === "fr" ? "Quantité" : locale === "de" ? "Menge" : "Quantity"}: ${line.quantity}\n   ${locale === "fr" ? "Prix unitaire" : locale === "de" ? "Einzelpreis" : "Unit price"}: ${formatMoney(line.product.priceCents, locale)}\n   ${locale === "fr" ? "Sous-total" : locale === "de" ? "Zwischensumme" : "Line total"}: ${formatMoney(line.product.priceCents * line.quantity, locale)}\n   ${locale === "fr" ? "Image" : locale === "de" ? "Bild" : "Image"}: ${absoluteImage(line.product.imageUrl)}`).join("\n\n"); const couponLine = couponCode ? `\n${copy.coupon}: ${couponCode}` : ""; const localeLabel = locale === "fr" ? "FR" : locale === "de" ? "DE" : "EN"; const body = `${copy.greeting}\n\n${copy.request} ${success.reference}\n${locale === "fr" ? "Langue" : locale === "de" ? "Sprache" : "Language"}: ${localeLabel}\n${copy.customer}: ${form.customerName}\n${copy.email}: ${form.customerEmail}\n${copy.phone}: ${form.customerPhone}\n\n${copy.products}:\n${lines}\n\n${copy.total}: ${formatMoney(success.totalCents, locale)}${couponLine}\n\n${locale === "fr" ? "Merci de confirmer la disponibilité et les prochaines étapes applicables." : locale === "de" ? "Bitte bestätigen Sie Verfügbarkeit und die nächsten anwendbaren Schritte." : "Please confirm availability and the applicable next steps."}`; if (channel === "whatsapp") window.open(buildWhatsappConversationUrl(settings.data?.whatsappNumber, body), "_blank", "noopener,noreferrer"); else openTelegramConversation(body, settings.data?.telegramHandle || "tom_glock"); setCartOpen(false); onClose(); };
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#02070a]/80 p-4"><div className="checkout-modal-panel gmp-checkout-modal w-full max-w-lg rounded-2xl border border-white/10 bg-[#101a22] shadow-2xl">{success ? <div className="p-7"><div className="grid h-12 w-12 place-items-center rounded-full bg-[#d7b46a]/15 text-[#e4c67f]"><Check className="h-6 w-6"/></div><BrandMark compact /><h2 className="gmp-modal-title font-display text-3xl text-white">{t.cart.confirmation}</h2><p className="mt-3 text-sm text-slate-300">{t.cart.sent} <strong className="text-[#e5c97f]">{success.reference}</strong>.</p><p className="mt-2 text-sm leading-6 text-slate-400">{t.cart.whatsapp}</p><div className="mt-7 grid gap-3 sm:grid-cols-3"><button onClick={() => openConversation("whatsapp")} className="rounded-xl bg-[#d7b46a] px-4 py-3 text-sm font-bold text-[#0a1217]">{t.actions.send}</button><button onClick={() => openConversation("telegram")} className="rounded-xl bg-[#1d7fbb] px-4 py-3 text-sm font-bold text-white">Telegram</button><Link href="/suivi" onClick={() => { setCartOpen(false); onClose(); }} className="rounded-xl border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white">{t.actions.track}</Link></div></div> : <form onSubmit={handleSubmit} className="p-6"><div className="flex items-center justify-between"><div><BrandMark compact /><h2 className="gmp-modal-title font-display text-3xl text-white">{t.cart.client}</h2></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-300"><X className="h-5 w-5"/></button></div>{checkoutPreview === "error" && <p role="alert" className="mt-5 rounded-xl border border-[#d86f6f]/40 bg-[#d86f6f]/10 px-4 py-3 text-sm text-[#ffc0c0]">{copy.error}</p>}<div className="mt-6 grid gap-3"><input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder={t.cart.name} className="store-input"/><input required type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })} placeholder={t.cart.email} className="store-input"/><input required type="tel" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder={t.cart.phone} className="store-input"/><label className="mt-1 flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs leading-5 text-slate-300"><input type="checkbox" checked={form.consent} onChange={(e) => setForm({ ...form, consent: e.target.checked })} className="mt-1 accent-[#d7b46a]"/>{t.cart.consent}</label><label className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs leading-5 text-slate-300"><input type="checkbox" checked={form.countryContextConsent} disabled={!countryCode} onChange={(e) => setForm({ ...form, countryContextConsent: e.target.checked })} className="mt-1 accent-[#d7b46a] disabled:opacity-40"/>{copy.countryConsent}</label></div><button disabled={create.isPending} className="mt-5 w-full rounded-xl bg-[#d7b46a] px-4 py-3 text-sm font-bold text-[#0b1217] disabled:opacity-60">{create.isPending ? "…" : t.actions.sendOrder}</button></form>}</div></div>;
}

export function ProductComparison({ products }: { products: StoreProduct[] }) {
  const { locale, addToCart, compareIds, toggleCompare } = useCommerce();
  const t = translations[locale];
  const selected = products.filter((product) => compareIds.includes(product.id));
  if (!selected.length) return null;
  const fixedRows: Array<[string, (product: StoreProduct) => unknown]> = [[t.cart.subtotal, (product) => formatMoney(product.priceCents, locale)], [t.product.stock, (product) => product.stock > 0 ? `${product.stock} ${t.product.availabilityCount}` : t.product.outOfStock], [t.product.reviewLabel, (product) => product.reviewCount ? `${((product.ratingCenti ?? 0) / 100).toFixed(1)} · ${product.reviewCount}` : "—"], [t.product.manufacturer, (product) => product.manufacturer], [t.product.model, (product) => product.model], [t.catalogue.caliber, (product) => product.caliber], [t.catalogue.material, (product) => product.material], [t.product.capacity, (product) => product.capacity], [t.product.actionLabel, (product) => product.action], [t.product.barrel, (product) => product.barrelLength], [t.product.length, (product) => product.overallLength], [t.product.weight, (product) => product.weight], [t.product.subCategory, (product) => product.subCategory]];
  const dynamicRows: Array<[string, (product: StoreProduct) => unknown]> = Array.from(new Set(selected.flatMap((product) => Object.keys(product.specifications ?? {})))).map((key) => [key, (product) => product.specifications?.[key] ?? "—"]);
  const rows = [...fixedRows, ...dynamicRows];
  return <section id="comparison" className="container py-16"><div className="mb-7 flex items-end justify-between gap-5"><div><BrandMark compact /><h2 className="font-display text-4xl text-white">{t.actions.compare}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{comparisonCopy[locale]}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-400">{selected.length}/3</span></div><div className="gmp-card overflow-x-auto rounded-2xl border border-white/8"><table className="w-full min-w-[760px] border-collapse text-left"><thead className="bg-white/[.035]"><tr><th className="w-44 p-4 text-xs uppercase tracking-[.12em] text-slate-500">{t.product.spec}</th>{selected.map((product) => <th key={product.id} className="min-w-60 p-4 align-top"><div className="flex items-start gap-3"><img src={product.imageUrl} alt={`${product.name} — ${product.brand}`} loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = "/media-fallback.svg"; }} className="h-16 w-16 rounded-lg object-cover"/><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><Link href={`/produit/${product.slug}`} className="font-display text-xl leading-tight text-white hover:text-[#e5c97f]">{product.name}</Link><button onClick={() => toggleCompare(product.id)} className="text-slate-500 hover:text-white" aria-label={t.actions.remove}><X className="h-4 w-4"/></button></div><p className="mt-1 text-xs text-slate-400">{product.brand}</p><strong className="mt-2 block text-sm text-[#e6ca83]">{formatMoney(product.priceCents, locale)}</strong></div></div><div className="mt-4 grid grid-cols-2 gap-2"><Link href={`/produit/${product.slug}`} className="rounded-lg border border-white/12 px-2 py-2 text-center text-xs font-bold text-slate-200 hover:border-[#d7b46a]/55">{t.actions.details}</Link><button onClick={() => addToCart(product)} disabled={product.stock < 1} className="rounded-lg bg-[#d7b46a] px-2 py-2 text-xs font-bold text-[#091116] disabled:opacity-40"><Plus className="mr-1 inline h-3.5 w-3.5"/>{t.actions.add}</button></div></th>)}</tr></thead><tbody>{rows.map(([label, valueOf]) => { const values = selected.map(valueOf); const differs = comparisonValuesDiffer(values); return <tr key={label} className="border-t border-white/7"><th className="p-4 text-sm font-medium text-slate-400">{label}</th>{selected.map((product) => <td key={product.id} className={`p-4 text-sm text-white ${differs ? "comparison-diff" : ""}`}>{String(valueOf(product) ?? "—")}</td>)}</tr>; })}</tbody></table></div></section>;
}

export function ShareButton({ product }: { product: StoreProduct }) {
  const { locale } = useCommerce();
  const t = translations[locale];
  const share = async () => { const url = window.location.href; try { if (navigator.share) await navigator.share({ title: product.name, text: product.excerpt, url }); else { await navigator.clipboard.writeText(url); toast.success(t.product.copied); } } catch { /* User cancellation is intentional. */ } };
  return <button onClick={share} className="product-share-button inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/12 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-[#d7b46a]/60"><ClipboardCopy className="h-3.5 w-3.5"/>{t.actions.share}</button>;
}

export function AgeGate() {
  const { locale } = useCommerce();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(isAgeGateRequired(import.meta.env.DEV, window.location.search, localStorage.getItem("gmp-age-verified") === "true"));
  }, []);
  const t = translations[locale];
  if (!open) return null;
  return <div className="age-gate-layer fixed inset-0 z-[70] grid place-items-center bg-[#020609]/95 p-5"><div className="age-gate-card w-full max-w-lg rounded-2xl border border-[#d7b46a]/30 bg-[#101b22] p-7 shadow-2xl"><div className="age-gate-heading"><img src={emblem} alt="GunsMasterPro — accès réservé aux personnes majeures" className="h-16 w-16 rounded-full object-cover"/><p className="eyebrow mt-5">GunsMasterPro · 18+</p><h1 className="font-display text-4xl text-white">{t.age.title}</h1></div><p className="age-gate-message mt-5 leading-7 text-slate-300">{t.age.body}</p><div className="mt-7 grid gap-3 sm:grid-cols-2"><button onClick={() => { localStorage.setItem("gmp-age-verified", "true"); setOpen(false); }} className="rounded-xl bg-[#d7b46a] px-4 py-3 text-sm font-bold text-[#0a1217]">{t.age.enter}</button><button onClick={() => window.location.assign("https://www.google.com")} className="rounded-xl border border-white/14 px-4 py-3 text-sm font-semibold text-white">{t.age.leave}</button></div></div></div>;
}

export function GeoLanguagePrompt() {
  const { locale, geoPromptOpen, acceptGeoLanguage, dismissGeoLanguage } = useCommerce();
  const t = translations[locale];
  const notice = locale === "fr"
    ? "Si vous acceptez, une estimation IP (pays, région, ville et coordonnées approximatives) est enregistrée sans conserver votre adresse IP. Vous pouvez refuser sans limiter votre navigation."
    : locale === "de"
      ? "Bei Zustimmung wird eine IP-basierte Schätzung (Land, Region, Stadt und ungefähre Koordinaten) ohne Speicherung Ihrer IP-Adresse erfasst. Sie können ohne Einschränkung ablehnen."
      : "If you accept, an IP-based estimate (country, region, city and approximate coordinates) is recorded without storing your IP address. You can refuse without limiting your browsing.";
  if (!geoPromptOpen) return null;
  return <div className="geo-language-prompt fixed bottom-5 left-5 z-[45] max-w-sm rounded-2xl border border-white/12 bg-[#111d26] p-5 shadow-2xl"><BrandMark compact /><h2 className="font-display text-2xl text-white">{t.geo.title}</h2><p className="mt-2 text-sm leading-5 text-slate-400">{t.geo.body}</p><p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-slate-500">{notice}</p><div className="mt-4 flex gap-2"><button onClick={acceptGeoLanguage} className="rounded-lg bg-[#d7b46a] px-3 py-2 text-xs font-bold text-[#0b1217]">{t.geo.accept}</button><button onClick={dismissGeoLanguage} className="rounded-lg border border-white/12 px-3 py-2 text-xs font-semibold text-white">{t.geo.refuse}</button></div></div>;
}

export function PickupMap() {
  const { locale } = useCommerce();
  const t = translations[locale];
  const [MapComponent, setMapComponent] = useState<null | typeof import("@/components/Map")>(null);
  const [error, setError] = useState("");
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const locate = () => { if (!navigator.geolocation || !map) return setError(t.ui.positionUnavailable); navigator.geolocation.getCurrentPosition((position) => { const point = { lat: position.coords.latitude, lng: position.coords.longitude }; map.setCenter(point); map.setZoom(11); new google.maps.marker.AdvancedMarkerElement({ map, position: point, title: t.ui.positionShared }); }, () => setError(t.ui.positionNotShared), { enableHighAccuracy: true, timeout: 8000 }); };
  const loadMap = async () => setMapComponent(await import("@/components/Map"));
  return <section id="conseiller" className="container py-16"><div className="grid overflow-hidden rounded-3xl border border-white/8 bg-[#101a22] lg:grid-cols-[.9fr_1.1fr]"><div className="p-8 lg:p-12"><p className="eyebrow">{t.home.mapEyebrow}</p><h2 className="font-display text-4xl text-white">{t.home.mapTitle}</h2><p className="mt-5 max-w-md leading-7 text-slate-400">{t.home.mapLead}</p><button onClick={MapComponent ? locate : loadMap} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#d7b46a] px-4 py-3 text-sm font-bold text-[#0b1217]"><MapPin className="h-4 w-4"/>{t.actions.locate}</button>{error && <p className="mt-3 text-xs text-[#dd8181]">{error}</p>}<p className="mt-9 border-t border-white/8 pt-5 text-xs leading-5 text-slate-500">{t.ui.mapPrivacy}</p></div><div className="min-h-80 bg-[#0a1117]">{MapComponent ? <MapComponent.MapView className="h-full min-h-80" initialCenter={{ lat: 48.8566, lng: 2.3522 }} initialZoom={5} onMapReady={(readyMap) => setMap(readyMap)} /> : <div className="grid h-full min-h-80 place-items-center bg-[radial-gradient(circle_at_60%_30%,rgba(215,180,106,.15),transparent_35%)] text-center"><div><MapPin className="mx-auto h-7 w-7 text-[#d7b46a]"/><p className="mt-3 text-sm text-slate-400">{t.ui.mapPending}</p></div></div>}</div></div></section>;
}

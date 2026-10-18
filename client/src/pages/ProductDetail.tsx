import { ReviewPanel } from "@/components/ReviewPanel";
import { useCommerce } from "@/contexts/CommerceContext";
import { formatMoney, StoreProduct, translations } from "@/lib/storefront";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { evaluateCoupon } from "@shared/commerce";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Expand, FolderPlus, Home, Minus, PackageCheck, Plus, Scale, ShieldCheck, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { toast } from "sonner";
import { ProductCard, ShareButton } from "@/components/storefront";

const detailCopy = {
  fr: { selected: "Image sélectionnée", trustOne: "Dossier encadré", trustTwo: "Informations vérifiables", trustThree: "Demande confidentielle", collectionEmpty: "Créez d’abord une collection dans vos favoris pour y organiser cette référence.", reviewsAnchor: "Lire les avis", unit: "unité", breadcrumb: "Fil d’Ariane", dossier: "Dossier de référence", reference: "Référence catalogue", availability: "Disponibilité contrôlée", galleryCounter: "Média" },
  en: { selected: "Selected image", trustOne: "Guided file review", trustTwo: "Verifiable information", trustThree: "Confidential request", collectionEmpty: "Create a collection in your wishlist first to organise this reference.", reviewsAnchor: "Read reviews", unit: "unit", breadcrumb: "Breadcrumb", dossier: "Reference file", reference: "Catalogue reference", availability: "Controlled availability", galleryCounter: "Media" },
  de: { selected: "Ausgewähltes Bild", trustOne: "Begleitete Prüfung", trustTwo: "Überprüfbare Angaben", trustThree: "Vertrauliche Anfrage", collectionEmpty: "Erstellen Sie zuerst eine Kollektion in Ihren Favoriten, um diese Referenz zu organisieren.", reviewsAnchor: "Bewertungen lesen", unit: "Einheit", breadcrumb: "Brotkrümelnavigation", dossier: "Referenzdossier", reference: "Katalogreferenz", availability: "Geprüfte Verfügbarkeit", galleryCounter: "Medium" },
} as const;

export default function ProductDetail() {
  const [, params] = useRoute("/produit/:slug");
  const { locale, addToCart, compareIds, couponCode, setCouponCode, toggleCompare } = useCommerce();
  const { isAuthenticated } = useAuth();
  const t = translations[locale];
  const copy = detailCopy[locale];
  const detail = trpc.catalogue.bySlug.useQuery({ slug: params?.slug ?? "" });
  const catalogue = trpc.catalogue.list.useQuery();
  const product = detail.data as StoreProduct | undefined;
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [couponInput, setCouponInput] = useState("");
  const [couponState, setCouponState] = useState<"idle" | "valid" | "invalid">("idle");
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const utils = trpc.useUtils();
  const collections = trpc.collections.list.useQuery(undefined, { enabled: isAuthenticated && collectionPickerOpen });
  const addCollectionItem = trpc.collections.addItem.useMutation({
    onSuccess: () => { toast.success(t.actions.saved); setCollectionPickerOpen(false); utils.collections.list.invalidate(); },
    onError: () => toast.error(t.wishlist.empty),
  });

  useEffect(() => {
    setImageIndex(0);
    setQuantity(1);
    setCouponInput(couponCode ?? "");
    setCouponState(couponCode ? "valid" : "idle");
  }, [product?.slug, couponCode]);

  if (detail.isLoading) return <main className="gmp-page container grid min-h-[70vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-2 border-[#d7b46a] border-t-transparent"/></main>;
  if (detail.isError) return <main className="gmp-page container py-20"><p className="eyebrow">GunsMasterPro</p><h1 className="font-display mt-2 text-4xl text-white">{locale === "fr" ? "Fiche temporairement indisponible" : locale === "de" ? "Referenz vorübergehend nicht verfügbar" : "Reference temporarily unavailable"}</h1><p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">{locale === "fr" ? "Les données de cette référence ne sont pas accessibles pour le moment. Réessayez dans quelques instants." : locale === "de" ? "Die Daten dieser Referenz sind derzeit nicht erreichbar. Bitte versuchen Sie es in Kürze erneut." : "Data for this reference is not available at the moment. Please try again shortly."}</p><button onClick={() => detail.refetch()} className="mt-6 rounded-xl bg-[#d7b46a] px-5 py-3 text-sm font-bold text-[#091116]">{locale === "fr" ? "Réessayer" : locale === "de" ? "Erneut versuchen" : "Try again"}</button></main>;
  if (!product) return <main className="gmp-page container py-20"><h1 className="font-display text-4xl text-white">{t.product.notFound}</h1><Link href="/catalogue" className="mt-5 inline-flex items-center gap-2 text-[#e4c67e]"><ArrowLeft className="h-4 w-4"/>{t.nav.catalogue}</Link></main>;

  const gallery = product.gallery.length ? product.gallery : [product.imageUrl];
  const activeImage = gallery[imageIndex] ?? gallery[0];
  const maxQuantity = Math.max(1, Math.min(product.stock, 10));
  const grossLineTotal = product.priceCents * quantity;
  const activeCoupon = evaluateCoupon(couponState === "valid" ? couponInput : null, grossLineTotal);
  const lineTotal = grossLineTotal + activeCoupon.priceAdjustmentCents;
  const isUsableSpecification = (value: unknown) => typeof value === "string" && value.trim().length > 0 && !/^(à confirmer|to be confirmed|non renseigné)/i.test(value.trim());
  const isInternalMediaOrSourceField = (key: string) => /media|média|source|provenance|licen[cs]e|rights|droit|taric/i.test(key);
  const specs = [[t.product.manufacturer, product.manufacturer ?? product.brand], [t.product.model, product.model ?? product.name], [t.catalogue.caliber, product.caliber], [t.catalogue.material, product.material], [t.product.capacity, product.capacity], [t.product.actionLabel, product.action], [t.product.barrel, product.barrelLength], [t.product.length, product.overallLength], [t.product.weight, product.weight], [t.product.subCategory, product.subCategory], ...Object.entries(product.specifications ?? {}).filter(([key]) => !isInternalMediaOrSourceField(key))].filter(([, value]) => isUsableSpecification(value));
  const similar = ((catalogue.data ?? []) as StoreProduct[]).filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3);
  const average = product.reviewCount ? (product.ratingCenti ?? 0) / 100 : null;
  const compared = compareIds.includes(product.id);
  const stockState = product.stock < 1 ? "out" : product.stock <= 3 ? "low" : "available";
  const stockLabel = stockState === "out" ? t.product.outOfStock : stockState === "low" ? t.product.lowStock : t.product.stock;
  const advanceImage = (direction: 1 | -1) => setImageIndex((current) => (current + direction + gallery.length) % gallery.length);
  const changeQuantity = (next: number) => setQuantity(Math.min(maxQuantity, Math.max(1, next)));
  const applyCoupon = () => {
    const coupon = evaluateCoupon(couponInput, grossLineTotal);
    setCouponState(coupon.valid ? "valid" : "invalid");
    setCouponCode(coupon.valid ? coupon.code : null);
  };
  const addSelection = () => {
    if (product.stock < 1) return;
    addToCart(product, quantity);
    toast.success(t.product.addedToCart);
  };
  const openCollectionPicker = () => {
    if (!isAuthenticated) return toast.info(t.ui.syncWishlist);
    setCollectionPickerOpen(true);
  };

  return <main className="gmp-page product-detail-page min-h-screen bg-[#071015]">
    <div className="container py-5 lg:py-7">
      <nav className="product-breadcrumbs" aria-label={copy.breadcrumb}>
        <Link href="/"><Home/><span>{t.nav.home}</span></Link><ChevronRight/>
        <Link href="/catalogue">{t.nav.catalogue}</Link><ChevronRight/>
        <Link href={`/catalogue?category=${product.category}`}>{t.category[product.category]}</Link><ChevronRight/>
        <span aria-current="page">{product.name}</span>
      </nav>
      <Link href="/catalogue" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-[#e4c67e]"><ArrowLeft className="h-3.5 w-3.5"/>{t.product.backToCatalogue}</Link>
      <div className="mt-5 grid items-start gap-7 xl:grid-cols-[minmax(0,1.2fr)_minmax(25rem,.8fr)]">
        <section className="min-w-0">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b151d]">
            <img src={activeImage} alt={`${product.name} · ${copy.selected}`} fetchPriority="high" loading="eager" decoding="async" width="1080" height="1000" className="aspect-[1.08] h-full w-full object-cover"/>
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(2,7,10,.48))]"/>
            <span className="product-gallery-counter">{copy.galleryCounter} {imageIndex + 1}/{gallery.length}</span>
            <button type="button" onClick={() => setLightboxOpen(true)} className="product-gallery-expand absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-[#071015]/75 text-white backdrop-blur hover:border-[#d7b46a]/70" aria-label={t.product.zoom}><Expand className="h-4 w-4"/></button>
            {gallery.length > 1 && <><button type="button" onClick={() => advanceImage(-1)} className="gallery-step left-4" aria-label={`${t.product.gallery} -`}><ChevronLeft className="h-5 w-5"/></button><button type="button" onClick={() => advanceImage(1)} className="gallery-step right-4" aria-label={`${t.product.gallery} +`}><ChevronRight className="h-5 w-5"/></button></>}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">{gallery.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setImageIndex(index)} className={`overflow-hidden rounded-xl border bg-[#0b151d] transition ${imageIndex === index ? "border-[#d7b46a] ring-2 ring-[#d7b46a]/25" : "border-white/10 hover:border-white/35"}`} aria-label={`${t.product.gallery} ${index + 1}`} aria-pressed={imageIndex === index}><img src={image} alt={`${product.name} — ${t.product.gallery} ${index + 1}`} loading="lazy" decoding="async" width="300" height="300" className="aspect-square h-full w-full object-cover"/></button>)}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="product-trust-card"><ShieldCheck/><span>{copy.trustOne}</span></div><div className="product-trust-card"><Check/><span>{copy.trustTwo}</span></div><div className="product-trust-card"><PackageCheck/><span>{copy.trustThree}</span></div></div>
          <div className="product-reference-dossier"><span>{copy.dossier}</span><div><p>{copy.reference}<strong>{product.slug}</strong></p><p>{copy.availability}<strong className={`product-stock-detail is-${stockState}`}>{product.stock > 0 ? `${product.stock} ${t.product.availabilityCount}` : t.product.outOfStock}</strong></p></div></div>
        </section>
        <aside className="gmp-card product-purchase-panel min-w-0 rounded-3xl border border-white/8 bg-[#0d1820] p-5 sm:p-7 xl:sticky xl:top-28">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="eyebrow">{t.category[product.category]} · {product.brand}</p><h1 className="product-detail-title font-display mt-2 text-white">{product.name}</h1></div><ShareButton product={product}/></div>
          {average !== null && <a href="#reviews" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d7b46a]/25 bg-[#d7b46a]/8 px-3 py-1.5 text-xs font-bold text-[#e7ca82]"><Star className="h-3.5 w-3.5 fill-current"/>{average.toFixed(1)} <span className="font-normal text-slate-400">· {product.reviewCount} {t.product.reviewLabel} · {copy.reviewsAnchor}</span></a>}
          <p className="product-detail-description mt-5 text-sm leading-6 text-slate-400">{product.description}</p>
          <div className="product-price-zone mt-6 rounded-2xl p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.13em] text-slate-500">{t.product.total}</p><strong className="font-display mt-1 block text-5xl leading-none text-[#ebd08b]">{formatMoney(lineTotal, locale)}</strong>{activeCoupon.valid && <span className="product-discount-line"><s>{formatMoney(grossLineTotal, locale)}</s> · −10 %</span>}<span className="mt-2 block text-xs text-slate-400">{formatMoney(product.priceCents, locale)} / {copy.unit}</span></div><span className={`product-stock-status product-stock-badge is-${stockState}`}><Check className="h-3.5 w-3.5"/>{stockLabel}</span></div></div>
          <div className="mt-5 flex items-center justify-between"><label className="text-sm font-bold text-slate-300">{t.product.quantity}</label><div className="product-quantity-control" role="group" aria-label={t.product.quantity}><button type="button" onClick={() => changeQuantity(quantity - 1)} disabled={quantity <= 1} aria-label={`${t.product.quantity} -`}><Minus className="h-4 w-4"/></button><output aria-live="polite">{quantity}</output><button type="button" onClick={() => changeQuantity(quantity + 1)} disabled={quantity >= maxQuantity} aria-label={`${t.product.quantity} +`}><Plus className="h-4 w-4"/></button></div></div>
          <div className="coupon-panel mt-5"><label htmlFor="coupon-code">{t.product.coupon}</label><div><input id="coupon-code" value={couponInput} onChange={(event) => { setCouponInput(event.target.value); setCouponState("idle"); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyCoupon(); } }} placeholder="GUNMASTER26" className="coupon-input"/><button type="button" onClick={applyCoupon}>{t.product.couponApply}</button></div>{couponState === "valid" && <p className="coupon-feedback is-valid"><Check/><span><strong>{t.product.couponValid}.</strong> {t.product.couponBenefit} {formatMoney(-activeCoupon.priceAdjustmentCents, locale)}.</span></p>}{couponState === "invalid" && <p className="coupon-feedback is-invalid">{t.product.couponInvalid}</p>}</div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" disabled={product.stock < 1} onClick={addSelection} className="rounded-xl bg-[#d7b46a] px-4 py-3.5 text-sm font-bold text-[#091116] transition hover:bg-[#e8cf88] disabled:cursor-not-allowed disabled:opacity-45"><Plus className="mr-2 inline h-4 w-4"/>{t.actions.order}</button><button type="button" onClick={openCollectionPicker} className="rounded-xl border border-white/14 px-4 py-3.5 text-sm font-bold text-slate-100 hover:border-[#d7b46a]/55"><FolderPlus className="mr-2 inline h-4 w-4"/>{t.product.saveToCollection}</button></div>
          <button type="button" onClick={() => { if (!toggleCompare(product.id)) toast.error(t.product.compareLimit); }} className={`product-compare-button mt-3 w-full rounded-xl border px-4 py-3 text-sm font-bold ${compared ? "is-compared border-[#d7b46a] bg-[#d7b46a]/10 text-[#e5c87f]" : "border-white/12 text-slate-200 hover:border-white/30"}`}><Scale className="mr-2 inline h-4 w-4"/>{t.actions.compare}</button>
          <div className="mt-5 flex items-start gap-3 border-t border-white/7 pt-5 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-.5 h-4 w-4 shrink-0 text-[#d7b46a]"/>{t.product.availabilityNotice}</div>
        </aside>
      </div>
    </div>
    <section className="container pb-10 lg:pb-14"><details open className="gmp-card product-specification-panel rounded-2xl border border-white/8 bg-[#0d1820]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6"><span><p className="eyebrow">{t.product.tech}</p><h2 className="font-display mt-1 text-4xl text-white">{t.product.spec}</h2></span><ChevronRight className="product-details-chevron h-5 w-5 text-[#d7b46a]"/></summary><div className="border-t border-white/8"><table className="w-full"><tbody>{specs.map(([label, value]) => <tr key={label} className="border-b border-white/7 last:border-0"><th className="w-[42%] bg-white/[.025] p-4 text-left text-sm font-semibold text-slate-400 sm:w-1/3">{label}</th><td className="p-4 text-sm text-white">{value || "—"}</td></tr>)}</tbody></table></div></details></section>
    <section id="reviews" className="container pb-10 lg:pb-14"><ReviewPanel productId={product.id} ratingCenti={product.ratingCenti} reviewCount={product.reviewCount} previewImageUrl={activeImage}/></section>
    {similar.length > 0 && <section className="container pb-16"><p className="eyebrow">GunsMasterPro</p><h2 className="font-display mb-7 text-4xl text-white">{t.product.similar}</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{similar.map((item) => <ProductCard key={item.id} product={item}/>)}</div></section>}
    {lightboxOpen && <div className="gallery-lightbox-layer fixed inset-0 z-[80] grid place-items-center bg-[#020609]/95 p-4" role="dialog" aria-modal="true" aria-label={t.product.gallery}><button type="button" onClick={() => setLightboxOpen(false)} className="gallery-lightbox-close absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white hover:border-[#d7b46a]" aria-label={t.actions.cancel}><X className="h-5 w-5"/></button><div className="relative max-h-[85vh] w-full max-w-6xl"><img src={activeImage} alt={`${product.name} · ${copy.selected}`} className="max-h-[82vh] w-full rounded-2xl object-contain"/>{gallery.length > 1 && <><button type="button" onClick={() => advanceImage(-1)} className="gallery-step left-2" aria-label={`${t.product.gallery} -`}><ChevronLeft/></button><button type="button" onClick={() => advanceImage(1)} className="gallery-step right-2" aria-label={`${t.product.gallery} +`}><ChevronRight/></button></>}</div></div>}
    {collectionPickerOpen && <div className="fixed inset-0 z-[75] grid place-items-center bg-[#020609]/75 p-4"><section role="dialog" aria-modal="true" className="gmp-card w-full max-w-lg rounded-2xl border border-white/10 bg-[#101a22] p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">GunsMasterPro</p><h2 className="font-display mt-1 text-3xl text-white">{t.product.saveToCollection}</h2></div><button type="button" onClick={() => setCollectionPickerOpen(false)} className="rounded-lg p-2 text-slate-300 hover:bg-white/8" aria-label={t.actions.cancel}><X className="h-5 w-5"/></button></div>{collections.isLoading ? <div className="mt-6 h-24 animate-pulse rounded-xl bg-white/5"/> : collections.data?.length ? <div className="mt-6 max-h-[50vh] space-y-2 overflow-y-auto">{collections.data.filter((collection) => !collection.isArchived).map((collection) => <button key={collection.id} type="button" disabled={addCollectionItem.isPending} onClick={() => addCollectionItem.mutate({ collectionId: collection.id, productId: product.id })} className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[.02] p-4 text-left hover:border-[#d7b46a]/55"><span><strong className="block text-sm text-white">{collection.isSystemSaved ? t.wishlist.saved : collection.name}</strong><small className="mt-1 block text-xs text-slate-500">{collection.items.length} {t.wishlist.itemCount}</small></span><Plus className="h-4 w-4 text-[#d7b46a]"/></button>)}</div> : <div className="mt-6 rounded-xl border border-dashed border-white/14 p-5 text-sm leading-6 text-slate-400"><p>{copy.collectionEmpty}</p><Link href="/favoris" onClick={() => setCollectionPickerOpen(false)} className="mt-4 inline-flex rounded-lg bg-[#d7b46a] px-4 py-2.5 text-xs font-bold text-[#091116]">{t.wishlist.create}</Link></div>}</section></div>}
  </main>;
}

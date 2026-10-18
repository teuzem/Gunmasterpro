import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { countryToLocale, Locale, StoreProduct } from "@/lib/storefront";
import { trpc } from "@/lib/trpc";

export type CartLine = { product: StoreProduct; quantity: number };
type CommerceState = {
  locale: Locale;
  countryCode?: string;
  setLocale: (locale: Locale) => void;
  geoPromptOpen: boolean;
  acceptGeoLanguage: () => Promise<void>;
  dismissGeoLanguage: () => void;
  cart: CartLine[];
  addToCart: (product: StoreProduct, quantity?: number) => void;
  changeQuantity: (id: number, quantity: number) => void;
  removeFromCart: (id: number) => void;
  couponCode: string | null;
  setCouponCode: (couponCode: string | null) => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  compareIds: number[];
  toggleCompare: (id: number) => boolean;
};

const CommerceContext = createContext<CommerceState | null>(null);
const read = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) ?? "") as T; } catch { return fallback; }
};
const getVisitorId = () => {
  const key = "gmp-visitor-id";
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  const value = crypto.randomUUID();
  localStorage.setItem(key, value);
  return value;
};

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");
  const [countryCode, setCountryCode] = useState<string | undefined>();
  const [geoPromptOpen, setGeoPromptOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const cartAddedNotification = trpc.notifications.cartAdded.useMutation();
  const settings = trpc.settings.public.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const locationConsent = trpc.location.consent.useMutation();

  useEffect(() => {
    const previewLocale = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("locale") : null;
    const suppressGeoPrompt = import.meta.env.DEV && new URLSearchParams(window.location.search).get("geo") === "off";
    const savedLocale = localStorage.getItem("gmp-locale") as Locale | null;
    setLocaleState(previewLocale === "fr" || previewLocale === "en" || previewLocale === "de" ? previewLocale : savedLocale ?? "fr");
    const previewCompare = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("compare") : null;
    const previewCheckout = import.meta.env.DEV && Boolean(new URLSearchParams(window.location.search).get("checkout"));
    setCart(read<CartLine[]>("gmp-cart", []));
    setCouponCode(localStorage.getItem("gmp-coupon") || null);
    setCompareIds(previewCompare ? previewCompare.split(",").map(Number).filter(Number.isInteger).slice(0, 3) : read<number[]>("gmp-compare", []));
    if (previewCheckout) setCartOpen(true);
    if (!suppressGeoPrompt && !localStorage.getItem("gmp-geo-choice")) setGeoPromptOpen(true);
  }, []);

  useEffect(() => { localStorage.setItem("gmp-locale", locale); document.documentElement.lang = locale; }, [locale]);
  useEffect(() => { localStorage.setItem("gmp-cart", JSON.stringify(cart)); }, [cart]);
  useEffect(() => { if (couponCode) localStorage.setItem("gmp-coupon", couponCode); else localStorage.removeItem("gmp-coupon"); }, [couponCode]);
  useEffect(() => { localStorage.setItem("gmp-compare", JSON.stringify(compareIds)); }, [compareIds]);

  const setLocale = (next: Locale) => { localStorage.setItem("gmp-geo-choice", "manual"); setLocaleState(next); };
  const acceptGeoLanguage = async () => {
    localStorage.setItem("gmp-geo-choice", "accepted");
    try {
      const result = await locationConsent.mutateAsync({ visitorId: getVisitorId(), consented: true, noticeVersion: settings.data?.locationNoticeVersion ?? "v1" });
      if (result.location?.countryCode) {
        setCountryCode(result.location.countryCode);
        setLocaleState(countryToLocale(result.location.countryCode));
      }
    } catch { /* Browser language remains the fallback. */ }
    setGeoPromptOpen(false);
  };
  const dismissGeoLanguage = () => {
    localStorage.setItem("gmp-geo-choice", "declined");
    void locationConsent.mutateAsync({ visitorId: getVisitorId(), consented: false, noticeVersion: settings.data?.locationNoticeVersion ?? "v1" }).catch(() => undefined);
    setLocaleState("fr");
    setGeoPromptOpen(false);
  };
  const addToCart = (product: StoreProduct, quantity = 1) => {
    const requested = Math.max(1, Math.min(quantity, product.stock, 10));
    setCart((current) => {
      const found = current.find((line) => line.product.id === product.id);
      if (found) return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(line.quantity + requested, product.stock, 10) } : line);
      return [...current, { product, quantity: requested }];
    });
    cartAddedNotification.mutate({ productId: product.id, quantity: requested, locale, countryCode, visitorId: getVisitorId() });
    setCartOpen(true);
  };
  const changeQuantity = (id: number, quantity: number) => setCart((current) => current.map((line) => line.product.id === id ? { ...line, quantity: Math.max(1, Math.min(quantity, line.product.stock, 10)) } : line));
  const removeFromCart = (id: number) => setCart((current) => current.filter((line) => line.product.id !== id));
  const toggleCompare = (id: number) => {
    if (compareIds.includes(id)) { setCompareIds((current) => current.filter((item) => item !== id)); return true; }
    if (compareIds.length >= 3) return false;
    setCompareIds((current) => [...current, id]);
    return true;
  };
  const value = useMemo(() => ({ locale, countryCode, setLocale, geoPromptOpen, acceptGeoLanguage, dismissGeoLanguage, cart, addToCart, changeQuantity, removeFromCart, couponCode, setCouponCode, cartOpen, setCartOpen, compareIds, toggleCompare }), [locale, countryCode, geoPromptOpen, cart, couponCode, cartOpen, compareIds]);
  return <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>;
}

export function useCommerce() {
  const context = useContext(CommerceContext);
  if (!context) throw new Error("useCommerce must be used inside CommerceProvider");
  return context;
}

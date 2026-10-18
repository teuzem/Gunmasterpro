import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Catalogue from "./pages/Catalogue";
import ProductDetail from "./pages/ProductDetail";
import Tracking from "./pages/Tracking";
import Wishlist from "./pages/Wishlist";
import ComparisonPage from "./pages/ComparisonPage";
import Advisor from "./pages/Advisor";
import CartPage from "./pages/Cart";
import InfoPage from "./pages/InfoPage";
import AdminConsole from "./pages/AdminConsole";
import { CommerceProvider } from "./contexts/CommerceContext";
import { AgeGate, CartDrawer, GeoLanguagePrompt, StoreHeader } from "./components/storefront";
import { ContactWidgets } from "./components/ContactWidgets";
import { EngagementPrompts } from "./components/EngagementPrompts";
import { SiteFooter } from "./components/SiteFooter";
import { SeoHead } from "./components/SeoHead";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/catalogue"} component={Catalogue} />
      <Route path={"/categorie/:category"} component={Catalogue} />
      <Route path={"/produit/:slug"} component={ProductDetail} />
      <Route path={"/suivi"} component={Tracking} />
      <Route path={"/favoris"} component={Wishlist} />
      <Route path={"/comparateur"} component={ComparisonPage} />
      <Route path={"/conseiller"} component={Advisor} />
      <Route path={"/panier"} component={CartPage} />
      <Route path={"/a-propos"}>{() => <InfoPage page="a-propos" />}</Route>
      <Route path={"/aide"}>{() => <InfoPage page="aide" />}</Route>
      <Route path={"/confidentialite"}>{() => <InfoPage page="confidentialite" />}</Route>
      <Route path={"/mentions-legales"}>{() => <InfoPage page="mentions-legales" />}</Route>
      <Route path={"/conditions"}>{() => <InfoPage page="conditions" />}</Route>
      <Route path={"/conformite"}>{() => <InfoPage page="conformite" />}</Route>
      <Route path={"/administration"} component={AdminConsole} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider><CommerceProvider><SeoHead /><Toaster /><StoreHeader /><Router /><SiteFooter /><CartDrawer /><ContactWidgets /><EngagementPrompts /><AgeGate /><GeoLanguagePrompt /></CommerceProvider></TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

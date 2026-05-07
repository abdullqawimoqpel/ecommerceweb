import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import ProductCatalog from "./pages/ProductCatalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import AdminDashboard from "./pages/AdminDashboard";
import SellerDashboard from "./pages/SellerDashboard";
import Recommendations from "./pages/Recommendations";
import LoyaltyPoints from "./pages/LoyaltyPoints";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/products"} component={ProductCatalog} />
      <Route path={"/products/:id"} component={ProductDetail} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/orders"} component={OrderTracking} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/seller"} component={SellerDashboard} />
      <Route path={"/recommendations"} component={Recommendations} />
      <Route path={"/loyalty"} component={LoyaltyPoints} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/wishlist"} component={Wishlist} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

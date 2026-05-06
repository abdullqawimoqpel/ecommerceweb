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
import AdminDashboard from "./pages/admin/AdminDashboard";
import SellerDashboard from "./pages/seller/SellerDashboard";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path={"/"} component={Home} />
      <Route path={"/products"} component={ProductCatalog} />
      <Route path={"/products/:id"} component={ProductDetail} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/wishlist"} component={Wishlist} />
      
      {/* Protected routes */}
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/orders"} component={OrderTracking} />
      <Route path={"/profile"} component={Profile} />
      
      {/* Admin routes */}
      <Route path={"/admin/*"} component={AdminDashboard} />
      
      {/* Seller routes */}
      <Route path={"/seller/*"} component={SellerDashboard} />
      
      {/* 404 */}
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
          <div className="min-h-screen bg-background text-foreground" dir="rtl">
            <Router />
          </div>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

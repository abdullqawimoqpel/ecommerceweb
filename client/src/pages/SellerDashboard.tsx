import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function SellerDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "sales">("overview");
  const [sellerData, setSellerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const sellerQuery = trpc.sellers.getProfile.useQuery();
  const productsQuery = trpc.sellers.getProducts.useQuery();

  useEffect(() => {
    if (sellerQuery.data && productsQuery.data) {
      setSellerData({
        dashboard: sellerQuery.data,
        products: productsQuery.data,
        sales: [],
      });
      setIsLoading(false);
    }
  }, [sellerQuery.data, productsQuery.data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold gradient-text">لوحة البائع</h1>
          <Link href="/" className="text-primary hover:text-primary/80">
            العودة للمتجر
          </Link>
        </div>
      </header>

      <div className="container py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          {["overview", "products", "sales"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "overview" ? "نظرة عامة" : tab === "products" ? "المنتجات" : "المبيعات"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">اسم المتجر</p>
              <p className="text-3xl font-bold">{sellerData?.dashboard?.storeName}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">عدد المنتجات</p>
              <p className="text-3xl font-bold">{sellerData?.products?.length || 0}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">البريد الإلكتروني</p>
              <p className="text-lg font-bold">{sellerData?.dashboard?.email}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">الهاتف</p>
              <p className="text-lg font-bold">{sellerData?.dashboard?.phone}</p>
            </Card>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">منتجاتي</h2>
              <Button asChild>
                <Link href="/seller/products/new">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة منتج
                </Link>
              </Button>
            </div>

            <div className="space-y-4">
              {sellerData?.products?.map((product: any) => (
                <Card key={product.id} className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{product.nameAr || product.name}</h3>
                    <p className="text-sm text-muted-foreground">المخزون: {product.stock}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{parseFloat(product.price).toFixed(2)} ر.س</p>
                    <p className="text-sm text-muted-foreground">{product.sales} مبيعات</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === "sales" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">المبيعات</h2>

            <div className="space-y-4">
              {sellerData?.sales?.map((sale: any) => (
                <Card key={sale.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">طلب #{sale.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.date).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{parseFloat(sale.amount).toFixed(2)} ر.س</p>
                      <p className="text-sm text-green-600">{sale.quantity} منتج</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

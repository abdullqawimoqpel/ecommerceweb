import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Edit, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders">("overview");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const analyticsQuery = trpc.admin.getAnalytics.useQuery();

  useEffect(() => {
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const totalRevenue = typeof analyticsQuery.data?.totalRevenue === 'string' 
    ? parseFloat(analyticsQuery.data.totalRevenue) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold gradient-text">لوحة التحكم الإدارية</h1>
          <Link href="/" className="text-primary hover:text-primary/80">
            العودة للمتجر
          </Link>
        </div>
      </header>

      <div className="container py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-border">
          {["overview", "products", "orders"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "overview" ? "نظرة عامة" : tab === "products" ? "المنتجات" : "الطلبات"}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">إجمالي المبيعات</p>
              <p className="text-3xl font-bold">{totalRevenue.toFixed(2)} ر.س</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">عدد الطلبات</p>
              <p className="text-3xl font-bold">{analyticsQuery.data?.totalOrders || 0}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">عدد المنتجات</p>
              <p className="text-3xl font-bold">{analyticsQuery.data?.totalProducts || 0}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">عدد المستخدمين</p>
              <p className="text-3xl font-bold">{analyticsQuery.data?.totalUsers || 0}</p>
            </Card>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">إدارة المنتجات</h2>
              <Button asChild>
                <Link href="/admin/products/new">
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة منتج
                </Link>
              </Button>
            </div>
            <Card className="p-6">
              <p className="text-muted-foreground">لا توجد منتجات حالياً</p>
            </Card>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">إدارة الطلبات</h2>
            <Card className="p-6">
              <p className="text-muted-foreground">لا توجد طلبات حالياً</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

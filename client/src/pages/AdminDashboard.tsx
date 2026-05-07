import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Plus, Edit, Trash2, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "orders">("overview");
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const productsQuery = trpc.admin.getProducts.useQuery();
  const ordersQuery = trpc.admin.getOrders.useQuery();
  const analyticsQuery = trpc.admin.getAnalytics.useQuery();
  const deleteProductMutation = trpc.admin.deleteProduct.useMutation();

  useEffect(() => {
    if (productsQuery.data && ordersQuery.data) {
      setProducts(productsQuery.data);
      setOrders(ordersQuery.data);
      setIsLoading(false);
    }
  }, [productsQuery.data, ordersQuery.data]);

  const handleDeleteProduct = (productId: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      deleteProductMutation.mutate({ productId });
    }
  };

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
              <p className="text-3xl font-bold">{analyticsQuery.data?.totalSales.toFixed(2)} ر.س</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">عدد الطلبات</p>
              <p className="text-3xl font-bold">{analyticsQuery.data?.totalOrders}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">عدد المنتجات</p>
              <p className="text-3xl font-bold">{analyticsQuery.data?.totalProducts}</p>
            </Card>
            <Card className="p-6">
              <p className="text-sm text-muted-foreground mb-2">عدد المستخدمين</p>
              <p className="text-3xl font-bold">{analyticsQuery.data?.totalUsers}</p>
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

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-right">اسم المنتج</th>
                    <th className="px-4 py-3 text-right">السعر</th>
                    <th className="px-4 py-3 text-right">المخزون</th>
                    <th className="px-4 py-3 text-right">الفئة</th>
                    <th className="px-4 py-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-border hover:bg-muted">
                      <td className="px-4 py-3">{product.nameAr || product.name}</td>
                      <td className="px-4 py-3">{parseFloat(product.price).toFixed(2)} ر.س</td>
                      <td className="px-4 py-3">{product.stock}</td>
                      <td className="px-4 py-3">{product.categoryName}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/admin/products/${product.id}/edit`}>
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">إدارة الطلبات</h2>

            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold">طلب #{order.orderNumber}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        {parseFloat(order.total).toFixed(2)} ر.س
                      </p>
                      <p className="text-sm text-muted-foreground">{order.status}</p>
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

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Package, Truck, CheckCircle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function OrderTracking() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const ordersQuery = trpc.orders.list.useQuery({});

  useEffect(() => {
    if (ordersQuery.data) {
      setOrders(ordersQuery.data);
      setIsLoading(false);
    }
  }, [ordersQuery.data]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "processing":
        return <Package className="w-5 h-5 text-blue-500" />;
      case "shipped":
        return <Truck className="w-5 h-5 text-purple-500" />;
      case "delivered":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "قيد الانتظار",
      processing: "قيد المعالجة",
      shipped: "تم الشحن",
      delivered: "تم التسليم",
    };
    return labels[status] || status;
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
          <Link href="/">
            <h1 className="text-2xl font-bold gradient-text cursor-pointer">متجر السعودية</h1>
          </Link>
          <Link href="/products" className="text-primary hover:text-primary/80">
            تصفح المنتجات
          </Link>
        </div>
      </header>

      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">تتبع الطلبات</h1>

        {orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">لا توجد طلبات</p>
            <Button asChild>
              <Link href="/products">ابدأ التسوق</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">طلب #{order.orderNumber}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("ar-SA")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <span className="font-semibold">{getStatusLabel(order.status)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">الإجمالي</p>
                    <p className="font-bold">{parseFloat(order.total).toFixed(2)} ر.س</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">عدد المنتجات</p>
                    <p className="font-bold">{order.itemCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                    <p className="font-bold">
                      {order.paymentMethod === "mada" ? "مدى" : order.paymentMethod === "credit" ? "ائتمان" : "STC Pay"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الحالة</p>
                    <p className="font-bold">{getStatusLabel(order.status)}</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" asChild>
                    <Link href={`/orders/${order.id}`}>عرض التفاصيل</Link>
                  </Button>
                  {order.status === "delivered" && (
                    <Button variant="outline">اترك تقييماً</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

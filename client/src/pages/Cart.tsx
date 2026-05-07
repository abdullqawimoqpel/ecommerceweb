import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShoppingCart, Trash2, Plus, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function Cart() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const cartQuery = trpc.cart.getItems.useQuery();
  const removeFromCartMutation = trpc.cart.removeItem.useMutation();
  const updateCartMutation = trpc.cart.updateItem.useMutation();

  useEffect(() => {
    if (cartQuery.data) {
      setCartItems(cartQuery.data);
      const cartTotal = cartQuery.data.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
      setTotal(cartTotal);
      setIsLoading(false);
    }
  }, [cartQuery.data]);

  const handleRemove = (itemId: number) => {
    removeFromCartMutation.mutate({ cartItemId: itemId });
  };

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity > 0) {
      updateCartMutation.mutate({ cartItemId: itemId, quantity: newQuantity });
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <h1 className="text-2xl font-bold gradient-text cursor-pointer">متجر السعودية</h1>
          </Link>
          <Link href="/products">
            <ShoppingCart className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
          </Link>
        </div>
      </header>

      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">سلة التسوق</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">السلة فارغة</p>
            <Button asChild>
              <Link href="/products">تصفح المنتجات</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id} className="p-4 flex gap-4">
                    <div className="w-24 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                      {item.thumbnail && (
                        <img src={item.thumbnail} alt={item.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">{item.nameAr || item.name}</h3>
                      <p className="text-lg font-bold text-primary mb-3">
                        {parseFloat(item.price).toFixed(2)} ر.س
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="px-3">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="p-1 hover:bg-muted rounded"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="ml-auto p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div>
              <Card className="p-6 sticky top-20">
                <h3 className="text-lg font-bold mb-4">ملخص الطلب</h3>
                <div className="space-y-3 mb-6 pb-6 border-b border-border">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المجموع الفرعي</span>
                    <span>{total.toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الشحن</span>
                    <span>30 ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الضريبة</span>
                    <span>{(total * 0.15).toFixed(2)} ر.س</span>
                  </div>
                </div>
                <div className="flex justify-between mb-6 text-lg font-bold">
                  <span>الإجمالي</span>
                  <span className="text-primary">{(total + 30 + (total * 0.15)).toFixed(2)} ر.س</span>
                </div>
                <Button className="w-full" asChild>
                  <Link href="/checkout">متابعة الدفع</Link>
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

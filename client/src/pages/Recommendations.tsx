import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShoppingCart, Heart, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function Recommendations() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const recommendationsQuery = trpc.recommendations.getPersonalized.useQuery({ limit: 10 });
  const addToCartMutation = trpc.cart.addItem.useMutation();

  useEffect(() => {
    if (recommendationsQuery.data) {
      setRecommendations(recommendationsQuery.data);
      setIsLoading(false);
    }
  }, [recommendationsQuery.data]);

  const handleAddToCart = (productId: number) => {
    addToCartMutation.mutate({ productId, quantity: 1 });
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
        <h1 className="text-3xl font-bold mb-2">التوصيات المخصصة لك</h1>
        <p className="text-muted-foreground mb-8">بناءً على سجل التصفح والشراء الخاص بك</p>

        {recommendations.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-4">لا توجد توصيات حالياً</p>
            <Button asChild>
              <Link href="/products">تصفح المنتجات</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {recommendations.map((product) => (
              <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-muted overflow-hidden">
                  {product.thumbnail && (
                    <img
                      src={product.thumbnail}
                      alt={product.nameAr}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-2 line-clamp-2">{product.nameAr || product.name}</h3>
                  
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < Math.round(product.rating || 0)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground">({product.reviewCount || 0})</span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-lg font-bold text-primary">
                      {parseFloat(product.price).toFixed(2)} ر.س
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {parseFloat(product.originalPrice).toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAddToCart(product.id)}
                    >
                      <ShoppingCart className="w-4 h-4 ml-1" />
                      أضف
                    </Button>
                    <Button size="sm" variant="outline">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>

                  <Link href={`/products/${product.id}`} className="block mt-3">
                    <Button variant="ghost" size="sm" className="w-full">
                      عرض التفاصيل
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShoppingCart, Heart, Star, ChevronLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link, useParams } from "wouter";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const productQuery = trpc.products.getById.useQuery({ id: parseInt(id || "0") });
  const addToCartMutation = trpc.cart.addItem.useMutation();

  useEffect(() => {
    if (productQuery.data) {
      setProduct(productQuery.data);
      setIsLoading(false);
    }
  }, [productQuery.data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container py-16">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">المنتج غير موجود</p>
          <Button asChild>
            <Link href="/products">العودة للمنتجات</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCartMutation.mutate({
      productId: product.id,
      quantity,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <h1 className="text-2xl font-bold gradient-text cursor-pointer">متجر السعودية</h1>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/cart">
              <ShoppingCart className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
            </Link>
            <Link href="/wishlist">
              <Heart className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <Link href="/products" className="flex items-center gap-2 text-primary hover:text-primary/80 mb-8">
          <ChevronLeft className="w-5 h-5" />
          العودة للمنتجات
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-muted rounded-lg overflow-hidden aspect-square flex items-center justify-center">
            {product.thumbnail && (
              <img
                src={product.thumbnail}
                alt={product.nameAr}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold mb-4">{product.nameAr || product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-6">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(product.rating || 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {product.rating || 0} ({product.reviewCount || 0} تقييم)
              </span>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-primary">
                  {parseFloat(product.price).toFixed(2)} ر.س
                </span>
                {product.originalPrice && (
                  <span className="text-xl text-muted-foreground line-through">
                    {parseFloat(product.originalPrice).toFixed(2)} ر.س
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {product.description}
            </p>

            {/* Seller Info */}
            <Card className="p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">البائع</p>
              <p className="font-semibold">{product.sellerName || "متجر السعودية"}</p>
            </Card>

            {/* Stock Status */}
            <div className="mb-6">
              {product.stock > 0 ? (
                <span className="text-green-600 font-semibold">متوفر في المخزون</span>
              ) : (
                <span className="text-red-600 font-semibold">غير متوفر</span>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-muted"
                >
                  -
                </button>
                <span className="px-6 py-2 border-l border-r border-border">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 hover:bg-muted"
                >
                  +
                </button>
              </div>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={product.stock === 0 || addToCartMutation.isPending}
              >
                <ShoppingCart className="w-5 h-5 ml-2" />
                أضف للسلة
              </Button>
              <Button size="lg" variant="outline">
                <Heart className="w-5 h-5" />
              </Button>
            </div>

            {/* Additional Info */}
            <Card className="p-4 bg-muted">
              <h3 className="font-bold mb-3">معلومات المنتج</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">SKU:</span>
                  <span>{product.sku}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">الفئة:</span>
                  <span>{product.categoryName}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">المخزون:</span>
                  <span>{product.stock}</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

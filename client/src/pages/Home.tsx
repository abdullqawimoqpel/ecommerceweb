import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, ShoppingCart, Heart, Star } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState, useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const categoriesQuery = trpc.categories.list.useQuery();
  const featuredQuery = trpc.products.getFeatured.useQuery({ limit: 8 });

  useEffect(() => {
    if (categoriesQuery.data) {
      setCategories(categoriesQuery.data);
    }
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (featuredQuery.data) {
      setFeaturedProducts(featuredQuery.data);
    }
  }, [featuredQuery.data]);

  useEffect(() => {
    if (!categoriesQuery.isLoading && !featuredQuery.isLoading) {
      setIsLoadingData(false);
    }
  }, [categoriesQuery.isLoading, featuredQuery.isLoading]);

  if (loading) {
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
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold gradient-text">متجر السعودية</h1>
            <nav className="hidden md:flex gap-6">
              <Link href="/products" className="text-sm font-medium hover:text-primary">
                المنتجات
              </Link>
              <Link href="/about" className="text-sm font-medium hover:text-primary">
                عن المتجر
              </Link>
              <Link href="/contact" className="text-sm font-medium hover:text-primary">
                تواصل معنا
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link href="/cart" className="relative">
                  <ShoppingCart className="w-6 h-6 hover:text-primary transition-colors" />
                </Link>
                <Link href="/wishlist">
                  <Heart className="w-6 h-6 hover:text-primary transition-colors" />
                </Link>
                <Link href="/profile">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {user?.name?.charAt(0) || "U"}
                  </div>
                </Link>
              </>
            ) : (
              <Button asChild size="sm">
                <a href={getLoginUrl()}>دخول</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary/10 to-accent/10 py-16 md:py-24">
        <div className="container">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              اكتشف أفضل المنتجات
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              تسوق من أفضل العلامات التجارية مع ضمان الجودة والسعر الأفضل
            </p>
            <Button size="lg" asChild>
              <Link href="/products">تصفح المنتجات</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container">
          <h3 className="text-3xl font-bold mb-8">الفئات</h3>
          {isLoadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.slice(0, 8).map((category) => (
                <Link key={category.id} href={`/products?category=${category.id}`}>
                  <Card className="p-6 text-center hover-lift cursor-pointer">
                    {category.icon && (
                      <div className="text-4xl mb-4">{category.icon}</div>
                    )}
                    <h4 className="font-semibold">{category.nameAr || category.name}</h4>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-card">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold">المنتجات المميزة</h3>
            <Button variant="outline" asChild>
              <Link href="/products">عرض الكل</Link>
            </Button>
          </div>

          {isLoadingData ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <div className="grid-cols-responsive">
              {featuredProducts.map((product) => (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="overflow-hidden hover-lift cursor-pointer">
                    <div className="aspect-square bg-muted relative overflow-hidden">
                      {product.thumbnail && (
                        <img
                          src={product.thumbnail}
                          alt={product.nameAr}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                        />
                      )}
                      {product.isFeatured && (
                        <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-semibold">
                          مميز
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h4 className="font-semibold truncate-2 mb-2">
                        {product.nameAr || product.name}
                      </h4>
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-muted-foreground">
                          {product.rating || 0} ({product.reviewCount || 0})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-primary">
                            {parseFloat(product.price).toFixed(2)} ر.س
                          </p>
                          {product.originalPrice && (
                            <p className="text-sm text-muted-foreground line-through">
                              {parseFloat(product.originalPrice).toFixed(2)} ر.س
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="py-16">
        <div className="container">
          <Card className="bg-gradient-premium text-white p-12 text-center">
            <h3 className="text-3xl font-bold mb-4">عرض خاص محدود</h3>
            <p className="text-lg mb-6 opacity-90">
              احصل على خصم 30% على جميع المنتجات المختارة
            </p>
            <Button size="lg" variant="secondary">
              تسوق الآن
            </Button>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12 mt-16">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold mb-4">عن المتجر</h4>
              <p className="text-sm text-muted-foreground">
                متجر إلكتروني رائد في المملكة العربية السعودية
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">الفئات</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">الإلكترونيات</a></li>
                <li><a href="#" className="hover:text-primary">الملابس</a></li>
                <li><a href="#" className="hover:text-primary">المنزل</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">الدعم</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary">تواصل معنا</a></li>
                <li><a href="#" className="hover:text-primary">الشروط والأحكام</a></li>
                <li><a href="#" className="hover:text-primary">سياسة الخصوصية</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">تابعنا</h4>
              <div className="flex gap-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  تويتر
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  فيسبوك
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  إنستجرام
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 متجر السعودية. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

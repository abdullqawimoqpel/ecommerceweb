import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ShoppingCart, Heart, Star, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useSearchParams } from "wouter";
import FilterPanel, { FilterState } from "@/components/FilterPanel";

export default function ProductCatalog() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const categoryParam = searchParams.get ? searchParams.get('category') : null;
  const [filters, setFilters] = useState({
    categoryId: categoryParam ? parseInt(categoryParam) : undefined,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    search: "",
  });
  const [isLoading, setIsLoading] = useState(true);

  const productsQuery = trpc.products.advancedSearch.useQuery({
    query: filters.search,
    categoryId: filters.categoryId,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    limit: 20,
    offset: 0,
  });

  const categoriesQuery = trpc.categories.list.useQuery();

  useEffect(() => {
    if (productsQuery.data) {
      setProducts(productsQuery.data);
    }
  }, [productsQuery.data]);

  useEffect(() => {
    if (categoriesQuery.data) {
      setCategories(categoriesQuery.data);
    }
  }, [categoriesQuery.data]);

  useEffect(() => {
    if (!productsQuery.isLoading && !categoriesQuery.isLoading) {
      setIsLoading(false);
    }
  }, [productsQuery.isLoading, categoriesQuery.isLoading]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, search: e.target.value });
  };

  const handleCategoryChange = (categoryId: number | undefined) => {
    setFilters({ ...filters, categoryId });
  };

  const handlePriceChange = (min?: number, max?: number) => {
    setFilters({ ...filters, minPrice: min, maxPrice: max });
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
            <Link href="/cart" className="relative">
              <ShoppingCart className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
            </Link>
            <Link href="/wishlist">
              <Heart className="w-6 h-6 hover:text-primary transition-colors cursor-pointer" />
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">المنتجات</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <FilterPanel
              onFilterChange={(newFilters: FilterState) => {
                setFilters(prev => ({
                  ...prev,
                  categoryId: newFilters.categoryId,
                  minPrice: newFilters.minPrice,
                  maxPrice: newFilters.maxPrice,
                }))
              }}
              onClearFilters={() => setFilters({ categoryId: undefined, minPrice: undefined, maxPrice: undefined, search: "" })}
            />
          </div>

          {/* Products Grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground mb-4">لم يتم العثور على منتجات</p>
                <Button asChild>
                  <Link href="/products">تصفح جميع المنتجات</Link>
                </Button>
              </div>
            ) : (
              <div className="grid-cols-responsive">
                {products.map((product) => (
                  <Link key={product.id} href={`/products/${product.id}`}>
                    <Card className="overflow-hidden hover-lift cursor-pointer h-full flex flex-col">
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
                      <div className="p-4 flex-1 flex flex-col">
                        <h4 className="font-semibold truncate-2 mb-2 flex-1">
                          {product.nameAr || product.name}
                        </h4>
                        <div className="flex items-center gap-1 mb-3">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-muted-foreground">
                            {product.rating || 0} ({product.reviewCount || 0})
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-auto">
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
        </div>
      </div>
    </div>
  );
}

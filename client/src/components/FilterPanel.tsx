import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Filter } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface FilterPanelProps {
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export interface FilterState {
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "newest" | "cheapest" | "expensive" | "rating";
  search?: string;
}

export default function FilterPanel({ onFilterChange, onClearFilters }: FilterPanelProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedRating, setSelectedRating] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<"newest" | "cheapest" | "expensive" | "rating" | undefined>();

  const categoriesQuery = trpc.products.getCategories.useQuery();
  const priceRangeQuery = trpc.products.getPriceRange.useQuery();

  useEffect(() => {
    if (priceRangeQuery.data) {
      setPriceRange([priceRangeQuery.data.min, priceRangeQuery.data.max]);
    }
  }, [priceRangeQuery.data]);

  const handleCategoryChange = (categoryId: number) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter((id) => id !== categoryId)
      : [...selectedCategories, categoryId];
    setSelectedCategories(newCategories);

    const newFilters = {
      ...filters,
      categoryId: newCategories.length > 0 ? newCategories[0] : undefined,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handlePriceChange = (value: number[]) => {
    setPriceRange(value);
    const newFilters = {
      ...filters,
      minPrice: value[0],
      maxPrice: value[1],
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleRatingChange = (rating: number) => {
    const newRating = selectedRating === rating ? undefined : rating;
    setSelectedRating(newRating);
    const newFilters = {
      ...filters,
      minRating: newRating,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortChange = (sort: "newest" | "cheapest" | "expensive" | "rating") => {
    const newSort = sortBy === sort ? undefined : sort;
    setSortBy(newSort);
    const newFilters = {
      ...filters,
      sortBy: newSort,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleClear = () => {
    setFilters({});
    setSelectedCategories([]);
    setSelectedRating(undefined);
    setSortBy(undefined);
    setPriceRange([0, 10000]);
    onClearFilters();
  };

  return (
    <div className="w-full md:w-64 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          <h3 className="text-lg font-bold">التصفية والبحث</h3>
        </div>
        {Object.keys(filters).length > 0 && (
          <button
            onClick={handleClear}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            مسح
          </button>
        )}
      </div>

      {/* Categories */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">الفئات</h4>
        <div className="space-y-2">
          {categoriesQuery.data?.map((category: any) => (
            <label key={category.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedCategories.includes(category.id)}
                onCheckedChange={() => handleCategoryChange(category.id)}
              />
              <span className="text-sm">{category.nameAr || category.name}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Price Range */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">نطاق السعر</h4>
        <div className="space-y-3">
          <Slider
            value={priceRange}
            onValueChange={handlePriceChange}
            min={0}
            max={10000}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{priceRange[0].toFixed(0)} ر.س</span>
            <span>{priceRange[1].toFixed(0)} ر.س</span>
          </div>
        </div>
      </Card>

      {/* Rating */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">التقييم</h4>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((rating) => (
            <label key={rating} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedRating === rating}
                onCheckedChange={() => handleRatingChange(rating)}
              />
              <span className="text-sm">
                {"⭐".repeat(rating)} {rating} نجوم فما فوق
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Sorting */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">الترتيب</h4>
        <div className="space-y-2">
          {[
            { value: "newest", label: "الأحدث" },
            { value: "cheapest", label: "الأرخص" },
            { value: "expensive", label: "الأغلى" },
            { value: "rating", label: "الأفضل تقييماً" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value as any)}
              className={`w-full text-right px-3 py-2 rounded-md text-sm transition-colors ${
                sortBy === option.value
                  ? "bg-primary text-white"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Clear Button */}
      {Object.keys(filters).length > 0 && (
        <Button onClick={handleClear} variant="outline" className="w-full">
          مسح جميع المرشحات
        </Button>
      )}
    </div>
  );
}

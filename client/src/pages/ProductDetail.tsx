import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function ProductDetail() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">تفاصيل المنتج</h1>
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">جاري تحميل المنتج...</p>
        <Button asChild>
          <Link href="/products">العودة للمنتجات</Link>
        </Button>
      </div>
    </div>
  );
}

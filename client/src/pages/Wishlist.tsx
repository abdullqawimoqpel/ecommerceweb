import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Wishlist() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">قائمة الرغبات</h1>
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">قائمة الرغبات فارغة</p>
        <Button asChild>
          <Link href="/products">تصفح المنتجات</Link>
        </Button>
      </div>
    </div>
  );
}

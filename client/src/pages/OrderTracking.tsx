import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function OrderTracking() {
  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">تتبع الطلبات</h1>
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">لا توجد طلبات</p>
        <Button asChild>
          <Link href="/products">ابدأ التسوق</Link>
        </Button>
      </div>
    </div>
  );
}

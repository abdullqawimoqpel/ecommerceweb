import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Gift, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function LoyaltyPoints() {
  const [loyaltyData, setLoyaltyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const balanceQuery = trpc.loyalty.getBalance.useQuery();
  const historyQuery = trpc.loyalty.getHistory.useQuery({ limit: 50 });
  const rewardsQuery = { data: [] };

  useEffect(() => {
    if (balanceQuery.data && historyQuery.data && rewardsQuery.data) {
      setLoyaltyData({
        balance: balanceQuery.data,
        history: historyQuery.data,
        rewards: rewardsQuery.data,
      });
      setIsLoading(false);
    }
  }, [balanceQuery.data, historyQuery.data, rewardsQuery.data]);

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
        <h1 className="text-3xl font-bold mb-8">برنامج نقاط الولاء</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Balance Card */}
          <Card className="p-6 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <p className="text-sm opacity-90 mb-2">رصيدك الحالي</p>
            <p className="text-4xl font-bold mb-4">{loyaltyData?.balance || 0}</p>
            <p className="text-sm">نقطة ولاء</p>
          </Card>

          {/* Lifetime Points */}
          <Card className="p-6">
            <TrendingUp className="w-8 h-8 text-primary mb-3" />
            <p className="text-sm text-muted-foreground mb-2">إجمالي النقاط المكتسبة</p>
            <p className="text-3xl font-bold">{loyaltyData?.history?.reduce((sum: number, h: any) => sum + h.points, 0) || 0}</p>
          </Card>

          {/* Redemptions */}
          <Card className="p-6">
            <Gift className="w-8 h-8 text-primary mb-3" />
            <p className="text-sm text-muted-foreground mb-2">النقاط المستخدمة</p>
            <p className="text-3xl font-bold">
              {loyaltyData?.history?.filter((h: any) => h.type === "redemption").reduce((sum: number, h: any) => sum + h.points, 0) || 0}
            </p>
          </Card>
        </div>

        {/* How to Earn */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">كيفية كسب النقاط</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">عند الشراء</p>
              <p className="text-sm text-muted-foreground">اكسب 1 نقطة لكل ريال تنفقه</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">المراجعات</p>
              <p className="text-sm text-muted-foreground">اكسب 10 نقاط عند ترك تقييم</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold mb-2">الإحالات</p>
              <p className="text-sm text-muted-foreground">اكسب 50 نقطة عند إحالة صديق</p>
            </div>
          </div>
        </Card>

        {/* Rewards */}
        <Card className="p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">المكافآت المتاحة</h2>
          <div className="space-y-3">
            {loyaltyData?.rewards?.map((reward: any) => (
              <div key={reward.id} className="p-4 border border-border rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold">{reward.name}</p>
                  <p className="text-sm text-muted-foreground">{reward.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{reward.pointsRequired} نقطة</p>
                  <Button size="sm" variant="outline" disabled={loyaltyData?.balance < reward.pointsRequired}>
                    استبدل
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* History */}
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">سجل النقاط</h2>
          <div className="space-y-3">
            {loyaltyData?.history?.map((entry: any) => (
              <div key={entry.id} className="p-4 border border-border rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold">{entry.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <p className={`font-bold ${entry.type === "earn" ? "text-green-600" : "text-red-600"}`}>
                  {entry.type === "earn" ? "+" : "-"}{entry.points}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

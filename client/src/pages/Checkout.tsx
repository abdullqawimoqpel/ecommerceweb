import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CreditCard, Smartphone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

export default function Checkout() {
  const [step, setStep] = useState<"address" | "payment" | "review">("address");
  const [paymentMethod, setPaymentMethod] = useState<"mada" | "credit" | "stc">("mada");
  const [isProcessing, setIsProcessing] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
  });

  const [usePoints, setUsePoints] = useState(false);

  const cartQuery = trpc.cart.getItems.useQuery();
  const createOrderMutation = trpc.orders.create.useMutation();
  const loyaltyQuery = trpc.loyalty.getBalance.useQuery();

  const cartTotal = cartQuery.data?.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 0)), 0) || 0;
  const shippingCost = 30;
  const tax = (cartTotal || 0) * 0.15;
  const loyaltyPoints = typeof loyaltyQuery.data === 'object' && loyaltyQuery.data !== null && 'points' in loyaltyQuery.data ? (loyaltyQuery.data as any).points : 0;
  const loyaltyDiscount = usePoints ? (loyaltyPoints || 0) * 0.1 : 0;
  const finalTotal = (cartTotal || 0) + shippingCost + (tax || 0) - (loyaltyDiscount || 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCreateOrder = async () => {
    if (!formData.fullName || !formData.phone || !formData.address || !formData.city) {
      alert("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setIsProcessing(true);
    try {
      await createOrderMutation.mutateAsync({
        shippingAddressId: 1,
        billingAddressId: 1,
        paymentMethod: paymentMethod as any,
        loyaltyPointsToRedeem: usePoints ? loyaltyPoints : 0,
      });
      alert("تم إنشاء الطلب بنجاح!");
      window.location.href = `/orders`;
    } catch (error) {
      alert("حدث خطأ في إنشاء الطلب");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <h1 className="text-2xl font-bold gradient-text cursor-pointer">متجر السعودية</h1>
          </Link>
          <Link href="/cart" className="text-primary hover:text-primary/80">
            العودة للسلة
          </Link>
        </div>
      </header>

      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-8">إتمام الشراء</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex gap-4 mb-8">
              {["address", "payment", "review"].map((s, idx) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      step === s
                        ? "bg-primary text-primary-foreground"
                        : idx < ["address", "payment", "review"].indexOf(step)
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  {idx < 2 && <div className="w-8 h-1 bg-muted" />}
                </div>
              ))}
            </div>

            {step === "address" && (
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-bold mb-4">عنوان التوصيل</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    name="fullName"
                    placeholder="الاسم الكامل"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="رقم الهاتف"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                  />
                  <input
                    type="email"
                    name="email"
                    placeholder="البريد الإلكتروني"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                  />
                  <textarea
                    name="address"
                    placeholder="العنوان"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-border rounded-lg"
                    rows={3}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="city"
                      placeholder="المدينة"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-border rounded-lg"
                    />
                    <input
                      type="text"
                      name="postalCode"
                      placeholder="الرمز البريدي"
                      value={formData.postalCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-border rounded-lg"
                    />
                  </div>
                  <Button className="w-full" onClick={() => setStep("payment")}>
                    التالي: طريقة الدفع
                  </Button>
                </div>
              </Card>
            )}

            {step === "payment" && (
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-bold mb-4">طريقة الدفع</h3>
                <div className="space-y-4 mb-6">
                  <label className="flex items-center p-4 border border-border rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="payment"
                      value="mada"
                      checked={paymentMethod === "mada"}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="ml-3"
                    />
                    <CreditCard className="w-5 h-5 ml-2" />
                    <span className="font-semibold">بطاقة مدى</span>
                  </label>

                  <label className="flex items-center p-4 border border-border rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="payment"
                      value="credit"
                      checked={paymentMethod === "credit"}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="ml-3"
                    />
                    <CreditCard className="w-5 h-5 ml-2" />
                    <span className="font-semibold">بطاقة ائتمان</span>
                  </label>

                  <label className="flex items-center p-4 border border-border rounded-lg cursor-pointer hover:bg-muted">
                    <input
                      type="radio"
                      name="payment"
                      value="stc"
                      checked={paymentMethod === "stc"}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="ml-3"
                    />
                    <Smartphone className="w-5 h-5 ml-2" />
                    <span className="font-semibold">STC Pay</span>
                  </label>
                </div>

                {loyaltyPoints > 0 && (
                  <Card className="p-4 mb-6 bg-accent/10">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={usePoints}
                        onChange={(e) => setUsePoints(e.target.checked)}
                        className="ml-3"
                      />
                      <span className="font-semibold">
                        استخدام {loyaltyPoints} نقطة ولاء (خصم {((loyaltyPoints || 0) * 0.1).toFixed(2)} ر.س)
                      </span>
                    </label>
                  </Card>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("address")}>
                    السابق
                  </Button>
                  <Button className="flex-1" onClick={() => setStep("review")}>
                    التالي: المراجعة
                  </Button>
                </div>
              </Card>
            )}

            {step === "review" && (
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-bold mb-4">مراجعة الطلب</h3>
                
                <div className="space-y-4 pb-6 border-b border-border mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">العنوان</p>
                    <p className="font-semibold">{formData.fullName}</p>
                    <p className="text-sm">{formData.address}, {formData.city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">طريقة الدفع</p>
                    <p className="font-semibold">
                      {paymentMethod === "mada" ? "بطاقة مدى" : paymentMethod === "credit" ? "بطاقة ائتمان" : "STC Pay"}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={() => setStep("payment")}>
                    السابق
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleCreateOrder}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                    تأكيد الطلب
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card className="p-6 sticky top-20">
              <h3 className="text-lg font-bold mb-4">ملخص الطلب</h3>
              <div className="space-y-3 mb-6 pb-6 border-b border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المجموع الفرعي</span>
                  <span>{cartTotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الشحن</span>
                  <span>{shippingCost} ر.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الضريبة (15%)</span>
                  <span>{tax.toFixed(2)} ر.س</span>
                </div>
                {usePoints && (
                  <div className="flex justify-between text-green-600">
                    <span>خصم النقاط</span>
                    <span>-{loyaltyDiscount.toFixed(2)} ر.س</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between mb-6 text-lg font-bold">
                <span>الإجمالي</span>
                <span className="text-primary">{finalTotal.toFixed(2)} ر.س</span>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm font-semibold mb-3">المنتجات ({cartQuery.data?.length || 0})</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {cartQuery.data?.map((item: any) => (
                    <div key={item.id} className="text-sm flex justify-between">
                      <span className="truncate">{item.nameAr || item.name}</span>
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

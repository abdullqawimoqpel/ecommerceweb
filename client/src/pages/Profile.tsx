import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

export default function Profile() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <div className="container py-16">
        <div className="text-center">
          <p className="mb-4">يرجى تسجيل الدخول أولاً</p>
          <Button asChild>
            <Link href="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-16">
      <h1 className="text-3xl font-bold mb-8">حسابي</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="p-6">
          <h3 className="font-bold mb-4">معلومات الحساب</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">الاسم</p>
              <p className="font-semibold">{user.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
              <p className="font-semibold">{user.email}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold mb-4">نقاط الولاء</h3>
          <div className="text-4xl font-bold text-primary mb-4">0</div>
          <p className="text-sm text-muted-foreground">نقطة متاحة</p>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold mb-4">الإجراءات</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full">
              تعديل الملف الشخصي
            </Button>
            <Button variant="outline" className="w-full">
              تغيير كلمة المرور
            </Button>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={() => logout()}
            >
              تسجيل الخروج
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

import { BrandLogo } from '@/components/BrandLogo';
import { AdminLoginForm } from './AdminLoginForm';

export default function AdminLoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-[#e8f4fc]">
      <div className="bg-white rounded-2xl shadow-xl border border-sky-200 p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <BrandLogo className="h-20 w-auto max-w-[280px] object-contain mx-auto mb-4" />
          <p className="text-sky-600 font-medium mt-2">Admin Portal</p>
        </div>
        <AdminLoginForm />
        <p className="text-center mt-6 text-sm text-slate-500">
          © 2026 Multigate Medical Supplies. All rights reserved.
        </p>
      </div>
    </div>
  );
}

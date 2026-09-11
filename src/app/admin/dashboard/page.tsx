import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Use the tabs to manage orders, products, categories, banners, and view reports.
        </p>
      </div>

      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-900 mb-3">Quick links</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
          >
            Orders
          </Link>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
          >
            Products
          </Link>
          <Link
            href="/admin/categories"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/admin/banners"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
          >
            Banners
          </Link>
          <Link
            href="/admin/reports"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-sky-200 text-sky-700 rounded-lg hover:bg-sky-50 transition-colors"
          >
            Reports
          </Link>
        </div>
      </div>
    </div>
  );
}


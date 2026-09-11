'use client';

import { useState, useEffect } from 'react';

type ReportData = {
  total_orders: number;
  total_revenue: number;
  total_items_sold: number;
  by_product: { product_name: string; quantity: number; revenue: number }[];
};

export default function AdminReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reports')
      .then((r) => r.json())
      .then((data) => setReport(data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500 py-8">Loading…</p>;

  if (!report) {
    return (
      <div className="space-y-6">
        <h2 className="font-semibold text-slate-900">Reports</h2>
        <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-8 text-center text-slate-500">
          No report data yet. Orders will appear here once you have sales.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-slate-900">Reports</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-5">
          <p className="text-sm font-medium text-sky-700">Total orders</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report.total_orders}</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-5">
          <p className="text-sm font-medium text-sky-700">Total revenue</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">KES {report.total_revenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm p-5">
          <p className="text-sm font-medium text-sky-700">Items sold</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{report.total_items_sold}</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl border-2 border-sky-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-sky-100 bg-sky-50">
          <h3 className="font-semibold text-slate-900">Sales by product</h3>
        </div>
        <div className="overflow-x-auto">
          {report.by_product.length === 0 ? (
            <p className="p-6 text-slate-500 text-center">No sales data yet.</p>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-sky-200 bg-sky-50/80">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Product</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Quantity sold</th>
                  <th className="px-4 py-3 text-sm font-semibold text-slate-800">Revenue (KES)</th>
                </tr>
              </thead>
              <tbody>
                {report.by_product.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{row.quantity}</td>
                    <td className="px-4 py-3 text-slate-900">{row.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

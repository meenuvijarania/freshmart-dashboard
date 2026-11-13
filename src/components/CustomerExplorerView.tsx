import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { CustomerRecord, DashboardFilters } from '../types/customer';
import { formatINR } from '../utils/dataset';

interface CustomerExplorerViewProps {
  records: CustomerRecord[];
  filters: DashboardFilters;
  onUpdateFilters: (patch: Partial<DashboardFilters>) => void;
  onSelectCustomer: (customer: CustomerRecord) => void;
}

type SortField =
  | 'customerId'
  | 'lifetimeSpend'
  | 'totalOrders'
  | 'avgOrderValue'
  | 'daysSinceLastOrder'
  | 'deliveryRating'
  | 'appSessionsLast30Days';

export const CustomerExplorerView: React.FC<CustomerExplorerViewProps> = ({
  records,
  filters,
  onUpdateFilters,
  onSelectCustomer,
}) => {
  const [sortField, setSortField] = useState<SortField>('lifetimeSpend');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const sorted = useMemo(() => {
    const arr = [...records];
    arr.sort((a, b) => {
      const va = a[sortField];
      const vb = b[sortField];
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc'
        ? Number(va) - Number(vb)
        : Number(vb) - Number(va);
    });
    return arr;
  }, [records, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
    setPage(1);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                onUpdateFilters({ search: e.target.value });
                setPage(1);
              }}
              placeholder="Search ID, city, or category..."
              aria-label="Search customers"
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 w-64"
            />
          </div>

          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
            {(['All', 'Active', 'At Risk', 'Churned'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  onUpdateFilters({ status });
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filters.status === status
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs font-mono text-slate-500 tabular-nums">
          {sorted.length} matching records · Click any row for profile
        </span>
      </div>

      {/* Table */}
      {pageRows.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-medium text-slate-800">
            No customer records match your current filters.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Try clearing your search query or resetting segment filters.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('customerId')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    ID <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4">City</th>
                <th className="py-2.5 px-4">Demographics</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('totalOrders')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Orders <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('avgOrderValue')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    AOV <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('lifetimeSpend')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Cum. GMV <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('daysSinceLastOrder')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Recency <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('deliveryRating')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Rating <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort('appSessionsLast30Days')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer"
                  >
                    Sessions <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-4">Promo</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {pageRows.map((r) => (
                <tr
                  key={r.customerId}
                  onClick={() => onSelectCustomer(r)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {r.customerId}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                    {r.city}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                    {r.ageGroup} · {r.gender}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                    {r.productCategory}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {r.totalOrders}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(r.avgOrderValue)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {formatINR(r.lifetimeSpend)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {r.daysSinceLastOrder}d
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {r.deliveryRating.toFixed(1)}★
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {r.appSessionsLast30Days}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {r.promoUsed ? 'Yes' : 'No'}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap font-medium">
                    <span
                      className={
                        r.riskTier === 'Churned'
                          ? 'text-red-700'
                          : r.riskTier === 'At Risk'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }
                    >
                      {r.riskTier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="font-mono tabular-nums">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-slate-200 rounded-lg font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

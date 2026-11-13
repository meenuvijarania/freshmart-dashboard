import React, { useState } from 'react';
import { DashboardFilters, DatasetAnalytics } from '../types/customer';
import { formatINR } from '../utils/dataset';
import { CategoryEconomicsChart } from './Charts';

interface SegmentsViewProps {
  analytics: DatasetAnalytics;
  filters: DashboardFilters;
  onUpdateFilters: (patch: Partial<DashboardFilters>) => void;
}

type CitySortKey = 'totalGMV' | 'churnRate' | 'avgRating' | 'avgAOV' | 'count';

export const SegmentsView: React.FC<SegmentsViewProps> = ({
  analytics,
  filters,
  onUpdateFilters,
}) => {
  const [citySort, setCitySort] = useState<CitySortKey>('totalGMV');

  const sortedCities = [...analytics.byCity].sort((a, b) => {
    if (citySort === 'churnRate') return b.churnRate - a.churnRate;
    if (citySort === 'avgRating') return b.avgRating - a.avgRating;
    if (citySort === 'avgAOV') return b.avgAOV - a.avgAOV;
    if (citySort === 'count') return b.count - a.count;
    return b.totalGMV - a.totalGMV;
  });

  return (
    <div className="space-y-6">
      {/* City Leaderboard */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              City Performance Leaderboard
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any city row to filter the entire dashboard · Mumbai & Delhi lead volume; Kolkata shows highest operational distress
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Sort by:</span>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'totalGMV', label: 'GMV' },
                  { id: 'churnRate', label: 'Churn %' },
                  { id: 'avgRating', label: 'Rating' },
                  { id: 'avgAOV', label: 'AOV' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCitySort(s.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    citySort === s.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">City</th>
                <th className="py-2.5 px-4 text-right">Customers</th>
                <th className="py-2.5 px-4 text-right">Total GMV</th>
                <th className="py-2.5 px-4 text-right">GMV Lost</th>
                <th className="py-2.5 px-4 text-right">Churn Rate</th>
                <th className="py-2.5 px-4 text-right">Avg AOV</th>
                <th className="py-2.5 px-4 text-right">Orders/User</th>
                <th className="py-2.5 px-4 text-right">Avg Rating</th>
                <th className="py-2.5 px-4 text-right">Sessions/Mo</th>
                <th className="py-2.5 px-4 text-right">Promo %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {sortedCities.map((c) => {
                const isSelected = filters.city === c.key;
                return (
                  <tr
                    key={c.key}
                    onClick={() =>
                      onUpdateFilters({ city: isSelected ? 'All' : c.key })
                    }
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {c.key}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {c.count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(c.totalGMV, true)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-red-700">
                      {formatINR(c.churnedGMV, true)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span
                        className={`font-semibold ${
                          c.churnRate >= 32
                            ? 'text-red-700'
                            : c.churnRate >= 22
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {c.churnRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {formatINR(c.avgAOV)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {c.avgOrders.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {c.avgRating.toFixed(2)}★
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {c.avgSessions.toFixed(1)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {c.promoPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Category & Demographic Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <CategoryEconomicsChart
            categories={analytics.byCategory}
            selectedCategory={filters.category}
            onSelectCategory={(category) => onUpdateFilters({ category })}
          />
        </div>

        {/* Age Group Breakdown */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Demographic Age Cohorts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                26–45 drives core revenue; 18–25 orders most frequently; 60+ carries peak AOV
              </p>
            </div>
            {filters.ageGroup !== 'All' && (
              <button
                type="button"
                onClick={() => onUpdateFilters({ ageGroup: 'All' })}
                className="text-xs font-medium text-emerald-700 underline underline-offset-2 cursor-pointer"
              >
                Clear ({filters.ageGroup})
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                  <th className="py-2 pr-3">Age Bracket</th>
                  <th className="py-2 px-3 text-right">Users</th>
                  <th className="py-2 px-3 text-right">Total GMV</th>
                  <th className="py-2 px-3 text-right">AOV</th>
                  <th className="py-2 px-3 text-right">Orders</th>
                  <th className="py-2 pl-3 text-right">Churn %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {analytics.byAge.map((age) => {
                  const isSel = filters.ageGroup === age.key;
                  return (
                    <tr
                      key={age.key}
                      onClick={() =>
                        onUpdateFilters({ ageGroup: isSel ? 'All' : age.key })
                      }
                      className={`cursor-pointer transition-colors ${
                        isSel ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3 pr-3 font-semibold text-slate-900">
                        {age.key}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-600">
                        {age.count} ({age.sharePct.toFixed(0)}%)
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {formatINR(age.totalGMV, true)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                        {formatINR(age.avgAOV)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                        {age.avgOrders.toFixed(1)}
                      </td>
                      <td
                        className={`py-3 pl-3 text-right font-mono tabular-nums font-semibold ${
                          age.churnRate >= 32
                            ? 'text-red-700'
                            : age.churnRate >= 27
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {age.churnRate.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Gender Split Footer Summary */}
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
            {analytics.byGender.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() =>
                  onUpdateFilters({
                    gender: filters.gender === g.key ? 'All' : g.key,
                  })
                }
                className={`text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                  filters.gender === g.key
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{g.key}</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {g.count} ({g.sharePct.toFixed(0)}%)
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-slate-600">
                    Rating {g.avgRating.toFixed(2)}★
                  </span>
                  <span
                    className={`font-semibold ${
                      g.churnRate >= 30 ? 'text-red-700' : 'text-emerald-700'
                    }`}
                  >
                    {g.churnRate.toFixed(1)}% churn
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

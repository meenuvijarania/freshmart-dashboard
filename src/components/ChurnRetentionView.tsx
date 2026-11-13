import React, { useMemo, useState } from 'react';
import { CustomerRecord, DatasetAnalytics } from '../types/customer';
import { formatINR } from '../utils/dataset';
import { RatingSessionScatter } from './Charts';

interface ChurnRetentionViewProps {
  records: CustomerRecord[];
  analytics: DatasetAnalytics;
  onSelectCustomer: (customer: CustomerRecord) => void;
}

export const ChurnRetentionView: React.FC<ChurnRetentionViewProps> = ({
  records,
  analytics,
  onSelectCustomer,
}) => {
  // Interactive Retention Simulator Controls
  const [slaRescuePct, setSlaRescuePct] = useState<number>(45);
  const [dormancyWinbackPct, setDormancyWinbackPct] = useState<number>(35);
  const [promoConvertPct, setPromoConvertPct] = useState<number>(40);

  const atRiskWatchlist = useMemo(() => {
    return records
      .filter((r) => r.riskTier === 'At Risk')
      .sort((a, b) => b.lifetimeSpend - a.lifetimeSpend);
  }, [records]);

  const simulation = useMemo(() => {
    const lowRatingAtRisk = atRiskWatchlist.filter((r) => r.deliveryRating <= 3.3);
    const dormantAtRisk = atRiskWatchlist.filter(
      (r) => r.daysSinceLastOrder >= 30 && r.deliveryRating > 3.3
    );
    const noPromoLowSession = atRiskWatchlist.filter(
      (r) =>
        !r.promoUsed &&
        r.deliveryRating > 3.3 &&
        r.daysSinceLastOrder < 30 &&
        r.appSessionsLast30Days <= 6
    );

    const savedFromSLA = lowRatingAtRisk.length * (slaRescuePct / 100);
    const savedFromDormancy = dormantAtRisk.length * (dormancyWinbackPct / 100);
    const savedFromPromo = noPromoLowSession.length * (promoConvertPct / 100);

    const avgSpendLowRating =
      lowRatingAtRisk.length > 0
        ? lowRatingAtRisk.reduce((s, r) => s + r.lifetimeSpend, 0) / lowRatingAtRisk.length
        : analytics.avgAOV * analytics.avgOrders;
    const avgSpendDormant =
      dormantAtRisk.length > 0
        ? dormantAtRisk.reduce((s, r) => s + r.lifetimeSpend, 0) / dormantAtRisk.length
        : analytics.avgAOV * analytics.avgOrders;
    const avgSpendPromo =
      noPromoLowSession.length > 0
        ? noPromoLowSession.reduce((s, r) => s + r.lifetimeSpend, 0) / noPromoLowSession.length
        : analytics.avgAOV * analytics.avgOrders;

    const totalSavedCustomers = Math.round(
      savedFromSLA + savedFromDormancy + savedFromPromo
    );
    const protectedGMV = Math.round(
      savedFromSLA * avgSpendLowRating +
        savedFromDormancy * avgSpendDormant +
        savedFromPromo * avgSpendPromo
    );

    // If these at-risk users would otherwise churn without intervention, compute reduction
    const projectedFutureChurners = Math.max(
      0,
      atRiskWatchlist.length - totalSavedCustomers
    );

    return {
      lowRatingCount: lowRatingAtRisk.length,
      dormantCount: dormantAtRisk.length,
      promoTargetCount: noPromoLowSession.length,
      totalSavedCustomers,
      protectedGMV,
      projectedFutureChurners,
    };
  }, [atRiskWatchlist, slaRescuePct, dormancyWinbackPct, promoConvertPct, analytics]);

  return (
    <div className="space-y-6">
      {/* Three Threshold Summary Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Threshold 01 · Service Quality</p>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            ≤ 3.2★ Delivery Rating
          </p>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Every churned customer in the dataset rated delivery ≤ 3.2★ or showed severe dormancy. Customers above 3.3★ retain at nearly 100%.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Threshold 02 · Order Recency</p>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            30–45 Day Danger Window
          </p>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Active customers max out at 44 days since last order; 100% of customers at 46+ days have churned. Intervention must happen between days 25 and 40.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Threshold 03 · App Engagement</p>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono tabular-nums">
            ≤ 5 Monthly App Sessions
          </p>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            Zero churn occurs among users logging 6+ sessions in 30 days. Driving one extra weekly session shifts buyers into the zero-churn safety zone.
          </p>
        </div>
      </section>

      {/* Behavioral Scatter + Simulator */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7">
          <RatingSessionScatter
            records={records}
            onSelectCustomer={onSelectCustomer}
          />
        </div>

        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Retention Intervention Simulator
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Model expected customer & GMV preservation across the {atRiskWatchlist.length} active at-risk accounts
            </p>

            <div className="mt-5 space-y-5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="sla-slider" className="font-medium text-slate-700">
                    SLA Service Recovery ({simulation.lowRatingCount} low-rating active)
                  </label>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {slaRescuePct}%
                  </span>
                </div>
                <input
                  id="sla-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={slaRescuePct}
                  onChange={(e) => setSlaRescuePct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="dormancy-slider" className="font-medium text-slate-700">
                    30–44d Win-Back Trigger ({simulation.dormantCount} dormant active)
                  </label>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {dormancyWinbackPct}%
                  </span>
                </div>
                <input
                  id="dormancy-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={dormancyWinbackPct}
                  onChange={(e) => setDormancyWinbackPct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label htmlFor="promo-slider" className="font-medium text-slate-700">
                    Targeted Promo Activation ({simulation.promoTargetCount} non-promo low-session)
                  </label>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {promoConvertPct}%
                  </span>
                </div>
                <input
                  id="promo-slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={promoConvertPct}
                  onChange={(e) => setPromoConvertPct(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500">Projected Accounts Saved</p>
              <p className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-0.5">
                {simulation.totalSavedCustomers}
                <span className="text-xs font-normal text-slate-500 ml-1">
                  / {atRiskWatchlist.length}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Protected Historical GMV</p>
              <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {formatINR(simulation.protectedGMV, true)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Active At-Risk Priority Watchlist */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              High-Value Active At-Risk Watchlist
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active customers showing ≥30d inactivity, ≤3.3★ delivery rating, or ≤6 monthly sessions · Ranked by cumulative spend
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600 tabular-nums shrink-0">
            Showing top {Math.min(15, atRiskWatchlist.length)} of {atRiskWatchlist.length} accounts
          </span>
        </div>

        {atRiskWatchlist.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No active at-risk customers match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">City · Category</th>
                  <th className="py-2.5 px-4 text-right">Orders</th>
                  <th className="py-2.5 px-4 text-right">Cumulative Spend</th>
                  <th className="py-2.5 px-4 text-right">Last Order</th>
                  <th className="py-2.5 px-4 text-right">Rating</th>
                  <th className="py-2.5 px-4 text-right">Sessions (30d)</th>
                  <th className="py-2.5 px-4">Primary Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {atRiskWatchlist.slice(0, 15).map((r) => (
                  <tr
                    key={r.customerId}
                    onClick={() => onSelectCustomer(r)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {r.customerId}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 whitespace-nowrap">
                      {r.city} · {r.productCategory}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-700">
                      {r.totalOrders}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(r.lifetimeSpend)}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono tabular-nums ${
                        r.daysSinceLastOrder >= 30 ? 'text-amber-700 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {r.daysSinceLastOrder}d
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono tabular-nums ${
                        r.deliveryRating <= 3.3 ? 'text-red-700 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {r.deliveryRating.toFixed(1)}★
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-mono tabular-nums ${
                        r.appSessionsLast30Days <= 6 ? 'text-amber-700 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      {r.appSessionsLast30Days}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                      {r.riskSignals[0] ?? 'Multi-factor watch'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

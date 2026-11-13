import React from 'react';
import { ArrowRight, AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react';
import {
  DashboardFilters,
  DatasetAnalytics,
  StrategicInsight,
  ViewTab,
} from '../types/customer';
import { formatINR } from '../utils/dataset';
import {
  CategoryEconomicsChart,
  ChurnCliffChart,
  CityMatrixChart,
} from './Charts';

interface OverviewViewProps {
  analytics: DatasetAnalytics;
  filters: DashboardFilters;
  onUpdateFilters: (patch: Partial<DashboardFilters>) => void;
  onNavigateTab: (tab: ViewTab) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  analytics,
  filters,
  onUpdateFilters,
  onNavigateTab,
}) => {
  const promoYes = analytics.byPromo.find((p) => p.key === 'Promo Used');
  const promoNo = analytics.byPromo.find((p) => p.key === 'No Promo');

  const handleInsightAction = (insight: StrategicInsight) => {
    if (insight.filterPatch) {
      onUpdateFilters(insight.filterPatch);
    }
    if (insight.targetTab) {
      onNavigateTab(insight.targetTab);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <section aria-label="Key Performance Indicators">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Customer Base</p>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5">
              {analytics.totalCount.toLocaleString('en-IN')}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
              {analytics.activeCount} active · {analytics.churnedCount} churned
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Cumulative GMV</p>
            <p className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1.5">
              {formatINR(analytics.totalGMV, true)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
              Avg {formatINR(analytics.avgAOV)} AOV · {analytics.avgOrders.toFixed(1)} orders
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Overall Churn Rate</p>
            <p
              className={`text-2xl font-bold font-mono tabular-nums mt-1.5 ${
                analytics.churnRate >= 30
                  ? 'text-red-600'
                  : analytics.churnRate >= 20
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}
            >
              {analytics.churnRate.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
              Avg rating {analytics.avgRating.toFixed(2)}★ · {analytics.avgSessions.toFixed(1)} sess/mo
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">GMV Lost to Churn</p>
            <p className="text-2xl font-bold text-red-700 font-mono tabular-nums mt-1.5">
              {formatINR(analytics.churnedGMV, true)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
              {analytics.totalGMV > 0
                ? ((analytics.churnedGMV / analytics.totalGMV) * 100).toFixed(1)
                : '0.0'}
              % of historical revenue
            </p>
          </div>

          <div className="p-5">
            <p className="text-xs font-medium text-slate-500">Active At-Risk Pipeline</p>
            <p className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1.5">
              {formatINR(analytics.atRiskGMV, true)}
            </p>
            <p className="text-xs text-slate-500 mt-1.5 font-mono tabular-nums">
              {analytics.atRiskCount} active buyers near cliff
            </p>
          </div>
        </div>
      </section>

      {/* Primary Charts */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7">
          <ChurnCliffChart
            binsByRating={analytics.binsByRating}
            binsByDays={analytics.binsByDays}
            binsBySessions={analytics.binsBySessions}
            binsByOrders={analytics.binsByOrders}
          />
        </div>
        <div className="xl:col-span-5">
          <CityMatrixChart
            cities={analytics.byCity}
            selectedCity={filters.city}
            onSelectCity={(city) => onUpdateFilters({ city })}
          />
        </div>
      </section>

      {/* Insights & Recommended Actions */}
      <section aria-label="Decision Insights">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Key Insights & Decision Triggers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Computed dynamically from the active selection of {analytics.totalCount} records
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {analytics.insights.map((insight) => {
            const badgeText =
              insight.severity === 'critical'
                ? 'Critical Driver'
                : insight.severity === 'warning'
                  ? 'Risk Signal'
                  : 'Growth Opportunity';
            const badgeColor =
              insight.severity === 'critical'
                ? 'text-red-700'
                : insight.severity === 'warning'
                  ? 'text-amber-700'
                  : 'text-emerald-700';
            const Icon =
              insight.severity === 'critical'
                ? ShieldAlert
                : insight.severity === 'warning'
                  ? AlertTriangle
                  : TrendingUp;

            return (
              <article
                key={insight.id}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs mb-2">
                    <span className={`inline-flex items-center gap-1.5 font-semibold ${badgeColor}`}>
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {badgeText}
                    </span>
                    <span className="text-slate-400 font-mono tabular-nums">
                      {insight.impactMetric}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                    {insight.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed mt-2">
                    {insight.finding}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">Action: </span>
                    {insight.recommendation}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleInsightAction(insight)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 self-start cursor-pointer"
                  >
                    Inspect segment
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Category & Promo Comparison */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <CategoryEconomicsChart
            categories={analytics.byCategory}
            selectedCategory={filters.category}
            onSelectCategory={(category) => onUpdateFilters({ category })}
          />
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Promotional Retention Impact
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Promo adoption ({analytics.promoUsagePct.toFixed(1)}% of base) correlates with higher retention and basket spend
                </p>
              </div>
            </div>

            {promoYes && promoNo ? (
              <div className="divide-y divide-slate-100">
                {[
                  {
                    label: 'Churn Rate',
                    yesVal: `${promoYes.churnRate.toFixed(1)}%`,
                    noVal: `${promoNo.churnRate.toFixed(1)}%`,
                    yesNum: promoYes.churnRate,
                    noNum: promoNo.churnRate,
                    lowerBetter: true,
                  },
                  {
                    label: 'Avg Order Value',
                    yesVal: formatINR(promoYes.avgAOV),
                    noVal: formatINR(promoNo.avgAOV),
                    yesNum: promoYes.avgAOV,
                    noNum: promoNo.avgAOV,
                    lowerBetter: false,
                  },
                  {
                    label: 'Avg Delivery Rating',
                    yesVal: `${promoYes.avgRating.toFixed(2)}★`,
                    noVal: `${promoNo.avgRating.toFixed(2)}★`,
                    yesNum: promoYes.avgRating,
                    noNum: promoNo.avgRating,
                    lowerBetter: false,
                  },
                  {
                    label: 'Monthly App Sessions',
                    yesVal: promoYes.avgSessions.toFixed(1),
                    noVal: promoNo.avgSessions.toFixed(1),
                    yesNum: promoYes.avgSessions,
                    noNum: promoNo.avgSessions,
                    lowerBetter: false,
                  },
                ].map((row) => {
                  const max = Math.max(0.01, row.yesNum, row.noNum);
                  return (
                    <div key={row.label} className="py-3">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-medium text-slate-700">{row.label}</span>
                        <span className="text-slate-400 font-mono tabular-nums">
                          Promo ({promoYes.count}) vs. No Promo ({promoNo.count})
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-16 text-[11px] text-slate-600 shrink-0">
                            Promo Yes
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.lowerBetter ? 'bg-emerald-600' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${(row.yesNum / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs font-mono font-semibold text-slate-900 tabular-nums">
                            {row.yesVal}
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span className="w-16 text-[11px] text-slate-500 shrink-0">
                            Promo No
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                row.lowerBetter ? 'bg-red-600' : 'bg-slate-400'
                              }`}
                              style={{ width: `${(row.noNum / max) * 100}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs font-mono font-medium text-slate-600 tabular-nums">
                            {row.noVal}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Select both Promo Yes and No segments to compare retention lift.
              </p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Non-promo active buyers at risk:{' '}
              <strong className="font-mono text-slate-900 tabular-nums">
                {promoNo ? promoNo.atRiskCount : 0}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => {
                onUpdateFilters({ promo: 'No', status: 'At Risk' });
                onNavigateTab('explorer');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer whitespace-nowrap"
            >
              View target list →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

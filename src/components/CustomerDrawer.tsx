import React from 'react';
import { X } from 'lucide-react';
import { CustomerRecord, GroupSummary } from '../types/customer';
import { formatINR } from '../utils/dataset';

interface CustomerDrawerProps {
  customer: CustomerRecord | null;
  cityBenchmark?: GroupSummary;
  onClose: () => void;
}

export const CustomerDrawer: React.FC<CustomerDrawerProps> = ({
  customer,
  cityBenchmark,
  onClose,
}) => {
  if (!customer) return null;

  const statusColor =
    customer.riskTier === 'Churned'
      ? 'text-red-700'
      : customer.riskTier === 'At Risk'
        ? 'text-amber-700'
        : 'text-emerald-700';

  const recommendation =
    customer.riskTier === 'Churned'
      ? customer.deliveryRating <= 3.2
        ? 'Win-back requires service apology credit + priority delivery SLA guarantee.'
        : 'Deploy steep reactivation offer (e.g. ₹150 off next 2 baskets) to overcome 45+ day dormancy.'
      : customer.riskTier === 'At Risk'
        ? customer.deliveryRating <= 3.3
          ? 'Proactively issue instant delivery-experience credit before customer churns.'
          : !customer.promoUsed
            ? 'Send personalized category coupon before reaching the 45-day dormancy cliff.'
            : 'Trigger weekly basket reminder push notification to lift monthly sessions above 6.'
        : 'Account is healthy; eligible for Dairy subscription or Beverages cross-sell bundle.';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Customer profile ${customer.customerId}`}
    >
      <div
        className="w-full max-w-md bg-white h-full border-l border-slate-200 p-6 overflow-y-auto flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs text-slate-500 font-medium">Customer Profile</p>
              <h2 className="text-xl font-bold text-slate-900 font-mono mt-0.5">
                {customer.customerId}
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                {customer.city} · {customer.ageGroup} · {customer.gender}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close profile drawer"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Retention Status</p>
              <p className={`text-base font-semibold mt-0.5 ${statusColor}`}>
                {customer.riskTier}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Cumulative Spend</p>
              <p className="text-base font-bold text-slate-900 font-mono tabular-nums mt-0.5">
                {formatINR(customer.lifetimeSpend)}
              </p>
            </div>
          </div>

          <dl className="py-4 divide-y divide-slate-100 text-xs">
            {[
              { label: 'Preferred Category', value: customer.productCategory },
              {
                label: 'Total Orders',
                value: `${customer.totalOrders}${
                  cityBenchmark
                    ? ` (City avg ${cityBenchmark.avgOrders.toFixed(1)})`
                    : ''
                }`,
              },
              {
                label: 'Average Order Value',
                value: `${formatINR(customer.avgOrderValue)}${
                  cityBenchmark ? ` (City avg ${formatINR(cityBenchmark.avgAOV)})` : ''
                }`,
              },
              {
                label: 'Days Since Last Order',
                value: `${customer.daysSinceLastOrder} days`,
              },
              {
                label: 'Delivery Rating',
                value: `${customer.deliveryRating.toFixed(1)}★${
                  cityBenchmark
                    ? ` (City avg ${cityBenchmark.avgRating.toFixed(2)}★)`
                    : ''
                }`,
              },
              {
                label: 'App Sessions (30d)',
                value: `${customer.appSessionsLast30Days} sessions`,
              },
              {
                label: 'Promotional Discount Used',
                value: customer.promoUsed ? 'Yes' : 'No',
              },
            ].map((item) => (
              <div key={item.label} className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-slate-500">{item.label}</dt>
                <dd className="font-mono tabular-nums font-medium text-slate-900 text-right">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>

          {customer.riskSignals.length > 0 && (
            <div className="py-4 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-900 mb-2">
                Observed Risk Signals
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-4">
                {customer.riskSignals.map((sig) => (
                  <li key={sig}>{sig}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-xs font-semibold text-slate-900">
              Recommended Decision
            </p>
            <p className="text-xs text-slate-600 leading-relaxed mt-1">
              {recommendation}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

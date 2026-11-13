import React, { useState } from 'react';
import { BinMetric, CustomerRecord, GroupSummary } from '../types/customer';
import { formatINR } from '../utils/dataset';

interface ChurnCliffChartProps {
  binsByRating: BinMetric[];
  binsByDays: BinMetric[];
  binsBySessions: BinMetric[];
  binsByOrders: BinMetric[];
}

type CliffDimension = 'rating' | 'days' | 'sessions' | 'orders';

export const ChurnCliffChart: React.FC<ChurnCliffChartProps> = ({
  binsByRating,
  binsByDays,
  binsBySessions,
  binsByOrders,
}) => {
  const [dim, setDim] = useState<CliffDimension>('rating');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const tabs: { id: CliffDimension; label: string; takeaway: string }[] = [
    {
      id: 'rating',
      label: 'Delivery Rating',
      takeaway: 'Hard cliff below 3.1★: churn jumps from 2.3% to 87%–100%.',
    },
    {
      id: 'days',
      label: 'Days Since Order',
      takeaway: '45-day boundary: 0% churn ≤30d, 100% churn ≥46d.',
    },
    {
      id: 'sessions',
      label: 'App Sessions (30d)',
      takeaway: 'Engagement floor: 0% churn for customers with ≥6 sessions.',
    },
    {
      id: 'orders',
      label: 'Order Frequency',
      takeaway: 'Loyalty curve: churn drops nearly in half once buyers hit 10+ orders.',
    },
  ];

  const activeBins =
    dim === 'rating'
      ? binsByRating
      : dim === 'days'
        ? binsByDays
        : dim === 'sessions'
          ? binsBySessions
          : binsByOrders;

  const activeTab = tabs.find((t) => t.id === dim)!;
  const hoveredBin = hoveredIdx !== null ? activeBins[hoveredIdx] : null;

  const width = 640;
  const height = 250;
  const padL = 44;
  const padR = 20;
  const padT = 26;
  const padB = 50;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const slotW = activeBins.length > 0 ? plotW / activeBins.length : plotW;
  const barW = Math.min(64, slotW * 0.56);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Empirical Churn Thresholds
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{activeTab.takeaway}</p>
        </div>

        <div
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start sm:self-auto"
          role="tablist"
          aria-label="Churn driver dimension"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={dim === t.id}
              onClick={() => {
                setDim(t.id);
                setHoveredIdx(null);
              }}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                dim === t.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label={`Churn rate by ${activeTab.label}`}
        >
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = padT + plotH - (tick / 100) * plotH;
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {activeBins.map((bin, idx) => {
            const cx = padL + idx * slotW + slotW / 2;
            const barH = Math.max(2, (bin.churnRate / 100) * plotH);
            const y = padT + plotH - barH;
            const isHovered = hoveredIdx === idx;

            const fillColor =
              bin.churnRate >= 60
                ? '#dc2626'
                : bin.churnRate >= 15
                  ? '#d97706'
                  : '#059669';

            return (
              <g
                key={bin.label}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer"
              >
                <rect
                  x={cx - slotW / 2 + 4}
                  y={padT}
                  width={slotW - 8}
                  height={plotH}
                  fill={isHovered ? '#f8fafc' : 'transparent'}
                  rx={6}
                />
                <rect
                  x={cx - barW / 2}
                  y={y}
                  width={barW}
                  height={barH}
                  rx={4}
                  fill={fillColor}
                  opacity={hoveredIdx !== null && !isHovered ? 0.55 : 0.92}
                  className="transition-opacity duration-150"
                />
                <text
                  x={cx}
                  y={y - 7}
                  textAnchor="middle"
                  className="fill-slate-800 text-[11px] font-mono font-semibold tabular-nums"
                >
                  {bin.churnRate.toFixed(1)}%
                </text>
                <text
                  x={cx}
                  y={padT + plotH + 16}
                  textAnchor="middle"
                  className="fill-slate-700 text-[11px] font-medium"
                >
                  {bin.label}
                </text>
                <text
                  x={cx}
                  y={padT + plotH + 31}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  n={bin.count} ({bin.churnedCount} lost)
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 min-h-[28px]">
        {hoveredBin ? (
          <div className="flex items-center gap-3 font-mono tabular-nums">
            <span className="font-sans font-semibold text-slate-900">
              {hoveredBin.label}
            </span>
            <span>{hoveredBin.count} customers</span>
            <span aria-hidden="true">·</span>
            <span>{hoveredBin.churnedCount} churned ({hoveredBin.churnRate.toFixed(1)}%)</span>
            <span aria-hidden="true">·</span>
            <span>Avg Spend {formatINR(hoveredBin.avgGMV)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-4 text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
              Healthy (&lt;15% churn)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-600 inline-block" />
              Watchlist (15–59%)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-red-600 inline-block" />
              Critical (≥60% churn)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface CityMatrixChartProps {
  cities: GroupSummary[];
  selectedCity: string;
  onSelectCity: (city: string) => void;
}

export const CityMatrixChart: React.FC<CityMatrixChartProps> = ({
  cities,
  selectedCity,
  onSelectCity,
}) => {
  const [hoveredCity, setHoveredCity] = useState<GroupSummary | null>(null);

  const width = 560;
  const height = 270;
  const padL = 46;
  const padR = 26;
  const padT = 22;
  const padB = 40;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const minRating = 2.8;
  const maxRating = 4.2;
  const maxChurn = Math.max(48, ...cities.map((c) => Math.ceil(c.churnRate / 10) * 10 + 5));
  const maxGMV = Math.max(1, ...cities.map((c) => c.totalGMV));

  const avgRating =
    cities.length > 0
      ? cities.reduce((s, c) => s + c.avgRating * c.count, 0) /
        Math.max(1, cities.reduce((s, c) => s + c.count, 0))
      : 3.5;
  const avgChurn =
    cities.length > 0
      ? (cities.reduce((s, c) => s + c.churnedCount, 0) /
          Math.max(1, cities.reduce((s, c) => s + c.count, 0))) *
        100
      : 28.6;

  const xPos = (r: number) =>
    padL + ((Math.min(maxRating, Math.max(minRating, r)) - minRating) / (maxRating - minRating)) * plotW;
  const yPos = (ch: number) => padT + plotH - (ch / maxChurn) * plotH;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            City Performance Matrix
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Delivery Rating vs. Churn Rate · Bubble size = Total GMV · Click a city to filter
          </p>
        </div>
        {selectedCity !== 'All' && (
          <button
            type="button"
            onClick={() => onSelectCity('All')}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Clear ({selectedCity})
          </button>
        )}
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          role="img"
          aria-label="City Delivery Rating versus Churn Rate scatter matrix"
        >
          {[0, 15, 30, 45].map((t) => {
            if (t > maxChurn) return null;
            const y = yPos(t);
            return (
              <g key={t}>
                <line
                  x1={padL}
                  y1={y}
                  x2={width - padR}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padL - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {t}%
                </text>
              </g>
            );
          })}

          {[3.0, 3.3, 3.6, 3.9, 4.1].map((r) => {
            const x = xPos(r);
            return (
              <g key={r}>
                <line
                  x1={x}
                  y1={padT}
                  x2={x}
                  y2={padT + plotH}
                  stroke="#f1f5f9"
                />
                <text
                  x={x}
                  y={padT + plotH + 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono tabular-nums"
                >
                  {r.toFixed(1)}★
                </text>
              </g>
            );
          })}

          {/* Reference crosshairs for overall mean */}
          <line
            x1={xPos(avgRating)}
            y1={padT}
            x2={xPos(avgRating)}
            y2={padT + plotH}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
          />
          <line
            x1={padL}
            y1={yPos(avgChurn)}
            x2={width - padR}
            y2={yPos(avgChurn)}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
          />

          <text
            x={padL + 6}
            y={padT + 12}
            className="fill-red-600/75 text-[10px] font-medium"
          >
            High Churn · Low Rating
          </text>
          <text
            x={width - padR - 6}
            y={padT + plotH - 8}
            textAnchor="end"
            className="fill-emerald-700/75 text-[10px] font-medium"
          >
            Benchmark Retention
          </text>

          <text
            x={padL + plotW / 2}
            y={height - 4}
            textAnchor="middle"
            className="fill-slate-500 text-[10px] font-medium"
          >
            Average Delivery Rating (1–5★)
          </text>

          {cities.map((c) => {
            const cx = xPos(c.avgRating);
            const cy = yPos(c.churnRate);
            const radius = 8 + Math.sqrt(c.totalGMV / maxGMV) * 16;
            const isSelected = selectedCity === c.key;
            const isHovered = hoveredCity?.key === c.key;
            const color =
              c.churnRate >= 32
                ? '#dc2626'
                : c.churnRate >= 22
                  ? '#d97706'
                  : '#059669';

            return (
              <g
                key={c.key}
                onMouseEnter={() => setHoveredCity(c)}
                onMouseLeave={() => setHoveredCity(null)}
                onClick={() => onSelectCity(isSelected ? 'All' : c.key)}
                className="cursor-pointer"
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={color}
                  fillOpacity={isSelected || isHovered ? 0.32 : 0.18}
                  stroke={color}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className="transition-all duration-150"
                />
                <text
                  x={cx}
                  y={cy - radius - 4}
                  textAnchor="middle"
                  className="fill-slate-800 text-[10.5px] font-semibold"
                >
                  {c.key}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-2 pt-3 border-t border-slate-100 text-xs text-slate-600 min-h-[28px] flex items-center justify-between gap-2">
        {hoveredCity ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums">
            <span className="font-sans font-semibold text-slate-900">
              {hoveredCity.key}
            </span>
            <span>{hoveredCity.count} users</span>
            <span aria-hidden="true">·</span>
            <span>GMV {formatINR(hoveredCity.totalGMV, true)}</span>
            <span aria-hidden="true">·</span>
            <span>Churn {hoveredCity.churnRate.toFixed(1)}%</span>
            <span aria-hidden="true">·</span>
            <span>Rating {hoveredCity.avgRating.toFixed(2)}★</span>
          </div>
        ) : (
          <span className="text-slate-500">
            Dashed lines mark dataset averages ({avgRating.toFixed(2)}★ rating, {avgChurn.toFixed(1)}% churn).
          </span>
        )}
      </div>
    </div>
  );
};

interface CategoryEconomicsChartProps {
  categories: GroupSummary[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoryEconomicsChart: React.FC<CategoryEconomicsChartProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const [metric, setMetric] = useState<'totalGMV' | 'avgAOV' | 'churnRate'>('totalGMV');

  const maxVal = Math.max(
    1,
    ...categories.map((c) =>
      metric === 'totalGMV' ? c.totalGMV : metric === 'avgAOV' ? c.avgAOV : c.churnRate
    )
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Product Category Economics
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare cumulative revenue, basket size, and churn across preferences
          </p>
        </div>

        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          {(
            [
              { id: 'totalGMV', label: 'Total GMV' },
              { id: 'avgAOV', label: 'Avg Order Value' },
              { id: 'churnRate', label: 'Churn Rate' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMetric(tab.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metric === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {categories.map((cat) => {
          const val =
            metric === 'totalGMV'
              ? cat.totalGMV
              : metric === 'avgAOV'
                ? cat.avgAOV
                : cat.churnRate;
          const pct = Math.min(100, (val / maxVal) * 100);
          const isSelected = selectedCategory === cat.key;
          const barColor =
            metric === 'churnRate'
              ? cat.churnRate >= 30
                ? 'bg-red-600'
                : 'bg-emerald-600'
              : 'bg-emerald-600';

          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => onSelectCategory(isSelected ? 'All' : cat.key)}
              className={`w-full text-left py-3.5 px-2 -mx-2 rounded-lg transition-colors cursor-pointer ${
                isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {cat.key}
                  </span>
                  <span className="text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
                    {cat.count} buyers ({cat.sharePct.toFixed(0)}%)
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono tabular-nums shrink-0">
                  <span className="text-slate-500 hidden sm:inline">
                    AOV {formatINR(cat.avgAOV)} · {cat.avgOrders.toFixed(1)} orders
                  </span>
                  <span className="font-semibold text-slate-900">
                    {metric === 'totalGMV'
                      ? formatINR(cat.totalGMV, true)
                      : metric === 'avgAOV'
                        ? formatINR(cat.avgAOV)
                        : `${cat.churnRate.toFixed(1)}%`}
                  </span>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface RatingSessionScatterProps {
  records: CustomerRecord[];
  onSelectCustomer: (customer: CustomerRecord) => void;
}

export const RatingSessionScatter: React.FC<RatingSessionScatterProps> = ({
  records,
  onSelectCustomer,
}) => {
  const [hovered, setHovered] = useState<CustomerRecord | null>(null);

  const width = 620;
  const height = 280;
  const padL = 44;
  const padR = 20;
  const padT = 20;
  const padB = 42;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const xPos = (sessions: number) => padL + (Math.min(22, Math.max(0, sessions)) / 22) * plotW;
  const yPos = (rating: number) => padT + plotH - ((Math.min(5, Math.max(1, rating)) - 1) / 4) * plotH;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Behavioral Risk Map: App Sessions vs. Delivery Rating
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Every customer plotted · Dashed zone (≤5 sessions & ≤3.2★) isolates churn · Click a dot to inspect
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            Healthy
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            At Risk
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            Churned
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        role="img"
        aria-label="Scatter plot of App Sessions vs Delivery Rating"
      >
        {/* Danger Zone Box */}
        <rect
          x={xPos(0)}
          y={yPos(3.2)}
          width={xPos(5.5) - xPos(0)}
          height={yPos(1) - yPos(3.2)}
          fill="#fef2f2"
          stroke="#fca5a5"
          strokeDasharray="4 4"
          rx={4}
        />
        <text
          x={xPos(0.4)}
          y={yPos(1.18)}
          className="fill-red-700 text-[10px] font-medium"
        >
          Churn Concentration Zone (≤5 sessions, ≤3.2★)
        </text>

        {[1, 2, 3, 4, 5].map((r) => {
          const y = yPos(r);
          return (
            <g key={r}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text
                x={padL - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {r.toFixed(1)}★
              </text>
            </g>
          );
        })}

        {[0, 5, 10, 15, 20].map((s) => {
          const x = xPos(s);
          return (
            <g key={s}>
              <line x1={x} y1={padT} x2={x} y2={padT + plotH} stroke="#f1f5f9" />
              <text
                x={x}
                y={padT + plotH + 16}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] font-mono tabular-nums"
              >
                {s}
              </text>
            </g>
          );
        })}

        <text
          x={padL + plotW / 2}
          y={height - 4}
          textAnchor="middle"
          className="fill-slate-500 text-[10px] font-medium"
        >
          App Sessions (Last 30 Days)
        </text>

        {records.map((r, i) => {
          // Slight deterministic jitter on integer sessions so overlapping dots remain inspectable
          const jitter = ((i % 7) - 3) * 0.11;
          const cx = xPos(Math.max(0, Math.min(22, r.appSessionsLast30Days + jitter)));
          const cy = yPos(r.deliveryRating);
          const isHov = hovered?.customerId === r.customerId;
          const fill =
            r.riskTier === 'Churned'
              ? '#dc2626'
              : r.riskTier === 'At Risk'
                ? '#f59e0b'
                : '#059669';

          return (
            <circle
              key={r.customerId}
              cx={cx}
              cy={cy}
              r={isHov ? 6 : 3.4}
              fill={fill}
              fillOpacity={isHov ? 1 : 0.72}
              stroke={isHov ? '#0f172a' : '#ffffff'}
              strokeWidth={isHov ? 1.5 : 0.6}
              onMouseEnter={() => setHovered(r)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectCustomer(r)}
              className="cursor-pointer transition-all duration-100"
            />
          );
        })}
      </svg>

      <div className="mt-2 pt-3 border-t border-slate-100 text-xs text-slate-600 min-h-[28px] flex items-center justify-between">
        {hovered ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono tabular-nums">
            <span className="font-semibold text-slate-900">{hovered.customerId}</span>
            <span className="font-sans">{hovered.city} · {hovered.productCategory}</span>
            <span>{hovered.appSessionsLast30Days} sessions</span>
            <span>{hovered.deliveryRating.toFixed(1)}★</span>
            <span>{hovered.daysSinceLastOrder}d inactive</span>
            <span
              className={`font-sans font-semibold ${
                hovered.riskTier === 'Churned'
                  ? 'text-red-700'
                  : hovered.riskTier === 'At Risk'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
              }`}
            >
              {hovered.riskTier}
            </span>
          </div>
        ) : (
          <span className="text-slate-500">
            Showing {records.length} customers. Zero churn occurs above 5 monthly sessions or above 3.2★ delivery rating.
          </span>
        )}
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Download,
  LayoutDashboard,
  Menu,
  RotateCcw,
  ShieldAlert,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { ChurnRetentionView } from './components/ChurnRetentionView';
import { CustomerDrawer } from './components/CustomerDrawer';
import { CustomerExplorerView } from './components/CustomerExplorerView';
import { OverviewView } from './components/OverviewView';
import { SegmentsView } from './components/SegmentsView';
import {
  CustomerRecord,
  DashboardFilters,
  ViewTab,
} from './types/customer';
import {
  computeAnalytics,
  DEFAULT_FILTERS,
  filterRecords,
  formatINR,
  parseFreshCartCSV,
} from './utils/dataset';

const DATASET_URL = '/assets/aistudio/FreshCart_Customer_Data_0add5ec3.csv';

const NAV_ITEMS: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview & Insights', icon: LayoutDashboard },
  { id: 'churn', label: 'Churn & Retention', icon: ShieldAlert },
  { id: 'segments', label: 'Cities & Categories', icon: BarChart3 },
  { id: 'explorer', label: 'Customer Explorer', icon: Users },
];

export default function App() {
  const [records, setRecords] = useState<CustomerRecord[]>([]);
  const [datasetName, setDatasetName] = useState<string>('FreshCart Customer Data (500 records)');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDefaultDataset = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DATASET_URL);
      if (!response.ok) {
        throw new Error(`Unable to load dataset (${response.status})`);
      }
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder('windows-1252').decode(buffer);
      const parsed = parseFreshCartCSV(text);
      setRecords(parsed);
      setDatasetName(`FreshCart Customer Data (${parsed.length} records)`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse dataset');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaultDataset();
  }, [loadDefaultDataset]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || '');
        const parsed = parseFreshCartCSV(text);
        setRecords(parsed);
        setDatasetName(`${file.name} (${parsed.length} records)`);
        setFilters(DEFAULT_FILTERS);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid CSV format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const updateFilters = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.city !== 'All' ||
      filters.ageGroup !== 'All' ||
      filters.gender !== 'All' ||
      filters.category !== 'All' ||
      filters.promo !== 'All' ||
      filters.status !== 'All' ||
      filters.search.trim() !== ''
    );
  }, [filters]);

  const distinctOptions = useMemo(() => {
    const cities = Array.from(new Set(records.map((r) => r.city))).sort();
    const categories = Array.from(new Set(records.map((r) => r.productCategory))).sort();
    const ages = ['18-25', '26-35', '36-45', '46-60', '60+'].filter((a) =>
      records.some((r) => r.ageGroup === a)
    );
    return { cities, categories, ages };
  }, [records]);

  const filteredRecords = useMemo(
    () => filterRecords(records, filters),
    [records, filters]
  );

  const analytics = useMemo(
    () => computeAnalytics(filteredRecords),
    [filteredRecords]
  );

  const fullAnalytics = useMemo(() => computeAnalytics(records), [records]);

  const handleExportCSV = () => {
    const headers = [
      'Customer_ID',
      'City',
      'Age_Group',
      'Gender',
      'Total_Orders',
      'Avg_Order_Value_(INR)',
      'Cumulative_GMV_(INR)',
      'Days_Since_Last_Order',
      'Delivery_Rating',
      'Product_Category_Preference',
      'App_Sessions_Last_30_Days',
      'Promo_Used',
      'Churned',
      'Risk_Tier',
    ];
    const csvRows = [
      headers.join(','),
      ...filteredRecords.map((r) =>
        [
          r.customerId,
          r.city,
          r.ageGroup,
          r.gender,
          r.totalOrders,
          r.avgOrderValue,
          r.lifetimeSpend,
          r.daysSinceLastOrder,
          r.deliveryRating,
          r.productCategory,
          r.appSessionsLast30Days,
          r.promoUsed ? 'Yes' : 'No',
          r.churned ? 1 : 0,
          r.riskTier,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `freshcart_filtered_${filteredRecords.length}_customers.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? 'Overview';

  const selectedCityBenchmark = selectedCustomer
    ? fullAnalytics.byCity.find((c) => c.key === selectedCustomer.city)
    : undefined;

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-4">
      <div className="space-y-6">
        <div className="px-2 pt-1 flex items-center justify-between">
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            FreshCart Analytics
          </span>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1" aria-label="Dashboard sections">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Global Segment Filters */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-900">
              Segment Filters
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="space-y-2.5 px-1">
            <div>
              <label htmlFor="filter-city" className="block text-[11px] font-medium text-slate-500 mb-1">
                City
              </label>
              <select
                id="filter-city"
                value={filters.city}
                onChange={(e) => updateFilters({ city: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="All">All Cities ({distinctOptions.cities.length})</option>
                {distinctOptions.cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-category" className="block text-[11px] font-medium text-slate-500 mb-1">
                Product Category
              </label>
              <select
                id="filter-category"
                value={filters.category}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="All">All Categories</option>
                {distinctOptions.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-age" className="block text-[11px] font-medium text-slate-500 mb-1">
                Age Bracket
              </label>
              <select
                id="filter-age"
                value={filters.ageGroup}
                onChange={(e) => updateFilters({ ageGroup: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="All">All Ages</option>
                {distinctOptions.ages.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-promo" className="block text-[11px] font-medium text-slate-500 mb-1">
                Promo Usage
              </label>
              <select
                id="filter-promo"
                value={filters.promo}
                onChange={(e) =>
                  updateFilters({ promo: e.target.value as DashboardFilters['promo'] })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="All">All Buyers</option>
                <option value="Yes">Promo Used</option>
                <option value="No">No Promo</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-status" className="block text-[11px] font-medium text-slate-500 mb-1">
                Retention Status
              </label>
              <select
                id="filter-status"
                value={filters.status}
                onChange={(e) =>
                  updateFilters({ status: e.target.value as DashboardFilters['status'] })
                }
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-emerald-600"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active (Healthy + Watchlist)</option>
                <option value="At Risk">At Risk Only</option>
                <option value="Churned">Churned Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Source Footer */}
      <div className="pt-4 border-t border-slate-200 space-y-2 px-1">
        <p className="text-[11px] text-slate-500 leading-snug">
          Source: <span className="text-slate-700 font-medium">{datasetName}</span>
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Upload CSV dataset"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          Load Another CSV
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-white border-r border-slate-200 sticky top-0 h-screen overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex bg-slate-900/30"
          onClick={() => setMobileNavOpen(false)}
        >
          <aside
            className="w-72 bg-white h-full border-r border-slate-200 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-400 hidden sm:inline whitespace-nowrap">
                FreshCart Analytics
              </span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate whitespace-nowrap">
                {activeNavLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden md:inline text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap">
              {filteredRecords.length} of {records.length} records ·{' '}
              {formatINR(analytics.totalGMV, true)} GMV
            </span>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </header>

        {/* Active Filter Summary Bar (only shown when filtered) */}
        {hasActiveFilters && (
          <div className="bg-emerald-50/60 border-b border-emerald-200/70 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-emerald-950">
              <span className="font-semibold">Active slice:</span>
              <span>
                {[
                  filters.city !== 'All' ? `City: ${filters.city}` : null,
                  filters.category !== 'All' ? `Category: ${filters.category}` : null,
                  filters.ageGroup !== 'All' ? `Age: ${filters.ageGroup}` : null,
                  filters.gender !== 'All' ? `Gender: ${filters.gender}` : null,
                  filters.promo !== 'All' ? `Promo: ${filters.promo}` : null,
                  filters.status !== 'All' ? `Status: ${filters.status}` : null,
                  filters.search.trim() ? `Search: "${filters.search.trim()}"` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-2 cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto">
          {loading ? (
            <div className="space-y-6" aria-busy="true" aria-label="Loading dataset">
              <div className="h-28 bg-white border border-slate-200 rounded-xl animate-pulse" />
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                <div className="xl:col-span-7 h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
                <div className="xl:col-span-5 h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
              </div>
            </div>
          ) : error ? (
            <div className="bg-white border border-red-200 rounded-xl p-8 text-center max-w-lg mx-auto my-12">
              <h2 className="text-base font-semibold text-slate-900">
                Unable to load customer dataset
              </h2>
              <p className="text-xs text-slate-600 mt-1.5">{error}</p>
              <button
                type="button"
                onClick={loadDefaultDataset}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Retry Loading Dataset
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-lg mx-auto my-12">
              <h2 className="text-base font-semibold text-slate-900">
                No customers match the active filters
              </h2>
              <p className="text-xs text-slate-600 mt-1.5">
                Adjust one or more segment filters to inspect customer insights and charts.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  analytics={analytics}
                  filters={filters}
                  onUpdateFilters={updateFilters}
                  onNavigateTab={setActiveTab}
                />
              )}
              {activeTab === 'churn' && (
                <ChurnRetentionView
                  records={filteredRecords}
                  analytics={analytics}
                  onSelectCustomer={setSelectedCustomer}
                />
              )}
              {activeTab === 'segments' && (
                <SegmentsView
                  analytics={analytics}
                  filters={filters}
                  onUpdateFilters={updateFilters}
                />
              )}
              {activeTab === 'explorer' && (
                <CustomerExplorerView
                  records={filteredRecords}
                  filters={filters}
                  onUpdateFilters={updateFilters}
                  onSelectCustomer={setSelectedCustomer}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Customer Profile Drawer */}
      <CustomerDrawer
        customer={selectedCustomer}
        cityBenchmark={selectedCityBenchmark}
        onClose={() => setSelectedCustomer(null)}
      />
    </div>
  );
}

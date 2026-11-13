import {
  BinMetric,
  CustomerRecord,
  DashboardFilters,
  DatasetAnalytics,
  GroupSummary,
  RiskTier,
  StrategicInsight,
} from '../types/customer';

export const DEFAULT_FILTERS: DashboardFilters = {
  city: 'All',
  ageGroup: 'All',
  gender: 'All',
  category: 'All',
  promo: 'All',
  status: 'All',
  search: '',
};

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseFreshCartCSV(rawText: string): CustomerRecord[] {
  const lines = rawText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error('CSV file does not contain enough rows.');
  }

  // Locate actual header row (handles datasets with a title banner on row 0)
  const headerIndex = lines.findIndex(
    (line) =>
      line.includes('Customer_ID') &&
      line.includes('City') &&
      line.includes('Churned')
  );

  if (headerIndex === -1) {
    throw new Error('Could not locate expected FreshCart column headers.');
  }

  const headers = splitCsvLine(lines[headerIndex]);
  const idx = (name: string) => headers.indexOf(name);

  const iId = idx('Customer_ID');
  const iCity = idx('City');
  const iAge = idx('Age_Group');
  const iGender = idx('Gender');
  const iOrders = idx('Total_Orders');
  const iAOV = idx('Avg_Order_Value_(INR)');
  const iDays = idx('Days_Since_Last_Order');
  const iRating = idx('Delivery_Rating');
  const iCategory = idx('Product_Category_Preference');
  const iSessions = idx('App_Sessions_Last_30_Days');
  const iPromo = idx('Promo_Used');
  const iChurned = idx('Churned');

  const records: CustomerRecord[] = [];

  for (let r = headerIndex + 1; r < lines.length; r++) {
    const cols = splitCsvLine(lines[r]);
    if (cols.length < headers.length) continue;

    const customerId = cols[iId];
    if (!customerId) continue;

    const totalOrders = Number(cols[iOrders]) || 0;
    const avgOrderValue = Number(cols[iAOV]) || 0;
    const daysSinceLastOrder = Number(cols[iDays]) || 0;
    const deliveryRating = Number(cols[iRating]) || 0;
    const appSessionsLast30Days = Number(cols[iSessions]) || 0;
    const promoUsed = cols[iPromo]?.toLowerCase() === 'yes';
    const churned = cols[iChurned] === '1' || cols[iChurned]?.toLowerCase() === 'true';
    const lifetimeSpend = Math.round(totalOrders * avgOrderValue);

    const riskSignals: string[] = [];
    if (deliveryRating <= 3.3) riskSignals.push(`Low delivery rating (${deliveryRating.toFixed(1)})`);
    if (daysSinceLastOrder >= 30) riskSignals.push(`${daysSinceLastOrder}d since last order`);
    if (appSessionsLast30Days <= 6) riskSignals.push(`Low app engagement (${appSessionsLast30Days} sessions)`);
    if (!promoUsed && !churned && (deliveryRating <= 3.5 || daysSinceLastOrder >= 28)) {
      riskSignals.push('No promo incentive used');
    }

    let riskTier: RiskTier = 'Healthy';
    if (churned) {
      riskTier = 'Churned';
    } else if (
      daysSinceLastOrder >= 30 ||
      deliveryRating <= 3.3 ||
      appSessionsLast30Days <= 6
    ) {
      riskTier = 'At Risk';
    }

    records.push({
      customerId,
      city: cols[iCity],
      ageGroup: cols[iAge],
      gender: cols[iGender],
      totalOrders,
      avgOrderValue,
      daysSinceLastOrder,
      deliveryRating,
      productCategory: cols[iCategory],
      appSessionsLast30Days,
      promoUsed,
      churned,
      lifetimeSpend,
      riskTier,
      riskSignals,
    });
  }

  return records;
}

export function formatINR(value: number, compact = false): string {
  if (compact) {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`;
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`;
    }
    if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function filterRecords(
  records: CustomerRecord[],
  filters: DashboardFilters
): CustomerRecord[] {
  const q = filters.search.trim().toLowerCase();
  return records.filter((r) => {
    if (filters.city !== 'All' && r.city !== filters.city) return false;
    if (filters.ageGroup !== 'All' && r.ageGroup !== filters.ageGroup) return false;
    if (filters.gender !== 'All' && r.gender !== filters.gender) return false;
    if (filters.category !== 'All' && r.productCategory !== filters.category) return false;
    if (filters.promo === 'Yes' && !r.promoUsed) return false;
    if (filters.promo === 'No' && r.promoUsed) return false;
    if (filters.status === 'Active' && r.churned) return false;
    if (filters.status === 'At Risk' && r.riskTier !== 'At Risk') return false;
    if (filters.status === 'Churned' && !r.churned) return false;
    if (q) {
      const hay = `${r.customerId} ${r.city} ${r.productCategory} ${r.ageGroup}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function summarizeGroups(
  records: CustomerRecord[],
  totalCount: number,
  keyFn: (r: CustomerRecord) => string,
  sortBy: 'gmv' | 'order' = 'gmv',
  customOrder?: string[]
): GroupSummary[] {
  const map = new Map<string, CustomerRecord[]>();
  for (const r of records) {
    const k = keyFn(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }

  const summaries: GroupSummary[] = [];
  for (const [key, list] of map.entries()) {
    const count = list.length;
    const churned = list.filter((x) => x.churned);
    const atRisk = list.filter((x) => x.riskTier === 'At Risk');
    const totalGMV = list.reduce((s, x) => s + x.lifetimeSpend, 0);
    const churnedGMV = churned.reduce((s, x) => s + x.lifetimeSpend, 0);
    const atRiskGMV = atRisk.reduce((s, x) => s + x.lifetimeSpend, 0);

    summaries.push({
      key,
      count,
      sharePct: totalCount > 0 ? (count / totalCount) * 100 : 0,
      churnedCount: churned.length,
      atRiskCount: atRisk.length,
      churnRate: count > 0 ? (churned.length / count) * 100 : 0,
      avgAOV: count > 0 ? list.reduce((s, x) => s + x.avgOrderValue, 0) / count : 0,
      avgOrders: count > 0 ? list.reduce((s, x) => s + x.totalOrders, 0) / count : 0,
      totalGMV,
      churnedGMV,
      atRiskGMV,
      avgRating: count > 0 ? list.reduce((s, x) => s + x.deliveryRating, 0) / count : 0,
      avgDays: count > 0 ? list.reduce((s, x) => s + x.daysSinceLastOrder, 0) / count : 0,
      avgSessions: count > 0 ? list.reduce((s, x) => s + x.appSessionsLast30Days, 0) / count : 0,
      promoPct: count > 0 ? (list.filter((x) => x.promoUsed).length / count) * 100 : 0,
    });
  }

  if (sortBy === 'order' && customOrder) {
    summaries.sort((a, b) => {
      const ia = customOrder.indexOf(a.key);
      const ib = customOrder.indexOf(b.key);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  } else {
    summaries.sort((a, b) => b.totalGMV - a.totalGMV);
  }

  return summaries;
}

function buildBins(
  records: CustomerRecord[],
  defs: { label: string; sublabel?: string; test: (r: CustomerRecord) => boolean; isDanger?: boolean; isWarning?: boolean }[]
): BinMetric[] {
  return defs.map((d) => {
    const subset = records.filter(d.test);
    const count = subset.length;
    const churnedCount = subset.filter((r) => r.churned).length;
    const totalGMV = subset.reduce((s, r) => s + r.lifetimeSpend, 0);
    return {
      label: d.label,
      sublabel: d.sublabel,
      count,
      churnedCount,
      churnRate: count > 0 ? (churnedCount / count) * 100 : 0,
      avgGMV: count > 0 ? totalGMV / count : 0,
      isDanger: d.isDanger,
      isWarning: d.isWarning,
    };
  });
}

function generateInsights(
  records: CustomerRecord[],
  byCity: GroupSummary[],
  byCategory: GroupSummary[],
  byPromo: GroupSummary[],
  byAge: GroupSummary[]
): StrategicInsight[] {
  if (records.length === 0) return [];
  const insights: StrategicInsight[] = [];

  // 1. Delivery Rating Cliff
  const lowRating = records.filter((r) => r.deliveryRating <= 3.0);
  const highRating = records.filter((r) => r.deliveryRating > 3.0);
  if (lowRating.length > 0 && highRating.length > 0) {
    const lowChurn = (lowRating.filter((r) => r.churned).length / lowRating.length) * 100;
    const highChurn = (highRating.filter((r) => r.churned).length / highRating.length) * 100;
    insights.push({
      id: 'rating-cliff',
      severity: 'critical',
      category: 'Service Quality',
      title: 'Delivery Rating ≤ 3.0 triggers near-total churn',
      finding: `Customers rating delivery ≤ 3.0 (${lowRating.length} users) churn at ${lowChurn.toFixed(1)}%, compared to ${highChurn.toFixed(1)}% above 3.0.`,
      recommendation: 'Trigger immediate SLA recovery vouchers and priority dispatch whenever an order receives ≤ 3.3 rating.',
      impactMetric: `${lowChurn.toFixed(1)}% vs ${highChurn.toFixed(1)}% churn`,
      targetTab: 'churn',
    });
  }

  // 2. Promo Retention Lift
  const promoYes = byPromo.find((p) => p.key === 'Promo Used');
  const promoNo = byPromo.find((p) => p.key === 'No Promo');
  if (promoYes && promoNo && promoYes.count > 0 && promoNo.count > 0) {
    const relReduction =
      promoNo.churnRate > 0
        ? ((promoNo.churnRate - promoYes.churnRate) / promoNo.churnRate) * 100
        : 0;
    insights.push({
      id: 'promo-lift',
      severity: 'opportunity',
      category: 'Promotions',
      title: 'Promotions cut churn rate by more than half',
      finding: `Promo users churn at ${promoYes.churnRate.toFixed(1)}% (AOV ${formatINR(promoYes.avgAOV)}) versus ${promoNo.churnRate.toFixed(1)}% for non-promo buyers.`,
      recommendation: 'Target active non-promo customers approaching 30 days of inactivity with personalized category incentives.',
      impactMetric: `${relReduction.toFixed(0)}% lower churn`,
      filterPatch: { promo: 'No', status: 'At Risk' },
      targetTab: 'explorer',
    });
  }

  // 3. City Performance Gap
  if (byCity.length >= 2) {
    const sortedByChurn = [...byCity].sort((a, b) => b.churnRate - a.churnRate);
    const worstCity = sortedByChurn[0];
    const bestCity = sortedByChurn[sortedByChurn.length - 1];
    const highestRiskGMVCity = [...byCity].sort((a, b) => b.churnedGMV - a.churnedGMV)[0];
    insights.push({
      id: 'city-disparity',
      severity: 'warning',
      category: 'Regional Ops',
      title: `${worstCity.key} shows highest churn (${worstCity.churnRate.toFixed(1)}%); ${highestRiskGMVCity.key} leads revenue loss`,
      finding: `${worstCity.key} averages ${worstCity.avgRating.toFixed(2)}★ delivery rating vs ${bestCity.key} at ${bestCity.avgRating.toFixed(2)}★ (${bestCity.churnRate.toFixed(1)}% churn).`,
      recommendation: `Audit dark-store fulfillment latency in ${worstCity.key} and ${highestRiskGMVCity.key}; replicate ${bestCity.key}'s dispatch playbook.`,
      impactMetric: `${formatINR(highestRiskGMVCity.churnedGMV, true)} lost in ${highestRiskGMVCity.key}`,
      filterPatch: { city: worstCity.key },
      targetTab: 'segments',
    });
  }

  // 4. Category & Demographic Opportunity
  if (byCategory.length >= 2) {
    const topRevCat = [...byCategory].sort((a, b) => b.totalGMV - a.totalGMV)[0];
    const topAovCat = [...byCategory].sort((a, b) => b.avgAOV - a.avgAOV)[0];
    const lowestChurnCat = [...byCategory].sort((a, b) => a.churnRate - b.churnRate)[0];
    insights.push({
      id: 'category-mix',
      severity: 'opportunity',
      category: 'Category Mix',
      title: `${lowestChurnCat.key} anchors retention; ${topAovCat.key} commands peak AOV`,
      finding: `${topRevCat.key} drives ${formatINR(topRevCat.totalGMV, true)} GMV but churns at ${topRevCat.churnRate.toFixed(1)}%, while ${topAovCat.key} averages ${formatINR(topAovCat.avgAOV)}/order.`,
      recommendation: `Cross-sell ${lowestChurnCat.key} subscriptions to ${topRevCat.key} shoppers and bundle ${topAovCat.key} to lift basket size.`,
      impactMetric: `${formatINR(topAovCat.avgAOV)} peak AOV`,
      filterPatch: { category: topRevCat.key },
      targetTab: 'segments',
    });
  }

  // 5. App Engagement & Watchlist
  const atRiskActive = records.filter((r) => r.riskTier === 'At Risk');
  if (atRiskActive.length > 0) {
    const atRiskGMV = atRiskActive.reduce((s, r) => s + r.lifetimeSpend, 0);
    const highOrderYouth = byAge.find((a) => a.key === '18-25');
    const ageNote = highOrderYouth
      ? ` The 18–25 bracket orders most (${highOrderYouth.avgOrders.toFixed(1)} orders) but churns at ${highOrderYouth.churnRate.toFixed(1)}%.`
      : '';
    insights.push({
      id: 'watchlist-pipeline',
      severity: 'warning',
      category: 'Retention Watchlist',
      title: `${atRiskActive.length} active customers sit on the churn boundary`,
      finding: `Active customers with ≥ 30 days dormancy, ≤ 6 app sessions, or ≤ 3.3 rating represent ${formatINR(atRiskGMV, true)} in historical spend.${ageNote}`,
      recommendation: 'Launch automated push + promo win-back campaigns before customers cross the 45-day dormancy cliff.',
      impactMetric: `${formatINR(atRiskGMV, true)} at risk`,
      filterPatch: { status: 'At Risk' },
      targetTab: 'churn',
    });
  }

  return insights;
}

export function computeAnalytics(records: CustomerRecord[]): DatasetAnalytics {
  const totalCount = records.length;
  const activeRecords = records.filter((r) => !r.churned);
  const atRiskRecords = records.filter((r) => r.riskTier === 'At Risk');
  const churnedRecords = records.filter((r) => r.churned);

  const totalGMV = records.reduce((s, r) => s + r.lifetimeSpend, 0);
  const activeGMV = activeRecords.reduce((s, r) => s + r.lifetimeSpend, 0);
  const atRiskGMV = atRiskRecords.reduce((s, r) => s + r.lifetimeSpend, 0);
  const churnedGMV = churnedRecords.reduce((s, r) => s + r.lifetimeSpend, 0);

  const byCity = summarizeGroups(records, totalCount, (r) => r.city);
  const byCategory = summarizeGroups(records, totalCount, (r) => r.productCategory);
  const byAge = summarizeGroups(
    records,
    totalCount,
    (r) => r.ageGroup,
    'order',
    ['18-25', '26-35', '36-45', '46-60', '60+']
  );
  const byGender = summarizeGroups(records, totalCount, (r) => r.gender);
  const byPromo = summarizeGroups(
    records,
    totalCount,
    (r) => (r.promoUsed ? 'Promo Used' : 'No Promo'),
    'order',
    ['Promo Used', 'No Promo']
  );

  const binsByRating = buildBins(records, [
    { label: '1.0 – 2.0★', sublabel: 'Critical', test: (r) => r.deliveryRating <= 2.0, isDanger: true },
    { label: '2.1 – 3.0★', sublabel: 'Poor', test: (r) => r.deliveryRating > 2.0 && r.deliveryRating <= 3.0, isDanger: true },
    { label: '3.1 – 4.0★', sublabel: 'Good', test: (r) => r.deliveryRating > 3.0 && r.deliveryRating <= 4.0, isWarning: true },
    { label: '4.1 – 5.0★', sublabel: 'Excellent', test: (r) => r.deliveryRating > 4.0 },
  ]);

  const binsByDays = buildBins(records, [
    { label: '1 – 15d', sublabel: 'Recent', test: (r) => r.daysSinceLastOrder <= 15 },
    { label: '16 – 30d', sublabel: 'Normal', test: (r) => r.daysSinceLastOrder >= 16 && r.daysSinceLastOrder <= 30 },
    { label: '31 – 45d', sublabel: 'Window', test: (r) => r.daysSinceLastOrder >= 31 && r.daysSinceLastOrder <= 45, isWarning: true },
    { label: '46 – 75d', sublabel: 'Dormant', test: (r) => r.daysSinceLastOrder >= 46 && r.daysSinceLastOrder <= 75, isDanger: true },
    { label: '76 – 120d', sublabel: 'Lost', test: (r) => r.daysSinceLastOrder >= 76, isDanger: true },
  ]);

  const binsBySessions = buildBins(records, [
    { label: '0 sessions', sublabel: 'Inactive', test: (r) => r.appSessionsLast30Days === 0, isDanger: true },
    { label: '1 – 5', sublabel: 'Low', test: (r) => r.appSessionsLast30Days >= 1 && r.appSessionsLast30Days <= 5, isDanger: true },
    { label: '6 – 10', sublabel: 'Moderate', test: (r) => r.appSessionsLast30Days >= 6 && r.appSessionsLast30Days <= 10 },
    { label: '11 – 15', sublabel: 'Engaged', test: (r) => r.appSessionsLast30Days >= 11 && r.appSessionsLast30Days <= 15 },
    { label: '16 – 22', sublabel: 'Power User', test: (r) => r.appSessionsLast30Days >= 16 },
  ]);

  const binsByOrders = buildBins(records, [
    { label: '1 – 4 orders', sublabel: 'New', test: (r) => r.totalOrders <= 4, isWarning: true },
    { label: '5 – 9 orders', sublabel: 'Growing', test: (r) => r.totalOrders >= 5 && r.totalOrders <= 9 },
    { label: '10 – 14 orders', sublabel: 'Loyal', test: (r) => r.totalOrders >= 10 && r.totalOrders <= 14 },
    { label: '15 – 18 orders', sublabel: 'Champion', test: (r) => r.totalOrders >= 15 },
  ]);

  const insights = generateInsights(records, byCity, byCategory, byPromo, byAge);

  return {
    totalCount,
    activeCount: activeRecords.length,
    atRiskCount: atRiskRecords.length,
    churnedCount: churnedRecords.length,
    churnRate: totalCount > 0 ? (churnedRecords.length / totalCount) * 100 : 0,
    totalGMV,
    activeGMV,
    atRiskGMV,
    churnedGMV,
    avgAOV: totalCount > 0 ? records.reduce((s, r) => s + r.avgOrderValue, 0) / totalCount : 0,
    avgOrders: totalCount > 0 ? records.reduce((s, r) => s + r.totalOrders, 0) / totalCount : 0,
    avgRating: totalCount > 0 ? records.reduce((s, r) => s + r.deliveryRating, 0) / totalCount : 0,
    avgDays: totalCount > 0 ? records.reduce((s, r) => s + r.daysSinceLastOrder, 0) / totalCount : 0,
    avgSessions: totalCount > 0 ? records.reduce((s, r) => s + r.appSessionsLast30Days, 0) / totalCount : 0,
    promoUsagePct:
      totalCount > 0 ? (records.filter((r) => r.promoUsed).length / totalCount) * 100 : 0,
    byCity,
    byCategory,
    byAge,
    byGender,
    byPromo,
    binsByRating,
    binsByDays,
    binsBySessions,
    binsByOrders,
    insights,
  };
}

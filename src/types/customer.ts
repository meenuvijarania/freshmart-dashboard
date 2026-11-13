export type CityName =
  | 'Mumbai'
  | 'Delhi'
  | 'Bengaluru'
  | 'Hyderabad'
  | 'Chennai'
  | 'Kolkata'
  | 'Pune'
  | 'Ahmedabad'
  | string;

export type AgeGroup = '18-25' | '26-35' | '36-45' | '46-60' | '60+' | string;
export type Gender = 'Female' | 'Male' | string;
export type ProductCategory = 'Fresh Produce' | 'Packaged' | 'Dairy' | 'Beverages' | string;
export type RiskTier = 'Healthy' | 'At Risk' | 'Churned';
export type ViewTab = 'overview' | 'churn' | 'segments' | 'explorer';

export interface CustomerRecord {
  customerId: string;
  city: CityName;
  ageGroup: AgeGroup;
  gender: Gender;
  totalOrders: number;
  avgOrderValue: number;
  daysSinceLastOrder: number;
  deliveryRating: number;
  productCategory: ProductCategory;
  appSessionsLast30Days: number;
  promoUsed: boolean;
  churned: boolean;
  lifetimeSpend: number;
  riskTier: RiskTier;
  riskSignals: string[];
}

export interface DashboardFilters {
  city: string;
  ageGroup: string;
  gender: string;
  category: string;
  promo: 'All' | 'Yes' | 'No';
  status: 'All' | 'Active' | 'At Risk' | 'Churned';
  search: string;
}

export interface GroupSummary {
  key: string;
  count: number;
  sharePct: number;
  churnedCount: number;
  atRiskCount: number;
  churnRate: number;
  avgAOV: number;
  avgOrders: number;
  totalGMV: number;
  churnedGMV: number;
  atRiskGMV: number;
  avgRating: number;
  avgDays: number;
  avgSessions: number;
  promoPct: number;
}

export interface BinMetric {
  label: string;
  sublabel?: string;
  count: number;
  churnedCount: number;
  churnRate: number;
  avgGMV: number;
  isDanger?: boolean;
  isWarning?: boolean;
}

export interface StrategicInsight {
  id: string;
  severity: 'critical' | 'warning' | 'opportunity';
  category: string;
  title: string;
  finding: string;
  recommendation: string;
  impactMetric: string;
  filterPatch?: Partial<DashboardFilters>;
  targetTab?: ViewTab;
}

export interface DatasetAnalytics {
  totalCount: number;
  activeCount: number;
  atRiskCount: number;
  churnedCount: number;
  churnRate: number;
  totalGMV: number;
  activeGMV: number;
  atRiskGMV: number;
  churnedGMV: number;
  avgAOV: number;
  avgOrders: number;
  avgRating: number;
  avgDays: number;
  avgSessions: number;
  promoUsagePct: number;
  byCity: GroupSummary[];
  byCategory: GroupSummary[];
  byAge: GroupSummary[];
  byGender: GroupSummary[];
  byPromo: GroupSummary[];
  binsByRating: BinMetric[];
  binsByDays: BinMetric[];
  binsBySessions: BinMetric[];
  binsByOrders: BinMetric[];
  insights: StrategicInsight[];
}

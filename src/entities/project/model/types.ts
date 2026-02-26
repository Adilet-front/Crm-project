export interface ProjectSummary {
  id: string;
  name: string;
  responsiblePmIdentifier: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitabilityPercent: number;
}

export interface ProjectOption {
  id: string;
  name: string;
  responsiblePmIdentifier: string;
}

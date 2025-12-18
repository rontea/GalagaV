
// These types mirror the host application's interfaces to ensure compatibility
// but are kept locally so the plugin can be built and zipped independently.

export type StepStatus = string;

export interface StepVersion {
  id: string;
  content: string;
  status: StepStatus;
  timestamp: number;
  failureReason?: string;
}

export interface CategoryConfig {
  key: string;
  label: string;
  color: string;
}

export interface StatusConfig {
  key: string;
  label: string;
  color: string;
  icon: string;
}

export interface Step {
  id: string;
  title: string;
  category: string;
  status: StepStatus;
  content: string;
  history?: StepVersion[];
  subSteps?: Step[];
  archivedAt?: number;
  notes?: string;
  isTab?: boolean;
  createdAt?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  icon?: string;
  categories?: CategoryConfig[];
  statuses?: StatusConfig[];
  steps: Step[];
  deletedAt?: number;
}

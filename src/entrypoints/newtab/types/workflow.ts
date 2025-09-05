export interface WorkflowStep {
  id: string;
  type: 'click' | 'scroll' | 'input' | 'key_press' | 'navigation';
  timestamp: number;
  url?: string;
  xpath?: string;
  cssSelector?: string;
  elementText?: string;
  value?: string;
  scrollX?: number;
  scrollY?: number;
  description?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  createdAt: number;
  updatedAt: number;
  tags?: string[];
  category?: string;
}

export interface WorkflowGroup {
  id: string;
  name: string;
  workflows: Workflow[];
}

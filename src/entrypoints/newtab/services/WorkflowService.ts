import { Workflow, WorkflowGroup } from '../types/workflow';

const STORAGE_KEY = 'flowcraft-workflows';
const GROUPS_KEY = 'flowcraft-workflow-groups';

export class WorkflowService {
  // 数据读取操作
  static async getAllWorkflows(): Promise<Workflow[]> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      return result[STORAGE_KEY] || [];
    } catch (error) {
      console.error('Failed to load workflows:', error);
      return [];
    }
  }

  static async getWorkflowById(id: string): Promise<Workflow | null> {
    const workflows = await this.getAllWorkflows();
    return workflows.find(w => w.id === id) || null;
  }

  static async getWorkflowsByCategory(category?: string): Promise<Workflow[]> {
    const workflows = await this.getAllWorkflows();
    if (!category) return workflows;
    return workflows.filter(w => w.category === category);
  }

  static async getAllGroups(): Promise<WorkflowGroup[]> {
    try {
      const result = await chrome.storage.local.get(GROUPS_KEY);
      return result[GROUPS_KEY] || [];
    } catch (error) {
      console.error('Failed to load workflow groups:', error);
      return [];
    }
  }

  // 数据操作
  static async saveWorkflow(workflow: Workflow): Promise<void> {
    try {
      const workflows = await this.getAllWorkflows();
      const existingIndex = workflows.findIndex(w => w.id === workflow.id);
      
      if (existingIndex >= 0) {
        workflows[existingIndex] = { ...workflow, updatedAt: Date.now() };
      } else {
        workflows.push({ ...workflow, createdAt: Date.now(), updatedAt: Date.now() });
      }
      
      await chrome.storage.local.set({ [STORAGE_KEY]: workflows });
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw new Error('保存工作流失败');
    }
  }

  static async deleteWorkflow(id: string): Promise<void> {
    try {
      const workflows = await this.getAllWorkflows();
      const filteredWorkflows = workflows.filter(w => w.id !== id);
      await chrome.storage.local.set({ [STORAGE_KEY]: filteredWorkflows });
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      throw new Error('删除工作流失败');
    }
  }

  static async duplicateWorkflow(id: string): Promise<Workflow> {
    const original = await this.getWorkflowById(id);
    if (!original) {
      throw new Error('工作流不存在');
    }

    const duplicated: Workflow = {
      ...original,
      id: this.generateId(),
      name: `${original.name} (副本)`,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await this.saveWorkflow(duplicated);
    return duplicated;
  }

  static async createGroup(name: string): Promise<WorkflowGroup> {
    const groups = await this.getAllGroups();
    const newGroup: WorkflowGroup = {
      id: this.generateId(),
      name,
      workflows: []
    };
    
    groups.push(newGroup);
    await chrome.storage.local.set({ [GROUPS_KEY]: groups });
    return newGroup;
  }

  static async deleteGroup(id: string): Promise<void> {
    try {
      const groups = await this.getAllGroups();
      const filteredGroups = groups.filter(g => g.id !== id);
      await chrome.storage.local.set({ [GROUPS_KEY]: filteredGroups });
    } catch (error) {
      console.error('Failed to delete group:', error);
      throw new Error('删除分组失败');
    }
  }

  // 工具方法
  static generateId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async exportWorkflows(): Promise<string> {
    const workflows = await this.getAllWorkflows();
    const groups = await this.getAllGroups();
    return JSON.stringify({ workflows, groups }, null, 2);
  }

  static async importWorkflows(jsonData: string): Promise<void> {
    try {
      const data = JSON.parse(jsonData);
      if (data.workflows) {
        await chrome.storage.local.set({ [STORAGE_KEY]: data.workflows });
      }
      if (data.groups) {
        await chrome.storage.local.set({ [GROUPS_KEY]: data.groups });
      }
    } catch (error) {
      console.error('Failed to import workflows:', error);
      throw new Error('导入工作流失败');
    }
  }
}

import React from 'react';
import { Workflow } from '../types/workflow';

interface WorkflowListProps {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  onSelectWorkflow: (workflow: Workflow) => void;
  onEditWorkflow: (workflow: Workflow) => void;
  onDeleteWorkflow: (id: string) => void;
  onDuplicateWorkflow: (id: string) => void;
}

export function WorkflowList({
  workflows,
  selectedWorkflow,
  onSelectWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onDuplicateWorkflow
}: WorkflowListProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStepTypeIcon = (type: string) => {
    switch (type) {
      case 'click':
        return '👆';
      case 'input':
        return '⌨️';
      case 'scroll':
        return '📜';
      case 'key_press':
        return '🔤';
      case 'navigation':
        return '🌐';
      default:
        return '⚡';
    }
  };

  if (workflows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-card">
        <div className="text-center">
          <div className="text-4xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-foreground mb-2">暂无工作流</h3>
          <p className="text-muted-foreground">点击“新建工作流”开始创建您的第一个工作流</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-card border-r border-border overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border">
        <h3 className="font-medium text-foreground">
          工作流列表 ({workflows.length})
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {workflows.map((workflow) => (
          <div
            key={workflow.id}
            className={`p-4 border-b border-border cursor-pointer hover:bg-muted transition-colors group ${
              selectedWorkflow?.id === workflow.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
            onClick={() => onSelectWorkflow(workflow)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground mb-1 truncate">
                  {workflow.name}
                </h4>
                {workflow.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {workflow.description}
                  </p>
                )}
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground mb-2">
                  <span>{workflow.steps.length} 个步骤</span>
                  <span>{formatDate(workflow.updatedAt)}</span>
                </div>

                {/* 步骤预览 */}
                <div className="flex items-center space-x-1">
                  {workflow.steps.slice(0, 5).map((step, index) => (
                    <span key={index} className="text-xs" title={step.type}>
                      {getStepTypeIcon(step.type)}
                    </span>
                  ))}
                  {workflow.steps.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{workflow.steps.length - 5}</span>
                  )}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col space-y-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditWorkflow(workflow);
                  }}
                  className="p-1 hover:bg-blue-100 hover:text-blue-600 rounded"
                  title="编辑"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateWorkflow(workflow.id);
                  }}
                  className="p-1 hover:bg-green-100 hover:text-green-600 rounded"
                  title="复制"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteWorkflow(workflow.id);
                  }}
                  className="p-1 hover:bg-red-100 hover:text-red-600 rounded"
                  title="删除"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Workflow, WorkflowStep } from '../types/workflow';

interface WorkflowEditorProps {
  workflow: Workflow;
  isEditing: boolean;
  onSave: (workflow: Workflow) => void;
  onCancel: () => void;
  onEdit: () => void;
}

export function WorkflowEditor({
  workflow,
  isEditing,
  onSave,
  onCancel,
  onEdit
}: WorkflowEditorProps) {
  const [editedWorkflow, setEditedWorkflow] = useState<Workflow>(workflow);

  // 调试：输出工作流数据
  useEffect(() => {
    console.log('WorkflowEditor - Received workflow:', workflow);
    console.log('WorkflowEditor - Steps:', workflow.steps);
    if (workflow.steps && workflow.steps.length > 0) {
      console.log('WorkflowEditor - First step:', workflow.steps[0]);
    }
  }, [workflow]);

  useEffect(() => {
    setEditedWorkflow(workflow);
  }, [workflow]);

  const handleSave = () => {
    onSave(editedWorkflow);
  };

  const formatStepType = (type: string) => {
    const typeMap: { [key: string]: string } = {
      'click': '点击',
      'input': '输入',
      'scroll': '滚动',
      'key_press': '按键',
      'navigation': '导航'
    };
    return typeMap[type] || type;
  };

  const getStepIcon = (type: string) => {
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

  const handleDeleteStep = (stepId: string) => {
    setEditedWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }));
  };

  const handleStepUpdate = (stepId: string, field: string, value: string) => {
    setEditedWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { ...step, [field]: value }
          : step
      )
    }));
  };

  const handleRunWorkflow = async () => {
    try {
      // 向 background script 发送运行工作流的消息
      await chrome.runtime.sendMessage({
        type: 'RUN_WORKFLOW',
        workflow: editedWorkflow
      });
    } catch (error) {
      console.error('Failed to run workflow:', error);
    }
  };

  return (
    <div className="flex-1 bg-card overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editedWorkflow.name}
                  onChange={(e) => setEditedWorkflow(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-semibold bg-transparent border-none outline-none text-foreground w-full"
                  placeholder="工作流名称"
                />
                <textarea
                  value={editedWorkflow.description || ''}
                  onChange={(e) => setEditedWorkflow(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="工作流描述..."
                  className="w-full h-20 p-3 bg-muted border border-border rounded-md resize-none text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  {workflow.name}
                </h2>
                {workflow.description && (
                  <p className="text-muted-foreground-foreground">{workflow.description}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 ml-4">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={onCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleRunWorkflow}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  运行
                </button>
                <button
                  onClick={onEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  编辑
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 工作流信息 */}
      <div className="p-6 border-b border-border bg-muted">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">步骤数量:</span>
            <span className="ml-2 font-medium text-foreground">{workflow.steps.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">创建时间:</span>
            <span className="ml-2 font-medium text-foreground">
              {new Date(workflow.createdAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">更新时间:</span>
            <span className="ml-2 font-medium text-foreground">
              {new Date(workflow.updatedAt).toLocaleDateString('zh-CN')}
            </span>
          </div>
        </div>
      </div>

      {/* 步骤列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">执行步骤</h3>
          
          {editedWorkflow.steps.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <h4 className="text-lg font-medium text-foreground mb-2">暂无步骤</h4>
              <p className="text-muted-foreground">录制操作后，步骤会自动显示在这里</p>
            </div>
          ) : (
            <div className="space-y-3">
              {editedWorkflow.steps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-start p-6 bg-gradient-to-r from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md mr-4">
                    {index + 1}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">{getStepIcon(step.type)}</span>
                      <span className="font-medium text-foreground">{formatStepType(step.type)}</span>
                      {step.url && (
                        <span className="ml-3 text-xs text-muted-foreground truncate">
                          {new URL(step.url).hostname}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      {/* XPath 字段 */}
                      {(step.xpath || isEditing) && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">XPath</span>
                          {isEditing ? (
                            <textarea
                              value={step.xpath || ''}
                              onChange={(e) => handleStepUpdate(step.id, 'xpath', e.target.value)}
                              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-border rounded-md text-xs font-mono text-slate-700 dark:text-slate-300 resize-none"
                              rows={2}
                              placeholder="请输入 XPath"
                            />
                          ) : (
                            <code className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-border rounded-md text-xs font-mono text-slate-700 dark:text-slate-300 break-all">
                              {step.xpath}
                            </code>
                          )}
                        </div>
                      )}
                      
                      {/* CSS Selector 字段 */}
                      {(step.cssSelector || isEditing) && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CSS Selector</span>
                          {isEditing ? (
                            <textarea
                              value={step.cssSelector || ''}
                              onChange={(e) => handleStepUpdate(step.id, 'cssSelector', e.target.value)}
                              className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-mono text-emerald-700 dark:text-emerald-300 resize-none"
                              rows={2}
                              placeholder="请输入 CSS Selector"
                            />
                          ) : (
                            <code className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md text-xs font-mono text-emerald-700 dark:text-emerald-300 break-all">
                              {step.cssSelector}
                            </code>
                          )}
                        </div>
                      )}
                      
                      {/* 元素文本字段 */}
                      {(step.elementText || (step as any).elementTag || isEditing) && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">元素文本</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={step.elementText || (step as any).elementTag || ''}
                              onChange={(e) => handleStepUpdate(step.id, 'elementText', e.target.value)}
                              className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300"
                              placeholder="元素文本"
                            />
                          ) : (
                            <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md text-sm text-blue-700 dark:text-blue-300">
                              {step.elementText || (step as any).elementTag || '无文本'}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 输入值字段 */}
                      {(step.value || isEditing) && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">输入值</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={step.value || ''}
                              onChange={(e) => handleStepUpdate(step.id, 'value', e.target.value)}
                              className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-300 font-medium"
                              placeholder="输入值"
                            />
                          ) : (
                            <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md text-sm text-amber-700 dark:text-amber-300 font-medium">
                              "{step.value}"
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* 滚动位置字段 */}
                      {step.scrollX !== undefined && step.scrollY !== undefined && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">滚动位置</span>
                          {isEditing ? (
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">X:</label>
                                <input
                                  type="number"
                                  value={step.scrollX}
                                  onChange={(e) => handleStepUpdate(step.id, 'scrollX', e.target.value)}
                                  className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded text-sm text-purple-700 dark:text-purple-300"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-xs text-muted-foreground">Y:</label>
                                <input
                                  type="number"
                                  value={step.scrollY}
                                  onChange={(e) => handleStepUpdate(step.id, 'scrollY', e.target.value)}
                                  className="w-full px-2 py-1 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded text-sm text-purple-700 dark:text-purple-300"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-md text-sm text-purple-700 dark:text-purple-300">
                              <span>X: <strong>{step.scrollX}</strong></span>
                              <span>Y: <strong>{step.scrollY}</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Frame URL 字段 */}
                      {(step as any).frameUrl && (step as any).frameUrl !== step.url && (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Frame URL</span>
                          {isEditing ? (
                            <input
                              type="url"
                              value={(step as any).frameUrl}
                              onChange={(e) => handleStepUpdate(step.id, 'frameUrl', e.target.value)}
                              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-border rounded-md text-xs font-mono text-slate-600 dark:text-slate-400"
                              placeholder="Frame URL"
                            />
                          ) : (
                            <code className="px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-border rounded-md text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
                              {(step as any).frameUrl}
                            </code>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isEditing && (
                    <button
                      onClick={() => handleDeleteStep(step.id)}
                      className="flex-shrink-0 p-1 ml-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="删除步骤"
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

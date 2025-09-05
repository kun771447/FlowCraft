import React, { useState, useEffect, useMemo } from "react";
import { Workflow } from "../../../lib/workflow-types";
import { useWorkflow } from "../context/workflow-provider";

interface WorkflowManagerViewProps {}

interface StoredWorkflow extends Workflow {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export const WorkflowManagerView: React.FC<WorkflowManagerViewProps> = () => {
  const [workflows, setWorkflows] = useState<StoredWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const { startRecording, setSelectedWorkflow } = useWorkflow();

  // 加载已保存的工作流
  useEffect(() => {
    const loadWorkflows = async () => {
      try {
        setIsLoading(true);
        if (!chrome?.storage?.local) {
          console.error('Chrome storage API not available');
          return;
        }

        const result = await chrome.storage.local.get('flowcraft-workflows');
        const savedWorkflows = result['flowcraft-workflows'] || [];
        setWorkflows(savedWorkflows);
        
        // 自动选择第一个工作流
        if (savedWorkflows.length > 0 && !selectedWorkflowId) {
          setSelectedWorkflowId(savedWorkflows[0].id);
          setSelectedWorkflow(savedWorkflows[0]);
        }
      } catch (error) {
        console.error('Failed to load workflows:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkflows();
  }, [selectedWorkflowId]);

  // 过滤工作流
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) {
      return workflows;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return workflows.filter(workflow => 
      workflow.name.toLowerCase().includes(query) ||
      workflow.description.toLowerCase().includes(query)
    );
  }, [workflows, searchQuery]);

  // 获取选中的工作流
  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  // 删除工作流
  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('确定要删除这个工作流吗？此操作无法撤销。')) {
      return;
    }

    try {
      if (!chrome?.storage?.local) {
        console.error('Chrome storage API not available');
        return;
      }

      const result = await chrome.storage.local.get('flowcraft-workflows');
      const savedWorkflows = result['flowcraft-workflows'] || [];
      const updatedWorkflows = savedWorkflows.filter((w: StoredWorkflow) => w.id !== workflowId);
      
      await chrome.storage.local.set({ 'flowcraft-workflows': updatedWorkflows });
      setWorkflows(updatedWorkflows);
      
      // 如果删除的是当前选中的工作流，清除选中状态
      if (selectedWorkflowId === workflowId) {
        setSelectedWorkflowId(null);
        setSelectedWorkflow(null);
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      alert('删除失败，请稍后重试');
    }
  };

  // 开始编辑工作流
  const handleStartEdit = (workflow: StoredWorkflow) => {
    setEditingName(workflow.name || "");
    setEditingDescription(workflow.description || "");
    setIsEditing(true);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!selectedWorkflow) return;

    try {
      const result = await chrome.storage.local.get('flowcraft-workflows');
      const savedWorkflows = result['flowcraft-workflows'] || [];
      
      const updatedWorkflows = savedWorkflows.map((w: StoredWorkflow) => {
        if (w.id === selectedWorkflow.id) {
          return {
            ...w,
            name: editingName.trim() || w.name,
            description: editingDescription.trim() || w.description,
            updatedAt: Date.now(),
          };
        }
        return w;
      });

      await chrome.storage.local.set({ 'flowcraft-workflows': updatedWorkflows });
      setWorkflows(updatedWorkflows);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update workflow:', error);
      alert('保存失败，请稍后重试');
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingName("");
    setEditingDescription("");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-violet-50/30 dark:from-slate-900 dark:to-violet-950/30">
      {/* 搜索区 */}
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="relative">
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
          <input
            type="text"
            placeholder="搜索工作流..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 sm:py-3 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>
      </div>

      {/* 工作流列表 - 最多显示3个，支持滑动 */}
      <div className="flex-none bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              工作流列表
            </h3>
            <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
              {filteredWorkflows.length} 个
            </span>
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto px-3 sm:px-4 pb-4">
          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                {workflows.length === 0 ? '暂无工作流' : '无匹配结果'}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {workflows.length === 0 ? '开始录制您的第一个工作流' : '试试其他搜索关键词'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkflows.slice(0, 3).map((workflow) => (
                <div
                  key={workflow.id}
                  onClick={() => {
                    setSelectedWorkflowId(workflow.id);
                    setSelectedWorkflow(workflow);
                  }}
                  className={`group border rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-200 min-h-[60px] sm:min-h-[80px] ${
                    selectedWorkflowId === workflow.id
                      ? 'border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 dark:border-violet-500 shadow-md'
                      : 'border-slate-200/80 bg-white dark:bg-slate-700/50 dark:border-slate-600/80 hover:border-violet-200 dark:hover:border-violet-600/50 hover:bg-gradient-to-br hover:from-slate-50 hover:to-violet-50/30 dark:hover:from-slate-700 dark:hover:to-violet-900/10 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {workflow.name || "未命名工作流"}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {workflow.description || "无描述"}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          <span>{workflow.steps?.length || 0} 步骤</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatDate(workflow.createdAt)}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorkflow(workflow.id);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="删除工作流"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* 如果有更多工作流，显示滚动提示 */}
              {filteredWorkflows.length > 3 && (
                <div className="text-center py-2 text-xs text-slate-500 dark:text-slate-400">
                  还有 {filteredWorkflows.length - 3} 个工作流，向上滚动查看
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 工作流详情 */}
      <div className="flex-1 bg-white dark:bg-slate-800">
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-white to-violet-50/50 dark:from-slate-800 dark:to-violet-900/10">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">
              工作流详情
            </h3>
          </div>
        </div>
        
        <div className="p-3 sm:p-4">
          {selectedWorkflow ? (
            <div className="space-y-3 sm:space-y-4">
              {/* 基本信息 */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-600">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            工作流名称
                          </label>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                            placeholder="输入工作流名称"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            描述
                          </label>
                          <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
                            placeholder="输入工作流描述"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={handleSaveEdit}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>保存</span>
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 bg-slate-500 hover:bg-slate-600 text-white text-xs px-3 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>取消</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          {selectedWorkflow.name || "未命名工作流"}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          {selectedWorkflow.description || "无描述"}
                        </p>
                      </>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => handleStartEdit(selectedWorkflow)}
                      className="ml-2 p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
                      title="编辑工作流信息"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {!isEditing && (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">步骤数量：</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{selectedWorkflow.steps?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">版本：</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{selectedWorkflow.version || "1.0.0"}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">创建时间：</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{formatDate(selectedWorkflow.createdAt)}</span>
                    </div>
                    <div className="hidden sm:block">
                      <span className="text-slate-500">更新时间：</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">{formatDate(selectedWorkflow.updatedAt)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 步骤列表 */}
              {selectedWorkflow.steps && selectedWorkflow.steps.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-600">
                  <h5 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">步骤预览</h5>
                  <div className="max-h-28 sm:max-h-32 overflow-y-auto space-y-2">
                    {selectedWorkflow.steps.slice(0, 5).map((step, index) => (
                      <div key={index} className="text-xs p-2 bg-white dark:bg-slate-600 rounded-lg border border-slate-200 dark:border-slate-500">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {index + 1}. 
                        </span>
                        <span className="ml-1 text-slate-800 dark:text-slate-200">
                          {step.type === 'click' && `点击 ${(step as any).elementTag}`}
                          {step.type === 'input' && `输入到 ${(step as any).elementTag}`}
                          {step.type === 'navigation' && `导航到 ${step.url}`}
                          {step.type === 'key_press' && `按键 ${(step as any).key}`}
                          {step.type === 'scroll' && '滚动页面'}
                        </span>
                      </div>
                    ))}
                    {selectedWorkflow.steps.length > 5 && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 text-center py-1">
                        还有 {selectedWorkflow.steps.length - 5} 个步骤...
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">选择工作流</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">点击上方工作流查看详细信息</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

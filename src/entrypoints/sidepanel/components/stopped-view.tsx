import React, { useState, useEffect, useMemo } from "react";
import { useWorkflow } from "../context/workflow-provider";
import { EventViewer } from "./event-viewer";
import { Workflow } from "../../../lib/workflow-types";

interface StoredWorkflow extends Workflow {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export const StoppedView: React.FC = () => {
  const { workflow } = useWorkflow();
  const [searchQuery, setSearchQuery] = useState("");
  const [savedWorkflows, setSavedWorkflows] = useState<StoredWorkflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);

  // 加载已保存的工作流
  useEffect(() => {
    const loadSavedWorkflows = async () => {
      try {
        if (!chrome?.storage?.local) {
          return;
        }
        const result = await chrome.storage.local.get('flowcraft-workflows');
        const workflows = result['flowcraft-workflows'] || [];
        setSavedWorkflows(workflows);
      } catch (error) {
        console.error('Failed to load saved workflows:', error);
      }
    };

    loadSavedWorkflows();
  }, []);

  // 过滤工作流
  const filteredWorkflows = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedWorkflows;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return savedWorkflows.filter(workflow => 
      workflow.name.toLowerCase().includes(query) ||
      workflow.description.toLowerCase().includes(query)
    );
  }, [savedWorkflows, searchQuery]);

  // 格式化时间
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
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
      const workflows = result['flowcraft-workflows'] || [];
      const updatedWorkflows = workflows.filter((w: StoredWorkflow) => w.id !== workflowId);
      
      await chrome.storage.local.set({ 'flowcraft-workflows': updatedWorkflows });
      setSavedWorkflows(updatedWorkflows);
      
      // 如果删除的是当前选中的工作流，清除选中状态
      if (selectedWorkflowId === workflowId) {
        setSelectedWorkflowId(null);
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
      alert('删除失败，请稍后重试');
    }
  };


  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* 状态提示区 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-green-200 dark:border-green-700 p-3 sm:p-4">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-green-800 dark:text-green-200">
              录制完成
            </h3>
            <p className="text-xs sm:text-sm text-green-600 dark:text-green-300">
              工作流已录制完成，包含 {workflow?.steps?.length || 0} 个步骤。使用顶部按钮进行保存、回放或导出操作。
            </p>
          </div>
        </div>
      </div>
      
      {/* 工作流管理区 */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">工作流管理</h3>
          </div>
          
          {/* 搜索框 */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="搜索已保存的工作流..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 dark:border-slate-600 rounded-xl leading-5 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          {/* 工作流列表 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                已保存的工作流
              </span>
              <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                {filteredWorkflows.length} 个
              </span>
            </div>
            
            {filteredWorkflows.length === 0 ? (
              <div className="text-center py-8">
                <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {savedWorkflows.length === 0 ? '暂无工作流' : '无匹配结果'}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {savedWorkflows.length === 0 ? '保存您的第一个工作流开始使用' : '试试其他搜索关键词'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredWorkflows.slice(0, 3).map((savedWorkflow) => (
                  <div
                    key={savedWorkflow.id}
                    className={`group bg-slate-50 dark:bg-slate-700/50 border rounded-xl p-4 transition-all duration-200 cursor-pointer ${
                      selectedWorkflowId === savedWorkflow.id
                        ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-white dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setSelectedWorkflowId(
                      selectedWorkflowId === savedWorkflow.id ? null : savedWorkflow.id
                    )}
                  >
                    <div className="flex items-start justify-between min-h-[60px]">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {savedWorkflow.name || "未命名工作流"}
                        </h4>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <span>{savedWorkflow.steps?.length || 0} 步骤</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{formatDate(savedWorkflow.createdAt)}</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* 操作按钮 */}
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(savedWorkflow.id);
                          }}
                          className="p-2 text-red-500 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="删除工作流"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    {/* 展开的描述信息 */}
                    {selectedWorkflowId === savedWorkflow.id && savedWorkflow.description && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {savedWorkflow.description}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredWorkflows.length > 3 && (
                  <div className="text-center py-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      还有 {filteredWorkflows.length - 3} 个工作流，请使用搜索功能查找
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 录制详情区 */}
      <div className="flex-grow overflow-hidden bg-white dark:bg-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">录制详情</h3>
          </div>
        </div>
        <div className="p-4 h-full overflow-hidden">
          <EventViewer />
        </div>
      </div>
    </div>
  );
};

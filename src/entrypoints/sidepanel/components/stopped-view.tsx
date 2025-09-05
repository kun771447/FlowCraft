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
  const { discardAndStartNew, workflow } = useWorkflow();
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

  // 运行工作流
  const handleRunWorkflow = (workflow: StoredWorkflow) => {
    chrome.runtime.sendMessage(
      {
        type: "START_PLAYBACK",
        payload: { workflow },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error starting playback:", chrome.runtime.lastError);
        } else if (response.success) {
          console.log("Playback started successfully");
        } else {
          console.error("Playback failed:", response.error);
        }
      }
    );
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

  const downloadJson = () => {
    if (!workflow) return;

    // Sanitize workflow name for filename
    const safeName = workflow.name
      ? workflow.name.replace(/[^a-z0-9\.\-\_]/gi, "_").toLowerCase()
      : "workflow";

    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Generate filename e.g., my_workflow_name_2023-10-27_10-30-00.json
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    // Use sanitized name instead of domain
    a.download = `${safeName}_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startPlayback = () => {
    if (!workflow) return;

    chrome.runtime.sendMessage(
      {
        type: "START_PLAYBACK",
        payload: { workflow },
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error starting playback:", chrome.runtime.lastError);
        } else if (response.success) {
          console.log("Playback started successfully");
        } else {
          console.error("Playback failed:", response.error);
        }
      }
    );
  };

  const saveToManager = async () => {
    if (!workflow) return;

    try {
      // 检查 chrome.storage 是否可用
      if (!chrome?.storage?.local) {
        console.error('Chrome storage API not available');
        return;
      }

      // 使用 Promise 版本的 chrome.storage API
      const result = await chrome.storage.local.get('flowcraft-workflows');
      const workflows = result['flowcraft-workflows'] || [];
      
      // 创建新的工作流对象
      const newWorkflow = {
        ...workflow,
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      workflows.push(newWorkflow);
      
      await chrome.storage.local.set({ 'flowcraft-workflows': workflows });
      
      // 重新加载工作流列表
      setSavedWorkflows(workflows);
    } catch (error) {
      console.error('Failed to save workflow:', error);
      
      // 降级方案：下载 JSON 文件
      const safeName = workflow.name
        ? workflow.name.replace(/[^a-z0-9\.\-\_]/gi, "_").toLowerCase()
        : "workflow";
      
      const blob = new Blob([JSON.stringify(workflow, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      a.download = `${safeName}_${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert('保存失败，已自动下载 JSON 文件作为备份');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900">
      {/* 操作按钮区 */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="grid grid-cols-2 gap-3">
          {/* 主要操作 */}
          <button
            onClick={saveToManager}
            disabled={!workflow || !workflow.steps || workflow.steps.length === 0}
            className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>保存工作流</span>
          </button>
          
          <button
            onClick={startPlayback}
            disabled={!workflow || !workflow.steps || workflow.steps.length === 0}
            className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white px-4 py-3 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>立即重播</span>
          </button>
          
          {/* 次要操作 */}
          <button
            onClick={discardAndStartNew}
            className="flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-medium transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>重新录制</span>
          </button>
          
          <button
            onClick={downloadJson}
            disabled={!workflow || !workflow.steps || workflow.steps.length === 0}
            className="flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:disabled:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-medium transition-all duration-200 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>导出 JSON</span>
          </button>
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
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRunWorkflow(savedWorkflow);
                          }}
                          className="p-2 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          title="运行工作流"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteWorkflow(savedWorkflow.id);
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
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

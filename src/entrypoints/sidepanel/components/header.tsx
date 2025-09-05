import React from "react";
import { useWorkflow } from "../context/workflow-provider";

export const Header: React.FC = () => {
  const { 
    startRecording, 
    stopRecording, 
    handleReplay, 
    saveWorkflow, 
    workflow, 
    selectedWorkflow,
    recordingStatus 
  } = useWorkflow();
  
  const handleExportJSON = () => {
    // 优先使用选中的工作流，如果没有选中则使用当前录制的工作流
    const workflowToExport = selectedWorkflow || workflow;
    if (!workflowToExport) return;
    
    const blob = new Blob([JSON.stringify(workflowToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowToExport.name || 'workflow'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isRecording = recordingStatus === "recording";
  // 优先使用选中的工作流，如果没有选中则使用当前录制的工作流
  const currentWorkflow = selectedWorkflow || workflow;
  const hasWorkflow = currentWorkflow && currentWorkflow.steps && currentWorkflow.steps.length > 0;

  return (
    <header className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-b border-slate-200/60 dark:border-slate-700/60 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        {/* 左侧标题 */}
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-600 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white">
              FlowCraft
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-0.5">
              {isRecording ? (
                <span className="flex items-center space-x-1 text-red-500 dark:text-red-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span>正在录制中 ({workflow?.steps?.length || 0} 步骤)</span>
                </span>
              ) : selectedWorkflow ? (
                `已选择: ${selectedWorkflow.name || '未命名工作流'} (${selectedWorkflow.steps?.length || 0} 步骤)`
              ) : hasWorkflow ? (
                `当前工作流: ${workflow?.steps?.length || 0} 步骤`
              ) : (
                "工作流自动化工具"
              )}
            </p>
          </div>
        </div>
        
        {/* 右侧操作按钮 */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* 录制按钮 */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="6" />
              </svg>
              <span className="hidden sm:inline">录制</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-1 sm:space-x-2 bg-slate-600 hover:bg-slate-700 text-white text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span className="hidden sm:inline">停止</span>
            </button>
          )}

          {/* 回放按钮 */}
          <button
            onClick={handleReplay}
            disabled={!hasWorkflow}
            className={`flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
              hasWorkflow
                ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span className="hidden sm:inline">回放</span>
          </button>

          {/* 保存按钮 */}
          <button
            onClick={() => saveWorkflow && saveWorkflow()}
            disabled={!hasWorkflow}
            className={`flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
              hasWorkflow
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zM12 19c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-13H7V5h8v1z"/>
            </svg>
            <span className="hidden sm:inline">保存</span>
          </button>

          {/* 导出按钮 */}
          <button
            onClick={handleExportJSON}
            disabled={!hasWorkflow}
            className={`flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
              hasWorkflow
                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">导出</span>
          </button>
        </div>
      </div>

    </header>
  );
};

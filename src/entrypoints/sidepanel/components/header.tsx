import React, { useState } from "react";
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
  
  const [showExportMenu, setShowExportMenu] = useState(false);

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
    setShowExportMenu(false);
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
        <div className="flex items-center space-x-2">
          {/* 录制按钮 */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="6" />
              </svg>
              <span>录制</span>
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 bg-slate-600 hover:bg-slate-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              <span>停止</span>
            </button>
          )}

          {/* 回放按钮 */}
          <button
            onClick={handleReplay}
            disabled={!hasWorkflow}
            className={`flex items-center space-x-2 text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
              hasWorkflow
                ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>回放</span>
          </button>

          {/* 保存按钮 */}
          <button
            onClick={() => saveWorkflow && saveWorkflow()}
            disabled={!hasWorkflow}
            className={`flex items-center space-x-2 text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
              hasWorkflow
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>保存</span>
          </button>

          {/* 导出按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={!hasWorkflow}
              className={`flex items-center space-x-2 text-sm px-4 py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md ${
                hasWorkflow
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>导出</span>
              <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {/* 导出菜单 */}
            {showExportMenu && hasWorkflow && (
              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 py-1 z-50">
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 1H7a2 2 0 00-2 2v16a2 2 0 002 2z" />
                  </svg>
                  <span>导出为 JSON</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 点击外部关闭导出菜单 */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </header>
  );
};

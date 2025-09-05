import React from "react";
import { useWorkflow } from "../context/workflow-provider";
import { EventViewer } from "./event-viewer";

export const RecordingView: React.FC = () => {
  const { workflow } = useWorkflow();
  const stepCount = workflow?.steps?.length || 0;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-red-50 to-rose-50/30 dark:from-red-900/20 dark:to-rose-950/30">
      {/* 录制状态提示区 */}
      <div className="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-b border-red-200 dark:border-red-700 p-3 sm:p-4">
        <div className="flex items-center space-x-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="relative flex h-3 w-3 sm:h-4 sm:w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-full w-full bg-white"></span>
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-red-800 dark:text-red-200">
              正在录制
            </h3>
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-300">
              已录制 {stepCount} 个步骤。完成后请使用顶部的停止按钮结束录制。
            </p>
          </div>
        </div>
      </div>
      
      {/* 录制详情区 */}
      <div className="flex-grow overflow-hidden bg-white dark:bg-slate-800">
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100">实时录制详情</h3>
          </div>
        </div>
        <div className="p-3 sm:p-4 h-full overflow-hidden">
          <EventViewer />
        </div>
      </div>
    </div>
  );
};

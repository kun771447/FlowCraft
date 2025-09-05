import React from "react";

export const Header: React.FC = () => {
  const openWorkflowManager = () => {
    try {
      if (chrome?.tabs?.create && chrome?.runtime?.getURL) {
        // 修正路径：生成的文件是 newtab.html，不是 newtab/index.html
        chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
      } else {
        // 降级方案：在当前标签页打开
        const url = chrome?.runtime?.getURL ? 
          chrome.runtime.getURL('newtab.html') : 
          'newtab.html';
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open workflow manager:', error);
      // 最后的降级方案
      window.open('newtab.html', '_blank');
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">F</span>
          </div>
          <h1 className="text-sm font-semibold text-gray-900 dark:text-white">
            FlowCraft
          </h1>
        </div>
        
        <button
          onClick={openWorkflowManager}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
          title="打开工作流管理器"
        >
          <svg 
            className="w-3 h-3 mr-1.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
            />
          </svg>
          管理器
        </button>
      </div>
    </header>
  );
};

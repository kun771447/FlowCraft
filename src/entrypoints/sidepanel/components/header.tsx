import React from "react";

export const Header: React.FC = () => {
  // 移除跳转逻辑

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
        
      </div>
    </header>
  );
};

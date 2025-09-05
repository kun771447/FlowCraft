import React, { useState } from 'react';
import { WorkflowGroup } from '../types/workflow';

interface SidebarProps {
  groups: WorkflowGroup[];
  selectedGroupId: string;
  onSelectGroup: (groupId: string) => void;
  onCreateGroup: (name: string) => void;
  onDeleteGroup: (groupId: string) => void;
}

export function Sidebar({ 
  groups, 
  selectedGroupId, 
  onSelectGroup, 
  onCreateGroup, 
  onDeleteGroup 
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      onCreateGroup(newGroupName.trim());
      setNewGroupName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="w-40 bg-muted border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-medium text-foreground mb-3">分组</h2>
        
        {/* 全部工作流 */}
        <button
          onClick={() => onSelectGroup('all')}
          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
            selectedGroupId === 'all'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
              : 'text-secondary hover:bg-muted'
          }`}
        >
          全部工作流
        </button>
      </div>

      <div className="flex-1 p-4">
        {/* 分组列表 */}
        <div className="space-y-1">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center group">
              <button
                onClick={() => onSelectGroup(group.id)}
                className={`flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedGroupId === group.id
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-secondary hover:bg-muted'
                }`}
              >
                {group.name}
              </button>
              <button
                onClick={() => onDeleteGroup(group.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all"
                title="删除分组"
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
          ))}
        </div>

        {/* 新建分组 */}
        <div className="mt-4">
          {isCreating ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="分组名称"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroup();
                  if (e.key === 'Escape') {
                    setIsCreating(false);
                    setNewGroupName('');
                  }
                }}
                className="w-full px-2 py-1 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex space-x-1">
                <button
                  onClick={handleCreateGroup}
                  className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  确定
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewGroupName('');
                  }}
                  className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full px-3 py-2 text-sm text-muted-foreground border border-dashed border-border rounded-md hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + 新建分组
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

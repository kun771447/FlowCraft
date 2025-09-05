import React, { useState, useEffect } from 'react';
import { Workflow, WorkflowGroup } from '../types/workflow';
import { WorkflowService } from '../services/WorkflowService';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { WorkflowList } from './WorkflowList';
import { WorkflowEditor } from './WorkflowEditor';

export function WorkflowManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [groups, setGroups] = useState<WorkflowGroup[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 数据加载
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workflowsData, groupsData] = await Promise.all([
        WorkflowService.getAllWorkflows(),
        WorkflowService.getAllGroups()
      ]);
      setWorkflows(workflowsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 过滤工作流
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = !searchQuery || 
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGroup = selectedGroupId === 'all' || workflow.category === selectedGroupId;
    
    return matchesSearch && matchesGroup;
  });

  // 工作流操作
  const handleSaveWorkflow = async (workflow: Workflow) => {
    try {
      await WorkflowService.saveWorkflow(workflow);
      await loadData();
      setIsEditing(false);
      setSelectedWorkflow(workflow);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('确定要删除这个工作流吗？')) return;
    
    try {
      await WorkflowService.deleteWorkflow(id);
      await loadData();
      if (selectedWorkflow?.id === id) {
        setSelectedWorkflow(null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleDuplicateWorkflow = async (id: string) => {
    try {
      const duplicated = await WorkflowService.duplicateWorkflow(id);
      await loadData();
      setSelectedWorkflow(duplicated);
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
    }
  };

  const handleCreateNew = () => {
    const newWorkflow: Workflow = {
      id: WorkflowService.generateId(),
      name: '新工作流',
      description: '',
      steps: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category: selectedGroupId === 'all' ? undefined : selectedGroupId
    };
    setSelectedWorkflow(newWorkflow);
    setIsEditing(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCreateNew={handleCreateNew}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          groups={groups}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
          onCreateGroup={async (name) => {
            await WorkflowService.createGroup(name);
            await loadData();
          }}
          onDeleteGroup={async (id) => {
            if (confirm('确定要删除这个分组吗？')) {
              await WorkflowService.deleteGroup(id);
              await loadData();
              if (selectedGroupId === id) {
                setSelectedGroupId('all');
              }
            }
          }}
        />
        
        <div className="flex-1 flex">
          <WorkflowList
            workflows={filteredWorkflows}
            selectedWorkflow={selectedWorkflow}
            onSelectWorkflow={setSelectedWorkflow}
            onEditWorkflow={(workflow) => {
              setSelectedWorkflow(workflow);
              setIsEditing(true);
            }}
            onDeleteWorkflow={handleDeleteWorkflow}
            onDuplicateWorkflow={handleDuplicateWorkflow}
          />
          
          {selectedWorkflow && (
            <WorkflowEditor
              workflow={selectedWorkflow}
              isEditing={isEditing}
              onSave={handleSaveWorkflow}
              onCancel={() => {
                setIsEditing(false);
                if (!workflows.find(w => w.id === selectedWorkflow.id)) {
                  setSelectedWorkflow(null);
                }
              }}
              onEdit={() => setIsEditing(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { useWorkflow } from "../context/workflow-provider";
import { Button } from "./button";
import { EventViewer } from "./event-viewer";

export const StoppedView: React.FC = () => {
  const { discardAndStartNew, workflow } = useWorkflow();

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
      
      // 打开工作流管理器
      if (chrome?.tabs?.create) {
        chrome.tabs.create({ url: chrome.runtime.getURL('newtab.html') });
      } else {
        console.log('Workflow saved successfully. Please open the workflow manager manually.');
      }
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
    <div className="flex flex-col h-full">
      <div className="flex flex-col justify-between p-4 border-b border-border gap-2">
        <h2 className="text-lg font-semibold">Recording Finished</h2>
        <div className="space-y-2">
          {/* 主要操作按钮 */}
          <div className="space-x-2">
            <Button
              size="sm"
              onClick={saveToManager}
              disabled={
                !workflow || !workflow.steps || workflow.steps.length === 0
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              保存到管理器
            </Button>
            <Button
              size="sm"
              onClick={startPlayback}
              disabled={
                !workflow || !workflow.steps || workflow.steps.length === 0
              }
            >
              立即重播
            </Button>
          </div>
          
          {/* 次要操作按钮 */}
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={discardAndStartNew}>
              丢弃并重新录制
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadJson}
              disabled={
                !workflow || !workflow.steps || workflow.steps.length === 0
              }
            >
              下载 JSON
            </Button>
          </div>
        </div>
      </div>
      <div className="flex-grow overflow-hidden p-4">
        <EventViewer />
      </div>
    </div>
  );
};

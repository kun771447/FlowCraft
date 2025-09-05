import React from "react";
import ReactDOM from "react-dom/client";

// import vite tailwind css
import "@/assets/tailwind.css";

import { ErrorView } from "./components/error-view";
import { Header } from "./components/header";
import { InitialView } from "./components/initial-view";
import { LoadingView } from "./components/logina-view";
import { RecordingView } from "./components/recording-view";
import { StoppedView } from "./components/stopped-view";
import { WorkflowManagerView } from "./components/workflow-manager-view";
import { WorkflowProvider, useWorkflow } from "./context/workflow-provider";

const AppContent: React.FC = () => {
  const { recordingStatus, isLoading, error } = useWorkflow();

  // 默认显示工作流管理界面
  // 只有在录制或处理录制结果时才切换到对应视图
  if (isLoading) {
    return <LoadingView />;
  }

  if (error) {
    return <ErrorView />;
  }

  // 只在录制过程中显示录制相关界面
  switch (recordingStatus) {
    case "recording":
      return <RecordingView />;
    case "stopped":
      return <StoppedView />;
    case "idle":
    default:
      // 默认显示工作流管理界面
      return <WorkflowManagerView />;
  }
};

const SidepanelApp: React.FC = () => {
  return (
    <React.StrictMode>
      <WorkflowProvider>
        <div className="h-screen flex flex-col">
          <Header />
          <main className="flex-grow overflow-auto">
            <AppContent />
          </main>
        </div>
      </WorkflowProvider>
    </React.StrictMode>
  );
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = ReactDOM.createRoot(rootElement);
root.render(<SidepanelApp />);

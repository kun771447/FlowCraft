import React from "react";
import ReactDOM from "react-dom/client";

// import vite tailwind css
import "@/assets/tailwind.css";

import { WorkflowProvider, useWorkflow } from "./context/workflow-provider";

const AppContent: React.FC = () => {
  const { recordingStatus, isLoading, error, startRecording, stopRecording } =
    useWorkflow();

  const handleClick = () => {
    if (isLoading) {
      startRecording();
    } else {
      stopRecording();
    }
  };
  return (
    <>
      <button onClick={handleClick} className="m-[20px]">
        {isLoading ? "Stop Recording" : "Start Recording"}
      </button>
    </>
  );
};

const SidepanelApp: React.FC = () => {
  return (
    <React.StrictMode>
      <WorkflowProvider>
        <div className="h-screen flex flex-col">
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

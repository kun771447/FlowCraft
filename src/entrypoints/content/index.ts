import {
  handleCustomClick,
  handleInput,
  handleKeydown,
  handleScroll,
} from "./record-action";
import {
  handleMouseOver,
  handleMouseOut,
  handleFocus,
  handleBlur,
} from "./interactive-action";

import { throttle } from "./util";

const throttleScroll = throttle(handleScroll, 100);


let isRecordingActive = false;

// 启动录制器函数
function startRecorder() {
  if (isRecordingActive) return;

  isRecordingActive = true;

  document.addEventListener("click", handleCustomClick, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("scroll", throttleScroll, true);

  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("focus", handleFocus, true);
  document.addEventListener("blur", handleBlur, true);
}

// 停止录制器函数
function stopRecorder() {
  isRecordingActive = false;

  // 移除所有自定义事件监听器
  document.removeEventListener("click", handleCustomClick, true);
  document.removeEventListener("input", handleInput, true);
  document.removeEventListener("keydown", handleKeydown, true);
  document.removeEventListener("scroll", throttleScroll, true);

  document.removeEventListener("mouseover", handleMouseOver, true);
  document.removeEventListener("mouseout", handleMouseOut, true);
  document.removeEventListener("focus", handleFocus, true);
  document.removeEventListener("blur", handleBlur, true);
}

// 导出默认的内容脚本配置
export default defineContentScript({
  matches: ["<all_urls>"], // 匹配所有URL
  main(ctx) {
    // Listener for status updates from the background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "SET_RECORDING_STATUS") {
        const shouldBeRecording = message.payload;
        if (shouldBeRecording && !isRecordingActive) {
          startRecorder();
        } else if (!shouldBeRecording && isRecordingActive) {
          stopRecorder();
        }
      }
      // If needed, handle other message types here
    });

    // Request initial status when the script loads
    chrome.runtime.sendMessage(
      { type: "REQUEST_RECORDING_STATUS" },
      (response) => {
        if (chrome.runtime.lastError) {
          // Handle error - maybe default to not recording?
          return;
        }
        if (response && response.isRecordingEnabled) {
          startRecorder();
        } else {
          // Ensure recorder is stopped if it somehow started
          stopRecorder();
        }
      }
    );

    // 页面卸载时清理录制器
    window.addEventListener("beforeunload", () => {
      // 移除所有永久监听器
      stopRecorder();
    });
  },
});

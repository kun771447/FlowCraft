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

// 启动录制器函数
function startRecorder() {
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
    // 监听来自后台脚本的状态更新
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 设置录制状态的消息类型
      if (message.type === "SET_RECORDING_STATUS") {
        startRecorder();
      }
    });

    // 页面卸载时清理录制器
    window.addEventListener("beforeunload", () => {
      // 移除所有永久监听器
      stopRecorder();
    });
  },
});

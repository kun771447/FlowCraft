import { recording } from "./record";
import { replay } from "./replay";

export default defineBackground(() => {
  let currentTabId: number | null = null; // 当前回放所在的标签页ID

  // 监听标签页激活事件 (实时更新)
  chrome.tabs.onActivated.addListener((activeInfo) => {
    currentTabId = activeInfo.tabId;
  });

  recording();
  replay(currentTabId);
});

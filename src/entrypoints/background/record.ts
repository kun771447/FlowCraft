// 导入所需的类型定义
import { EventType, IncrementalSource } from "@rrweb/types";
import {
  StoredCustomClickEvent,
  StoredCustomInputEvent,
  StoredCustomKeyEvent,
  StoredEvent,
  StoredRrwebEvent,
} from "../../lib/types";
import {
  ClickStep,
  InputStep,
  KeyPressStep,
  NavigationStep,
  ScrollStep,
  Step,
  Workflow,
} from "../../lib/workflow-types";
import {
  HttpRecordingStartedEvent,
  HttpRecordingStoppedEvent,
  HttpWorkflowUpdateEvent,
} from "../../lib/message-bus-types";

export const recording = () => {
    // 用于存储按标签页ID索引的rrweb事件的内存存储
    const sessionLogs: { [tabId: number]: StoredEvent[] } = {};
  
    // 存储标签页信息(URL和标题)
    const tabInfo: { [tabId: number]: { url?: string; title?: string } } = {};
  
    // 记录状态标志,默认启用
    let isRecordingEnabled = true;
    // 缓存最后一次记录的工作流哈希值
    let lastWorkflowHash: string | null = null;
  
    // 使用SubtleCrypto计算SHA-256哈希值的函数
    async function calculateSHA256(str: string): Promise<string> {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hashHex;
    }

    // 向控制台总线广播工作流数据更新的函数
    async function broadcastWorkflowDataUpdate(): Promise<Workflow> {
      // 获取所有标签页的事件,转换为步骤并按时间排序
      const allSteps: Step[] = Object.keys(sessionLogs)
        .flatMap((tabIdStr) => {
          const tabId = parseInt(tabIdStr, 10);
          return convertStoredEventsToSteps(sessionLogs[tabId] || []);
        })
        .sort((a, b) => a.timestamp - b.timestamp);
  
      // 创建工作流数据对象
      const workflowData: Workflow = {
        name: "Recorded Workflow",
        description: `Recorded on ${new Date().toLocaleString()}`,
        version: "1.0.0",
        input_schema: [],
        steps: allSteps,
      };
  
      // 计算步骤的哈希值
      const allStepsString = JSON.stringify(allSteps);
      const currentWorkflowHash = await calculateSHA256(allStepsString);
  
      // 如果哈希值未变,跳过更新
      if (lastWorkflowHash !== null && currentWorkflowHash === lastWorkflowHash) {
        return workflowData;
      }
  
      lastWorkflowHash = currentWorkflowHash;
  
      return workflowData;
    }
  
    // 向所有内容脚本和侧边栏广播录制状态的函数
    function broadcastRecordingStatus() {
      const statusString = isRecordingEnabled ? "recording" : "stopped";
      // 向所有标签页广播
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
          if (tab.id) {
            chrome.tabs
              .sendMessage(tab.id, {
                type: "SET_RECORDING_STATUS",
                payload: isRecordingEnabled,
              })
              .catch((err: Error) => {
                // 发送失败时可选择记录日志
              });
          }
        });
      });
      // 向侧边栏广播
      chrome.runtime
        .sendMessage({
          type: "recording_status_updated",
          payload: { status: statusString },
        })
        .catch((err) => {
          // 发送失败时可选择记录日志
        });
    }
  
    // --- 标签页事件监听器 ---
  
    // 发送标签页事件的函数(仅在录制启用时)
    function sendTabEvent(type: string, payload: any) {
      if (!isRecordingEnabled) return;
      console.log(`Sending ${type}:`, payload);
      const tabId = payload.tabId;
      if (tabId) {
        if (!sessionLogs[tabId]) {
          sessionLogs[tabId] = [];
        }
        sessionLogs[tabId].push({
          messageType: type,
          timestamp: Date.now(),
          tabId: tabId,
          ...payload,
        });
        broadcastWorkflowDataUpdate();
      } else {
        console.warn(
          "Tab event received without tabId in payload:",
          type,
          payload
        );
      }
    }
  
    // 监听标签页创建事件
    chrome.tabs.onCreated.addListener((tab) => {
      sendTabEvent("CUSTOM_TAB_CREATED", {
        tabId: tab.id,
        openerTabId: tab.openerTabId,
        url: tab.pendingUrl || tab.url,
        windowId: tab.windowId,
        index: tab.index,
      });
    });
  
    // 监听标签页更新事件
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url || changeInfo.status === "complete") {
        sendTabEvent("CUSTOM_TAB_UPDATED", {
          tabId: tabId,
          changeInfo: changeInfo,
          windowId: tab.windowId,
          url: tab.url,
          title: tab.title,
        });
      }
    });
  
    // 监听标签页激活事件
    chrome.tabs.onActivated.addListener((activeInfo) => {
      sendTabEvent("CUSTOM_TAB_ACTIVATED", {
        tabId: activeInfo.tabId,
        windowId: activeInfo.windowId,
      });
    });
  
    // 监听标签页关闭事件
    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
      sendTabEvent("CUSTOM_TAB_REMOVED", {
        tabId: tabId,
        windowId: removeInfo.windowId,
        isWindowClosing: removeInfo.isWindowClosing,
      });
    });
  
    // --- 事件转换函数 ---
  
    // 将存储的事件转换为步骤的函数
    function convertStoredEventsToSteps(events: StoredEvent[]): Step[] {
      const steps: Step[] = [];
  
      for (const event of events) {
        switch (event.messageType) {
          // 处理点击事件
          case "CUSTOM_CLICK_EVENT": {
            const clickEvent = event as StoredCustomClickEvent;
            if (
              clickEvent.url &&
              clickEvent.frameUrl &&
              clickEvent.xpath &&
              clickEvent.elementTag
            ) {
              const step: ClickStep = {
                type: "click",
                timestamp: clickEvent.timestamp,
                tabId: clickEvent.tabId,
                url: clickEvent.url,
                frameUrl: clickEvent.frameUrl,
                xpath: clickEvent.xpath,
                cssSelector: clickEvent.cssSelector,
                elementTag: clickEvent.elementTag,
                elementText: clickEvent.elementText,
                screenshot: clickEvent.screenshot,
              };
              steps.push(step);
            } else {
              console.warn("Skipping incomplete CUSTOM_CLICK_EVENT:", clickEvent);
            }
            break;
          }
  
          // 处理输入事件
          case "CUSTOM_INPUT_EVENT": {
            const inputEvent = event as StoredCustomInputEvent;
            if (
              inputEvent.url &&
              inputEvent.xpath &&
              inputEvent.elementTag
            ) {
              const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
  
              // 检查是否可以合并输入事件
              if (
                lastStep &&
                lastStep.type === "input" &&
                lastStep.tabId === inputEvent.tabId &&
                lastStep.url === inputEvent.url &&
                lastStep.frameUrl === inputEvent.frameUrl &&
                lastStep.xpath === inputEvent.xpath &&
                lastStep.cssSelector === inputEvent.cssSelector &&
                lastStep.elementTag === inputEvent.elementTag
              ) {
                // 更新最后一个输入步骤
                (lastStep as InputStep).value = inputEvent.value;
                lastStep.timestamp = inputEvent.timestamp;
                (lastStep as InputStep).screenshot = inputEvent.screenshot;
              } else {
                // 添加新的输入步骤
                const newStep: InputStep = {
                  type: "input",
                  timestamp: inputEvent.timestamp,
                  tabId: inputEvent.tabId,
                  url: inputEvent.url,
                  frameUrl: inputEvent.frameUrl,
                  xpath: inputEvent.xpath,
                  cssSelector: inputEvent.cssSelector,
                  elementTag: inputEvent.elementTag,
                  value: inputEvent.value,
                  screenshot: inputEvent.screenshot,
                };
                steps.push(newStep);
              }
            } else {
              console.warn("Skipping incomplete CUSTOM_INPUT_EVENT:", inputEvent);
            }
            break;
          }
  
          // 处理按键事件
          case "CUSTOM_KEY_EVENT": {
            const keyEvent = event as StoredCustomKeyEvent;
            if (keyEvent.url && keyEvent.key) {
              const step: KeyPressStep = {
                type: "key_press",
                timestamp: keyEvent.timestamp,
                tabId: keyEvent.tabId,
                url: keyEvent.url,
                frameUrl: keyEvent.frameUrl,
                key: keyEvent.key,
                xpath: keyEvent.xpath,
                cssSelector: keyEvent.cssSelector,
                elementTag: keyEvent.elementTag,
                screenshot: keyEvent.screenshot,
              };
              steps.push(step);
            } else {
              console.warn("Skipping incomplete CUSTOM_KEY_EVENT:", keyEvent);
            }
            break;
          }
  
          // 处理RRWEB事件
          case "RRWEB_EVENT": {
            const rrEvent = event as StoredRrwebEvent;
            // 处理滚动事件
            if (
              rrEvent.type === EventType.IncrementalSnapshot &&
              rrEvent.data.source === IncrementalSource.Scroll
            ) {
              const scrollData = rrEvent.data as {
                id: number;
                x: number;
                y: number;
              };
              const currentTabInfo = tabInfo[rrEvent.tabId];
  
              // 检查是否可以合并滚动事件
              const lastStep = steps.length > 0 ? steps[steps.length - 1] : null;
              if (
                lastStep &&
                lastStep.type === "scroll" &&
                lastStep.tabId === rrEvent.tabId &&
                (lastStep as ScrollStep).targetId === scrollData.id
              ) {
                // 更新最后一个滚动步骤
                (lastStep as ScrollStep).scrollX = scrollData.x;
                (lastStep as ScrollStep).scrollY = scrollData.y;
                lastStep.timestamp = rrEvent.timestamp;
              } else {
                // 添加新的滚动步骤
                const newStep: ScrollStep = {
                  type: "scroll",
                  timestamp: rrEvent.timestamp,
                  tabId: rrEvent.tabId,
                  targetId: scrollData.id,
                  scrollX: scrollData.x,
                  scrollY: scrollData.y,
                  url: currentTabInfo?.url,
                };
                steps.push(newStep);
              }
            }
            // 处理导航事件
            else if (rrEvent.type === EventType.Meta && rrEvent.data?.href) {
              const metaData = rrEvent.data as { href: string };
              const step: NavigationStep = {
                type: "navigation",
                timestamp: rrEvent.timestamp,
                tabId: rrEvent.tabId,
                url: metaData.href,
              };
              steps.push(step);
            }
            break;
          }
  
          default:
            break;
        }
      }
  
      return steps;
    }
  
    // --- 消息监听器 ---
  
    // 处理来自内容脚本和侧边栏的消息
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      let isAsync = false;
  
      // 处理来自内容脚本的事件
      const customEventTypes = [
        "CUSTOM_CLICK_EVENT",
        "CUSTOM_INPUT_EVENT",
        "CUSTOM_SELECT_EVENT",
        "CUSTOM_KEY_EVENT",
      ];
      if (
        message.type === "RRWEB_EVENT" ||
        customEventTypes.includes(message.type)
      ) {
        if (!isRecordingEnabled) {
          return false;
        }
        if (!sender.tab?.id) {
          console.warn("Received event without tab ID:", message);
          return false;
        }
  
        const tabId = sender.tab.id;
        const isCustomEvent = customEventTypes.includes(message.type);
  
        // 存储事件的函数
        const storeEvent = (eventPayload: any, screenshotDataUrl?: string) => {
          if (!sessionLogs[tabId]) {
            sessionLogs[tabId] = [];
          }
          if (!tabInfo[tabId]) {
            tabInfo[tabId] = {};
          }
          if (sender.tab?.url && !tabInfo[tabId].url) {
            tabInfo[tabId].url = sender.tab.url;
          }
          if (sender.tab?.title && !tabInfo[tabId].title) {
            tabInfo[tabId].title = sender.tab.title;
          }
  
          const eventWithMeta = {
            ...eventPayload,
            tabId: tabId,
            messageType: message.type,
            screenshot: screenshotDataUrl,
          };
          sessionLogs[tabId].push(eventWithMeta);
          broadcastWorkflowDataUpdate();
        };
  
        if (message.type === "RRWEB_EVENT") {
          storeEvent(message.payload);
        } else if (isCustomEvent) {
          console.warn(
            "Storing custom event without screenshot due to missing windowId or other issue."
          );
          storeEvent(message.payload);
        }
      }
  
      // 处理来自侧边栏的控制消息
      else if (message.type === "GET_RECORDING_DATA") {
        isAsync = true;
        (async () => {
          const workflowData = await broadcastWorkflowDataUpdate();
  
          const statusString = isRecordingEnabled
            ? "recording"
            : workflowData.steps.length > 0
            ? "stopped"
            : "idle";
  
          sendResponse({ workflow: workflowData, recordingStatus: statusString });
        })();
        return isAsync;
      }
      // 处理开始录制请求
      else if (message.type === "START_RECORDING") {
        console.log("Received START_RECORDING request.");
        // 清除之前的数据
        Object.keys(sessionLogs).forEach(
          (key) => delete sessionLogs[parseInt(key)]
        );
        Object.keys(tabInfo).forEach((key) => delete tabInfo[parseInt(key)]);
        console.log("Cleared previous recording data.");
  
        // 开始录制
        if (!isRecordingEnabled) {
          isRecordingEnabled = true;
          console.log("Recording status set to: true");
          broadcastRecordingStatus();
  
          // 发送录制开始事件到Python服务器
          const eventToSend: HttpRecordingStartedEvent = {
            type: "RECORDING_STARTED",
            timestamp: Date.now(),
            payload: { message: "Recording has started" },
          };
        }
        sendResponse({ status: "started" });
      }
      // 处理停止录制请求
      else if (message.type === "STOP_RECORDING") {
        console.log("Received STOP_RECORDING request.");
        if (isRecordingEnabled) {
          isRecordingEnabled = false;
          console.log("Recording status set to: false");
          broadcastRecordingStatus();
  
          // 发送录制停止事件到Python服务器
          const eventToSend: HttpRecordingStoppedEvent = {
            type: "RECORDING_STOPPED",
            timestamp: Date.now(),
            payload: { message: "Recording has stopped" },
          };
        }
        sendResponse({ status: "stopped" });
      }
      // 处理来自内容脚本的状态请求
      else if (message.type === "REQUEST_RECORDING_STATUS" && sender.tab?.id) {
        console.log(
          `Sending initial status (${isRecordingEnabled}) to tab ${sender.tab.id}`
        );
        sendResponse({ isRecordingEnabled });
      }
  
      return isAsync;
    });
  
    // 在开发环境下自动打开侧边栏
    if (import.meta.env.DEV) {
      chrome.runtime.onInstalled.addListener(async (details) => {
        if (details.reason === "install" || details.reason === "update") {
          console.log(
            `[DEV] Extension ${details.reason}ed. Attempting to open side panel...`
          );
          try {
            const window = await chrome.windows.getLastFocused();
            if (window?.id) {
              await chrome.sidePanel.open({ windowId: window.id });
              console.log(
                `[DEV] Side panel open call successful for window ${window.id}.`
              );
            } else {
              console.warn(
                "[DEV] Could not get window ID to open side panel (no focused window?)."
              );
            }
          } catch (error) {
            console.error("[DEV] Error opening side panel:", error);
            console.warn(
              "[DEV] Note: Automatic side panel opening might fail without a direct user gesture or if no window is focused."
            );
          }
        }
      });
    }
  
    // 允许通过点击操作图标打开侧边栏
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error("Failed to set panel behavior:", error));
  
}
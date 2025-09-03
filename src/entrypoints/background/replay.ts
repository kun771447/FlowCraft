// 导入工作流类型定义和各种浏览器自动化动作函数
import { Workflow } from "../../lib/workflow-types";
import {
  clickElement,
  scrollElement,
  inputText,
  keyPress,
  navigateToUrl,
} from "./action";

export const replay = () => {
  // 记录回放状态的变量
  let isPlayingBack = false; // 是否正在回放
  let currentTabId: number | null = null; // 当前回放所在的标签页ID

  // 根据动作名称和参数执行相应的浏览器操作
  async function execute_action(
    actionName: string,
    params: any
  ): Promise<void> {
    if (!currentTabId) throw new Error("No active tab for playback");

    // 根据动作类型调用相应的处理函数
    switch (actionName) {
      case "click": // 点击元素
        await clickElement(params, currentTabId);
        break;
      case "scroll": // 滚动页面
        await scrollElement(params, currentTabId);
        break;
      case "input": // 输入文本
        await inputText(params, currentTabId);
        break;
      case "key_press": // 按键操作
        await keyPress(params, currentTabId);
        break;
      default:
        console.warn(`[Playback] Unknown action: ${actionName}`);
    }
  }

  // 开始回放录制的工作流
  async function startPlayback(workflow: Workflow): Promise<void> {
    // 检查是否已在回放中
    if (isPlayingBack) {
      throw new Error("Playback already in progress");
    }

    // 初始化回放状态
    isPlayingBack = true;
    currentTabId = null;

    try {
      console.log(`[Playback] Starting playback of workflow: ${workflow.name}`);
      console.log(`[Playback] Total steps: ${workflow.steps.length}`);

      // 如果有步骤且第一步有URL,则先导航到该URL
      if (workflow.steps.length > 0 && workflow.steps[0].url) {
        const initialUrl = workflow.steps[0].url;
        console.log(`[Playback] Navigating to initial URL: ${initialUrl}`);
        currentTabId = await navigateToUrl(initialUrl);
      }

      // 计算步骤间的时间延迟,基于实际录制时的时间戳
      let previousTimestamp = workflow.steps[0]?.timestamp || Date.now();

      // 依次执行每个步骤
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(
          `[Playback] Executing step ${i + 1}/${workflow.steps.length}: ${
            step.type
          }`
        );

        // 计算与上一步骤的时间间隔
        const currentTimestamp = step.timestamp;
        const timeDiff = currentTimestamp - previousTimestamp;

        // 限制延迟时间在100ms到2000ms之间,使回放更流畅
        const delay = Math.min(Math.max(timeDiff, 100), 2000);

        // 第一步之后的步骤需要等待一定时间
        if (i > 0) {
          console.log(`[Playback] Waiting ${delay}ms before next action`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
        console.log("step.type", step.type);

        // 执行当前步骤
        await execute_action(step.type, step);

        previousTimestamp = currentTimestamp;
      }

      console.log(`[Playback] Workflow playback completed successfully`);
    } catch (error) {
      console.error(`[Playback] Playback failed:`, error);
      throw error;
    } finally {
      // 重置回放状态
      isPlayingBack = false;
      currentTabId = null;
    }
  }

  // 停止回放
  function stopPlayback(): void {
    if (isPlayingBack) {
      isPlayingBack = false;
      currentTabId = null;
      console.log(`[Playback] Playback stopped`);
    }
  }

  // 获取当前回放状态
  function getPlaybackStatus(): {
    isPlaying: boolean;
    currentTabId: number | null;
  } {
    return {
      isPlaying: isPlayingBack,
      currentTabId: currentTabId,
    };
  }

  // 监听来自其他部分的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "START_PLAYBACK") { // 开始回放
      (async () => {
        try {
          await startPlayback(message.payload.workflow);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();
      return true; // 保持消息通道开放以支持异步响应
    } else if (message.type === "STOP_PLAYBACK") { // 停止回放
      stopPlayback();
      sendResponse({ success: true });
    } else if (message.type === "GET_PLAYBACK_STATUS") { // 获取回放状态
      sendResponse(getPlaybackStatus());
    }
  });
};

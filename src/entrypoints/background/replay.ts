import { Workflow } from "../../lib/workflow-types";
import { navigate_to_url, click_element, input_text, key_press, scroll_page } from "./action";

export const playback = () => {
  let isPlayingBack = false;
  let currentPlaybackTabId: number | null = null;

  // Execute action based on action name and parameters
  async function execute_action(actionName: string, params: any): Promise<void> {
    console.log(`[Playback] Executing action: ${actionName}`, params);
    
    switch (actionName) {
      case 'navigation':
        currentPlaybackTabId = await navigate_to_url(params, currentPlaybackTabId);
        break;
      case 'click':
        if (!currentPlaybackTabId) throw new Error('No active tab for playback');
        await click_element(params, currentPlaybackTabId);
        break;
      case 'input':
        if (!currentPlaybackTabId) throw new Error('No active tab for playback');
        await input_text(params, currentPlaybackTabId);
        break;
      case 'key_press':
        if (!currentPlaybackTabId) throw new Error('No active tab for playback');
        await key_press(params, currentPlaybackTabId);
        break;
      case 'scroll':
        if (!currentPlaybackTabId) throw new Error('No active tab for playback');
        await scroll_page(params, currentPlaybackTabId);
        break;
      default:
        console.warn(`[Playback] Unknown action: ${actionName}`);
    }
  }

  // Start playback of recorded workflow
  async function startPlayback(workflow: Workflow): Promise<void> {
    if (isPlayingBack) {
      throw new Error('Playback already in progress');
    }

    isPlayingBack = true;
    currentPlaybackTabId = null;

    try {
      console.log(`[Playback] Starting playback of workflow: ${workflow.name}`);
      console.log(`[Playback] Total steps: ${workflow.steps.length}`);
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        console.log(`[Playback] Executing step ${i + 1}/${workflow.steps.length}: ${step.type}`);
        
        await execute_action(step.type, step);
        
        // Add delay between steps to make playback more natural
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`[Playback] Playback failed:`, error);
      throw error;
    } finally {
      isPlayingBack = false;
      currentPlaybackTabId = null;
    }
  }

  // Stop playback
  function stopPlayback(): void {
    if (isPlayingBack) {
      isPlayingBack = false;
      currentPlaybackTabId = null;
      console.log(`[Playback] Playback stopped`);
    }
  }

  // Get playback status
  function getPlaybackStatus(): { isPlaying: boolean; currentTabId: number | null } {
    return {
      isPlaying: isPlayingBack,
      currentTabId: currentPlaybackTabId
    };
  }

  // Message listener for playback control
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'START_PLAYBACK') {
      (async () => {
        try {
          await startPlayback(message.payload.workflow);
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: (error as Error).message });
        }
      })();
      return true; // Keep message channel open for async response
    } else if (message.type === 'STOP_PLAYBACK') {
      stopPlayback();
      sendResponse({ success: true });
    } else if (message.type === 'GET_PLAYBACK_STATUS') {
      sendResponse(getPlaybackStatus());
    }
  });
};

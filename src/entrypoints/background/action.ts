import { NavigationStep, ClickStep, InputStep, KeyPressStep, ScrollStep } from "../../lib/workflow-types";

// Helper function to wait for tab to load
export function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // Add small delay to ensure page is fully loaded
        setTimeout(resolve, 1000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Helper function to attach debugger to tab
async function attachDebugger(tabId: number): Promise<boolean> {
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
    return true;
  } catch (error) {
    console.warn(`[Debugger] Failed to attach to tab ${tabId}:`, error);
    return false;
  }
}

// Helper function to detach debugger from tab
async function detachDebugger(tabId: number): Promise<void> {
  try {
    await chrome.debugger.detach({ tabId });
  } catch (error) {
    // Ignore detach errors
  }
}

// Helper function to send CDP command with fallback
async function sendCommandToDebugger(tabId: number, method: string, params: any = {}): Promise<any> {
  try {
    // Check if debugger is available
    if (!chrome.debugger) {
      throw new Error('Debugger API not available');
    }
    
    const result = await chrome.debugger.sendCommand({ tabId }, method, params);
    return result;
  } catch (error) {
    console.error(`[CDP] Command failed: ${method}`, error);
    throw error;
  }
}

// Helper function to get element position with fallback
async function getElementPosition(tabId: number, xpath?: string, cssSelector?: string): Promise<{ x: number; y: number; width: number; height: number }> {
  if (!xpath && !cssSelector) {
    throw new Error('Either xpath or cssSelector must be provided');
  }

  try {
    // Try CDP approach first
    const expression = xpath 
      ? `(() => {
          const element = document.evaluate('${xpath}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height
          };
        })()`
      : `(() => {
          const element = document.querySelector('${cssSelector}');
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width,
            height: rect.height
          };
        })()`;

    const result = await sendCommandToDebugger(tabId, 'Runtime.evaluate', {
      expression,
      returnByValue: true
    });

    if (!result?.result?.value) {
      throw new Error(`Element not found: ${xpath || cssSelector}`);
    }

    return result.result.value;
  } catch (error) {
    // Fallback to content script
    console.warn('[Action] CDP failed, falling back to content script:', error);
    
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_ELEMENT_POSITION',
      payload: { xpath, cssSelector }
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    return result;
  }
}

// Helper function to check if page is in mobile emulation with fallback
async function isMobileEmulation(tabId: number): Promise<boolean> {
  try {
    const result = await sendCommandToDebugger(tabId, 'Runtime.evaluate', {
      expression: `(() => {
        return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      })()`,
      returnByValue: true
    });
    return result?.result?.value || false;
  } catch (error) {
    // Fallback to content script
    console.warn('[Action] CDP mobile detection failed, falling back to content script:', error);
    
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'IS_MOBILE_EMULATION'
    });

    return result?.isMobile || false;
  }
}

// Helper function to focus element with fallback
async function focusElement(tabId: number, xpath?: string, cssSelector?: string): Promise<void> {
  try {
    const expression = xpath 
      ? `(() => {
          const element = document.evaluate('${xpath}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
          if (element) element.focus();
          return !!element;
        })()`
      : `(() => {
          const element = document.querySelector('${cssSelector}');
          if (element) element.focus();
          return !!element;
        })()`;

    const result = await sendCommandToDebugger(tabId, 'Runtime.evaluate', {
      expression,
      returnByValue: true
    });

    if (!result?.result?.value) {
      throw new Error(`Element not found for focus: ${xpath || cssSelector}`);
    }
  } catch (error) {
    // Fallback to content script
    console.warn('[Action] CDP focus failed, falling back to content script:', error);
    
    const result = await chrome.tabs.sendMessage(tabId, {
      type: 'FOCUS_ELEMENT',
      payload: { xpath, cssSelector }
    });

    if (result?.error) {
      throw new Error(result.error);
    }
  }
}

// Navigate to URL
export async function navigate_to_url(params: NavigationStep, currentPlaybackTabId: number | null): Promise<number> {
  try {
    let tabId: number;
    
    if (currentPlaybackTabId) {
      // Update existing tab
      await chrome.tabs.update(currentPlaybackTabId, { url: params.url });
      tabId = currentPlaybackTabId;
    } else {
      // Create new tab
      const tab = await chrome.tabs.create({ url: params.url });
      tabId = tab.id!;
    }
    
    // Wait for page to load
    await waitForTabLoad(tabId);
    console.log(`[Action] Navigated to: ${params.url}`);
    
    return tabId;
  } catch (error) {
    console.error(`[Action] Navigation failed:`, error);
    throw error;
  }
}

// Click element by xpath or css selector
export async function click_element(params: ClickStep, currentPlaybackTabId: number): Promise<void> {
  if (!currentPlaybackTabId) {
    throw new Error('No active tab for playback');
  }

  try {
    // Try to attach debugger
    const debuggerAttached = await attachDebugger(currentPlaybackTabId);
    
    if (debuggerAttached) {
      try {
        // Get element position
        const position = await getElementPosition(currentPlaybackTabId, params.xpath, params.cssSelector);
        
        // Check if mobile emulation
        const mobile = await isMobileEmulation(currentPlaybackTabId);
        
        if (mobile) {
          // Use touch events for mobile emulation
          const touchPoints = [{ x: Math.round(position.x), y: Math.round(position.y) }];
          
          await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints,
            modifiers: 0,
          });

          await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchTouchEvent', {
            type: 'touchEnd',
            touchPoints: [],
            modifiers: 0,
          });
        } else {
          // Use mouse events for desktop
          await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchMouseEvent', {
            type: 'mousePressed',
            x: position.x,
            y: position.y,
            button: 'left',
            clickCount: 1,
          });
          
          await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchMouseEvent', {
            type: 'mouseReleased',
            x: position.x,
            y: position.y,
            button: 'left',
            clickCount: 1,
          });
        }
        
        console.log(`[Action] Clicked element via CDP: ${params.xpath || params.cssSelector}`);
      } finally {
        // Detach debugger
        await detachDebugger(currentPlaybackTabId);
      }
    } else {
      // Fallback to content script
      const result = await chrome.tabs.sendMessage(currentPlaybackTabId, {
        type: 'PLAYBACK_CLICK',
        payload: {
          xpath: params.xpath,
          cssSelector: params.cssSelector,
          elementTag: params.elementTag
        }
      });

      if (result?.error) {
        throw new Error(result.error);
      }
      
      console.log(`[Action] Clicked element via content script: ${params.xpath || params.cssSelector}`);
    }
  } catch (error) {
    console.error(`[Action] Click failed:`, error);
    throw error;
  }
}

// Input text into element
export async function input_text(params: InputStep, currentPlaybackTabId: number): Promise<void> {
  if (!currentPlaybackTabId) {
    throw new Error('No active tab for playback');
  }

  try {
    // Try to attach debugger
    const debuggerAttached = await attachDebugger(currentPlaybackTabId);
    
    if (debuggerAttached) {
      try {
        // Focus the element first
        await focusElement(currentPlaybackTabId, params.xpath, params.cssSelector);
        
        // Clear existing value
        const clearExpression = params.xpath 
          ? `(() => {
              const element = document.evaluate('${params.xpath}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
              if (element) {
                element.value = '';
                element.dispatchEvent(new Event('input', { bubbles: true }));
              }
              return !!element;
            })()`
          : `(() => {
              const element = document.querySelector('${params.cssSelector}');
              if (element) {
                element.value = '';
                element.dispatchEvent(new Event('input', { bubbles: true }));
              }
              return !!element;
            })()`;

        await sendCommandToDebugger(currentPlaybackTabId, 'Runtime.evaluate', {
          expression: clearExpression
        });

        // Type the text character by character
        for (const char of params.value) {
          await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchKeyEvent', {
            type: 'keyDown',
            text: char
          });
          
          await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchKeyEvent', {
            type: 'keyUp',
            text: char
          });
        }
        
        console.log(`[Action] Input text via CDP: ${params.value} into ${params.xpath || params.cssSelector}`);
      } finally {
        // Detach debugger
        await detachDebugger(currentPlaybackTabId);
      }
    } else {
      // Fallback to content script
      const result = await chrome.tabs.sendMessage(currentPlaybackTabId, {
        type: 'PLAYBACK_INPUT',
        payload: {
          xpath: params.xpath,
          cssSelector: params.cssSelector,
          value: params.value,
          elementTag: params.elementTag
        }
      });

      if (result?.error) {
        throw new Error(result.error);
      }
      
      console.log(`[Action] Input text via content script: ${params.value} into ${params.xpath || params.cssSelector}`);
    }
  } catch (error) {
    console.error(`[Action] Input failed:`, error);
    throw error;
  }
}

// Key press
export async function key_press(params: KeyPressStep, currentPlaybackTabId: number): Promise<void> {
  if (!currentPlaybackTabId) {
    throw new Error('No active tab for playback');
  }

  try {
    // Try to attach debugger
    const debuggerAttached = await attachDebugger(currentPlaybackTabId);
    
    if (debuggerAttached) {
      try {
        // Focus element if specified
        if (params.xpath || params.cssSelector) {
          await focusElement(currentPlaybackTabId, params.xpath, params.cssSelector);
        }

        // Map common keys to key codes
        const keyMap: { [key: string]: string } = {
          'Enter': 'Enter',
          'Tab': 'Tab',
          'Escape': 'Escape',
          'Backspace': 'Backspace',
          'Delete': 'Delete',
          'ArrowUp': 'ArrowUp',
          'ArrowDown': 'ArrowDown',
          'ArrowLeft': 'ArrowLeft',
          'ArrowRight': 'ArrowRight',
          'Home': 'Home',
          'End': 'End',
          'PageUp': 'PageUp',
          'PageDown': 'PageDown'
        };

        const key = keyMap[params.key] || params.key;

        await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchKeyEvent', {
          type: 'keyDown',
          key: key
        });
        
        await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: key
        });
        
        console.log(`[Action] Key press via CDP: ${params.key}`);
      } finally {
        // Detach debugger
        await detachDebugger(currentPlaybackTabId);
      }
    } else {
      // Fallback to content script
      const result = await chrome.tabs.sendMessage(currentPlaybackTabId, {
        type: 'PLAYBACK_KEY_PRESS',
        payload: {
          key: params.key,
          xpath: params.xpath,
          cssSelector: params.cssSelector
        }
      });

      if (result?.error) {
        throw new Error(result.error);
      }
      
      console.log(`[Action] Key press via content script: ${params.key}`);
    }
  } catch (error) {
    console.error(`[Action] Key press failed:`, error);
    throw error;
  }
}

// Scroll page
export async function scroll_page(params: ScrollStep, currentPlaybackTabId: number): Promise<void> {
  if (!currentPlaybackTabId) {
    throw new Error('No active tab for playback');
  }

  try {
    // Try to attach debugger
    const debuggerAttached = await attachDebugger(currentPlaybackTabId);
    
    if (debuggerAttached) {
      try {
        // Use mouse wheel event for scrolling
        await sendCommandToDebugger(currentPlaybackTabId, 'Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x: 0,
          y: 0,
          deltaX: params.scrollX,
          deltaY: params.scrollY,
        });
        
        console.log(`[Action] Scroll via CDP: x=${params.scrollX}, y=${params.scrollY}`);
      } finally {
        // Detach debugger
        await detachDebugger(currentPlaybackTabId);
      }
    } else {
      // Fallback to content script
      const result = await chrome.tabs.sendMessage(currentPlaybackTabId, {
        type: 'PLAYBACK_SCROLL',
        payload: {
          scrollX: params.scrollX,
          scrollY: params.scrollY,
          targetId: params.targetId
        }
      });

      if (result?.error) {
        throw new Error(result.error);
      }
      
      console.log(`[Action] Scroll via content script: x=${params.scrollX}, y=${params.scrollY}`);
    }
  } catch (error) {
    console.error(`[Action] Scroll failed:`, error);
    throw error;
  }
}

//  waitForTabLoad - 等待标签页加载完成
// 这个辅助函数会等待指定标签页完全加载完成。它返回一个 Promise,监听标签页的更新事件,
// 当状态变为"complete"时解析 Promise。为确保页面完全加载,会额外等待1秒。
export function waitForTabLoad(tabId: number): Promise<void> {
  return new Promise((resolve) => {
    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        // 额外等待1秒确保页面完全加载
        setTimeout(resolve, 1000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function sendCommandToDebugger<T = any>(
  tabId: number,
  command: string,
  params: any
): Promise<T> {
  // 确保已经附加了调试器
  try {
    await chrome.debugger.attach({ tabId }, "1.3");
  } catch (e) {
    // 如果调试器已经附加，会抛出错误，我们可以忽略这个错误
  }

  return chrome.debugger.sendCommand({ tabId }, command, params) as Promise<T>;
}

/**
 * 根据 XPath 查找元素并返回元素信息，支持重试机制
 * @param tabId 标签页ID
 * @param xpath XPath 表达式
 * @param options 重试选项
 * @returns 元素信息，包括坐标等
 */
async function findElementByXPath(
  tabId: number,
  xpath: string,
  options: {
    retryCount?: number;      // 重试次数，默认 3
    retryInterval?: number;   // 重试间隔时间(ms)，默认 1000ms
  } = {}
): Promise<{ x: number; y: number; width: number; height: number; text: string; tagName: string } | null> {
  const { retryCount = 3, retryInterval = 1000 } = options;
  
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const result = await sendCommandToDebugger(tabId, "Runtime.evaluate", {
        expression: `(() => {
          try {
            // 使用 document.evaluate 评估 XPath 表达式
            const result = document.evaluate(
              ${JSON.stringify(xpath)}, 
              document, 
              null, 
              XPathResult.FIRST_ORDERED_NODE_TYPE, 
              null
            );
            
            // 获取匹配的第一个节点
            const element = result.singleNodeValue;
            
            if (!element) {
              return null;
            }
            
            // 获取元素位置
            const rect = element.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              width: rect.width,
              height: rect.height,
              text: element.textContent?.trim() || '',
              tagName: element.tagName.toLowerCase()
            };
          } catch (error) {
            return null;
          }
        })()`,
        returnByValue: true,
      });

      if (result?.result?.value) {
        return result.result.value;
      }

      // 如果不是最后一次尝试，等待后重试
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    } catch (error) {
      // 如果不是最后一次尝试，等待后重试
      if (attempt < retryCount) {
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }
  }
  
  return null;
}

// navigateToUrl - 导航到指定URL
// 创建新标签页并导航到指定URL。它会:
// - 创建新标签页并激活它
// - 等待页面加载完成
// - 返回新标签页的ID
export async function navigateToUrl(url: string): Promise<number> {
  try {
    const tab = await chrome.tabs.create({ url: url, active: true });
    if (!tab.id) {
      throw new Error("Failed to create tab");
    }

    await waitForTabLoad(tab.id);

    return tab.id;
  } catch (error) {
    throw error;
  }
}

// clickElement - 点击页面元素
// 通过注入内容脚本来点击页面上的元素。它会:
// - 首先尝试通过XPath定位元素，支持CSS选择器回退和重试机制
// - 找到元素后模拟点击事件
export async function clickElement(params: any, tabId: number): Promise<void> {
  try {
    const xpath = params.xpath || "";
    const cssSelector = params.cssSelector || "";
    const retryCount = params.retryCount || 3;
    const retryInterval = params.retryInterval || 1000;

    const elementInfo = await findElement(tabId, xpath, cssSelector, {
      retryCount,
      retryInterval
    });

    if (!elementInfo) {
      throw new Error(`Element not found with XPath: ${xpath} or CSS: ${cssSelector}`);
    }

    await sendCommandToDebugger(tabId, "Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: elementInfo.x,
      y: elementInfo.y,
      button: "left",
      clickCount: 1,
    });
    await sendCommandToDebugger(tabId, "Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: elementInfo.x,
      y: elementInfo.y,
      button: "left",
      clickCount: 1,
    });
  } catch (error) {
    throw error;
  }
}

// scrollElement - 滚动页面或元素
// 可以滚动整个页面或特定元素。它会:
// - 判断是页面滚动还是元素滚动
// - 对于元素滚动,先定位元素(XPath或CSS选择器)
// - 设置滚动位置
export async function scrollElement(params: any, tabId: number): Promise<void> {
  try {
    const scrollX = params.scrollX || 0;
    const scrollY = params.scrollY || 0;
    const elementTag = params.elementTag || "";
    const xpath = params.xpath || "";
    const cssSelector = params.cssSelector || "";

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (scrollX, scrollY, elementTag, xpath, cssSelector) => {
        // 判断是否为页面滚动
        if (elementTag === "document" || !xpath) {
          window.scrollTo(scrollX, scrollY);
          return { success: true, message: "Page scrolled successfully" };
        }

        // 元素滚动
        let element = null;

        if (xpath) {
          try {
            const result = document.evaluate(
              xpath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            element = result.singleNodeValue;
          } catch (e) {
            // XPath evaluation failed
          }
        }

        if (!element && cssSelector) {
          try {
            element = document.querySelector(cssSelector);
          } catch (e) {
            // CSS selector failed
          }
        }

        if (element) {
          element.scrollLeft = scrollX;
          element.scrollTop = scrollY;
          return { success: true, message: "Element scrolled successfully" };
        } else {
          return { success: false, message: "Element not found" };
        }
      },
      args: [scrollX, scrollY, elementTag, xpath, cssSelector],
    });

    const result = results[0]?.result;
    if (!result?.success) {
      throw new Error(result?.message || "Scroll failed");
    }
  } catch (error) {
    throw error;
  }
}

// inputText - 在输入框中输入文本
// 在表单输入框中输入文本。它会:
// - 定位输入元素
// - 检查是否为输入框类型
// - 设置值并触发相应事件
export async function inputText(params: any, tabId: number): Promise<void> {
  try {
    const xpath = params.xpath || "";
    const cssSelector = params.cssSelector || "";
    const value = params.value || "";

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (xpath, cssSelector, value) => {
        let element = null;

        if (xpath) {
          try {
            const result = document.evaluate(
              xpath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            element = result.singleNodeValue;
          } catch (e) {
            // XPath evaluation failed
          }
        }

        if (!element && cssSelector) {
          try {
            element = document.querySelector(cssSelector);
          } catch (e) {
            // CSS selector failed
          }
        }

        if (element) {
          if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
            element.focus();
            element.value = value;

            // 触发输入事件
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));

            return { success: true, message: "Text input successfully" };
          } else {
            return {
              success: false,
              message: "Element is not an input field",
            };
          }
        } else {
          return { success: false, message: "Element not found" };
        }
      },
      args: [xpath, cssSelector, value],
    });

    const result = results[0]?.result;
    if (!result?.success) {
      throw new Error(result?.message || "Input failed");
    }
  } catch (error) {
    throw error;
  }
}

// keyPress - 模拟按键事件
// 模拟键盘按键事件。它会:
// - 可以针对特定元素或整个文档
// - 触发keydown和keyup事件
export async function keyPress(params: any, tabId: number): Promise<void> {
  try {
    const key = params.key || "";
    const xpath = params.xpath || "";
    const cssSelector = params.cssSelector || "";

    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (key, xpath, cssSelector) => {
        let targetElement = null;

        if (xpath) {
          try {
            const result = document.evaluate(
              xpath,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            );
            targetElement = result.singleNodeValue;
          } catch (e) {
            // XPath evaluation failed
          }
        }

        if (!targetElement && cssSelector) {
          try {
            targetElement = document.querySelector(cssSelector);
          } catch (e) {
            // CSS selector failed
          }
        }

        // 如果没有指定元素,使用当前活动元素或body
        if (!targetElement) {
          targetElement = document.activeElement || document.body;
        }

        if (targetElement && targetElement.focus) {
          targetElement.focus();
        }

        // 创建并触发键盘事件
        const keyDownEvent = new KeyboardEvent("keydown", {
          key: key,
          code: key,
          bubbles: true,
          cancelable: true,
        });

        const keyUpEvent = new KeyboardEvent("keyup", {
          key: key,
          code: key,
          bubbles: true,
          cancelable: true,
        });

        (targetElement || document).dispatchEvent(keyDownEvent);
        (targetElement || document).dispatchEvent(keyUpEvent);

        return {
          success: true,
          message: `Key "${key}" pressed successfully`,
        };
      },
      args: [key, xpath, cssSelector],
    });

    const result = results[0]?.result;
    if (!result?.success) {
      throw new Error(result?.message || "Key press failed");
    }
  } catch (error) {
    throw error;
  }
}

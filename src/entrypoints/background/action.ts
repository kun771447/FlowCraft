// 这个文件包含了几个主要的浏览器自动化动作函数:

// 1. waitForTabLoad - 等待标签页加载完成
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

// 2. navigateToUrl - 导航到指定URL
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

    console.log(`[Playback] Navigated to: ${url}`);
    return tab.id;
  } catch (error) {
    console.error(`[Playback] Navigation failed:`, error);
    throw error;
  }
}

// 3. clickElement - 点击页面元素
// 通过注入内容脚本来点击页面上的元素。它会:
// - 首先尝试通过XPath定位元素
// - 如果失败则尝试CSS选择器
// - 找到元素后模拟点击事件
export async function clickElement(params: any, tabId: number): Promise<void> {
  try {
    const xpath = params.xpath || "";
    const cssSelector = params.cssSelector || "";

    console.log("clickElement", params);
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: (xpath, cssSelector) => {
        let element = null;

        // 首先尝试XPath
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
            console.warn("XPath evaluation failed:", e);
          }
        }

        // 如果XPath失败,尝试CSS选择器
        if (!element && cssSelector) {
          try {
            element = document.querySelector(cssSelector);
          } catch (e) {
            console.warn("CSS selector failed:", e);
          }
        }

        if (element) {
          element.click();
          return { success: true, message: "Element clicked successfully" };
        } else {
          return { success: false, message: "Element not found" };
        }
      },
      args: [xpath, cssSelector],
    });

    const result = results[0]?.result;
    if (!result?.success) {
      throw new Error(result?.message || "Click failed");
    }

    console.log(`[Playback] Clicked element: ${xpath || cssSelector}`);
  } catch (error) {
    console.error(`[Playback] Click failed:`, error);
    throw error;
  }
}

// 4. scrollElement - 滚动页面或元素
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
            console.warn("XPath evaluation failed:", e);
          }
        }

        if (!element && cssSelector) {
          try {
            element = document.querySelector(cssSelector);
          } catch (e) {
            console.warn("CSS selector failed:", e);
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

    console.log(`[Playback] Scrolled to x=${scrollX}, y=${scrollY}`);
  } catch (error) {
    console.error(`[Playback] Scroll failed:`, error);
    throw error;
  }
}

// 5. inputText - 在输入框中输入文本
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
            console.warn("XPath evaluation failed:", e);
          }
        }

        if (!element && cssSelector) {
          try {
            element = document.querySelector(cssSelector);
          } catch (e) {
            console.warn("CSS selector failed:", e);
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

    console.log(
      `[Playback] Input text: "${value}" into ${xpath || cssSelector}`
    );
  } catch (error) {
    console.error(`[Playback] Input failed:`, error);
    throw error;
  }
}

// 6. keyPress - 模拟按键事件
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
            console.warn("XPath evaluation failed:", e);
          }
        }

        if (!targetElement && cssSelector) {
          try {
            targetElement = document.querySelector(cssSelector);
          } catch (e) {
            console.warn("CSS selector failed:", e);
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

    console.log(`[Playback] Key press: "${key}"`);
  } catch (error) {
    console.error(`[Playback] Key press failed:`, error);
    throw error;
  }
}

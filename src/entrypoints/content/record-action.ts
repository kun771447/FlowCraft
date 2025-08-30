import { getXPath, getEnhancedCSSSelector } from "./util";

export function handleScroll(event: Event) {
  console.log("event", event);
  console.log("event", event.target);
}

export function handleCustomClick(event: MouseEvent) {
  const targetElement = event.target as HTMLElement;
  if (!targetElement) return;

  try {
    const xpath = getXPath(targetElement);
    // 安全获取frameUrl，处理跨域情况
    let frameUrl: string;
    try {
      frameUrl = window.location.href;
    } catch (error) {
      // 跨域访问失败时的fallback
      frameUrl = document.location.href || 'about:blank';
    }

    const clickData = {
      timestamp: Date.now(),
      url: document.location.href, // 主页面URL
      frameUrl: frameUrl, // 事件发生的frame URL
      xpath: xpath,
      cssSelector: getEnhancedCSSSelector(targetElement, xpath),
      elementTag: targetElement.tagName,
      elementText: targetElement.textContent?.trim().slice(0, 200) || "",
    };

    chrome.runtime.sendMessage({
      type: "CUSTOM_CLICK_EVENT",
      payload: clickData,
    });
  } catch (error) {
    console.error("Error capturing click data:", error);
  }
}

export function handleInput(event: Event) {
  const targetElement = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (!targetElement || !("value" in targetElement)) return;
  const isPassword = targetElement.type === "password";

  try {
    const xpath = getXPath(targetElement);
    // 安全获取frameUrl，处理跨域情况
    let frameUrl: string;
    try {
      frameUrl = window.location.href;
    } catch (error) {
      frameUrl = document.location.href || 'about:blank';
    }

    const inputData = {
      timestamp: Date.now(),
      url: document.location.href,
      frameUrl: frameUrl,
      xpath: xpath,
      cssSelector: getEnhancedCSSSelector(targetElement, xpath),
      elementTag: targetElement.tagName,
      value: isPassword ? "********" : targetElement.value, // 密码字段打码
    };

    chrome.runtime.sendMessage({
      type: "CUSTOM_INPUT_EVENT",
      payload: inputData,
    });
  } catch (error) {
    console.error("Error capturing input data:", error);
  }
}

// 需要特别捕获的按键集合
const CAPTURED_KEYS = new Set([
  "Enter",
  "Tab",
  "Escape",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Backspace",
  "Delete",
]);

export function handleKeydown(event: KeyboardEvent) {
  const key = event.key;
  let keyToLog = "";

  // 检查是否是需要特别捕获的按键
  if (CAPTURED_KEYS.has(key)) {
    keyToLog = key;
  }
  // 检查常用的组合键(Ctrl/Cmd + key)
  else if (
    (event.ctrlKey || event.metaKey) &&
    key.length === 1 &&
    /[a-zA-Z0-9]/.test(key)
  ) {
    // 使用'CmdOrCtrl'以兼容不同平台
    keyToLog = `CmdOrCtrl+${key.toUpperCase()}`;
  }

  // 如果有需要记录的按键,发送事件
  if (keyToLog) {
    const targetElement = event.target as HTMLElement;
    let xpath = "";
    let cssSelector = "";
    let elementTag = "document"; // 默认目标不是元素时
    if (targetElement && typeof targetElement.tagName === "string") {
      try {
        xpath = getXPath(targetElement);
        cssSelector = getEnhancedCSSSelector(targetElement, xpath);
        elementTag = targetElement.tagName;
      } catch (e) {
        console.error("Error getting selector for keydown target:", e);
      }
    }

    try {
      // 安全获取frameUrl，处理跨域情况
      let frameUrl: string;
      try {
        frameUrl = window.location.href;
      } catch (error) {
        frameUrl = document.location.href || 'about:blank';
      }

      const keyData = {
        timestamp: Date.now(),
        url: document.location.href,
        frameUrl: frameUrl,
        key: keyToLog, // 按下的键或组合键
        xpath: xpath, // 焦点元素的XPath
        cssSelector: cssSelector, // 焦点元素的CSS选择器
        elementTag: elementTag, // 焦点元素的标签名
      };

      chrome.runtime.sendMessage({
        type: "CUSTOM_KEY_EVENT",
        payload: keyData,
      });
    } catch (error) {
      console.error("Error capturing keydown data:", error);
    }
  }
}

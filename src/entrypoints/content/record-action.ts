import {
  getXPath,
  getEnhancedCSSSelector,
  getEventTarget,
  parentElement,
} from "./util";

// 获取窗口滚动位置 - 兼容不同浏览器的滚动位置获取方式
export function getWindowScroll(win: Window) {
  const doc = win.document;
  return {
    left: doc.scrollingElement
      ? doc.scrollingElement.scrollLeft // 现代浏览器使用 scrollingElement
      : win.pageXOffset !== undefined
      ? win.pageXOffset // 兼容旧版浏览器
      : doc.documentElement.scrollLeft ||
        (doc?.body && parentElement(doc.body)?.scrollLeft) ||
        doc?.body?.scrollLeft ||
        0,
    top: doc.scrollingElement
      ? doc.scrollingElement.scrollTop // 现代浏览器使用 scrollingElement
      : win.pageYOffset !== undefined
      ? win.pageYOffset // 兼容旧版浏览器
      : doc?.documentElement.scrollTop ||
        (doc?.body && parentElement(doc.body)?.scrollTop) ||
        doc?.body?.scrollTop ||
        0,
  };
}

export function handleScroll(event: Event) {
  const target = getEventTarget(event) as HTMLElement | Document;

  console.log('handleScroll', target);
  if (!target) return;

  try {
    let scrollData = {};
    // 安全获取frameUrl，处理跨域情况
    let frameUrl: string;
    try {
      frameUrl = window.location.href;
    } catch (error) {
      // 跨域访问失败时的fallback
      frameUrl = document.location.href || "about:blank";
    }

    const doc = document;
    if (target === doc && doc.defaultView) {
      // 窗口滚动 - 获取窗口的滚动位置
      const scrollLeftTop = getWindowScroll(doc.defaultView);

      scrollData = {
        elementTag: 'document',
        timestamp: Date.now(),
        url: document.location.href,
        frameUrl: frameUrl,
        x: scrollLeftTop.left, // 水平滚动位置
        y: scrollLeftTop.top, // 垂直滚动位置
      };
    } else {
      const xpath = getXPath(target as HTMLElement);

      // 元素滚动 - 获取元素的滚动位置
      scrollData = {
        timestamp: Date.now(),
        url: document.location.href,
        frameUrl: frameUrl,
        xpath: xpath,
        cssSelector: getEnhancedCSSSelector(target as HTMLElement, xpath),
        elementTag: (target as HTMLElement).tagName,
        x: (target as HTMLElement).scrollLeft, // 元素水平滚动位置
        y: (target as HTMLElement).scrollTop, // 元素垂直滚动位置
      };
    }

    chrome.runtime.sendMessage({
      type: "CUSTOM_SCROLL_EVENT",
      payload: scrollData,
    });
  } catch (error) {}
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
      frameUrl = document.location.href || "about:blank";
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
      frameUrl = document.location.href || "about:blank";
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
        frameUrl = document.location.href || "about:blank";
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

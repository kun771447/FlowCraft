// 导入 rrweb 库及其类型定义
import * as rrweb from "rrweb";
import { EventType, IncrementalSource } from "@rrweb/types";

// 全局变量定义
let stopRecording: (() => void) | undefined = undefined; // 停止录制的函数
let isRecordingActive = true; // 内容脚本的本地录制状态
let scrollTimeout: ReturnType<typeof setTimeout> | null = null; // 滚动防抖定时器
let lastScrollY: number | null = null; // 上次滚动位置
let lastDirection: "up" | "down" | null = null; // 上次滚动方向
const DEBOUNCE_MS = 500; // 滚动防抖延迟时间(毫秒)

// --- 生成元素 XPath 的辅助函数 ---
function getXPath(element: HTMLElement): string {
  // 如果元素有 id,直接返回 id 选择器
  if (element.id !== "") {
    return `id("${element.id}")`;
  }
  // 如果是 body 元素,直接返回标签名
  if (element === document.body) {
    return element.tagName.toLowerCase();
  }

  let ix = 0; // 相同标签名的元素索引
  const siblings = element.parentNode?.children;
  if (siblings) {
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        // 返回完整的 XPath,包含父元素路径和当前元素的位置
        return `${getXPath(
          element.parentElement as HTMLElement
        )}/${element.tagName.toLowerCase()}[${ix + 1}]`;
      }
      // 计算相同标签名的元素数量
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
  }
  // 降级处理:直接返回标签名
  return element.tagName.toLowerCase();
}
// --- XPath 辅助函数结束 ---

// --- 生成 CSS 选择器的辅助函数 ---
// 定义安全的属性集合(类似 Python 实现)
const SAFE_ATTRIBUTES = new Set([
  "id",
  "name",
  "type",
  "placeholder",
  "aria-label",
  "aria-labelledby", 
  "aria-describedby",
  "role",
  "for",
  "autocomplete",
  "required",
  "readonly",
  "alt",
  "title",
  "src",
  "href",
  "target",
  // 常用的数据属性
  "data-id",
  "data-qa",
  "data-cy",
  "data-testid",
]);

function getEnhancedCSSSelector(element: HTMLElement, xpath: string): string {
  try {
    // 基础选择器使用标签名
    let cssSelector = element.tagName.toLowerCase();

    // 处理 class 属性
    if (element.classList && element.classList.length > 0) {
      const validClassPattern = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;
      element.classList.forEach((className) => {
        // 验证 class 名是否合法
        if (className && validClassPattern.test(className)) {
          cssSelector += `.${CSS.escape(className)}`;
        }
      });
    }

    // 处理其他安全属性
    for (const attr of element.attributes) {
      const attrName = attr.name;
      const attrValue = attr.value;

      // 跳过已处理的 class 属性
      if (attrName === "class") continue;
      // 跳过空属性名
      if (!attrName.trim()) continue;
      // 跳过不在安全列表中的属性
      if (!SAFE_ATTRIBUTES.has(attrName)) continue;

      const safeAttribute = CSS.escape(attrName);

      // 处理不同类型的属性值
      if (attrValue === "") {
        // 空值属性
        cssSelector += `[${safeAttribute}]`;
      } else {
        // 处理包含特殊字符的属性值
        const safeValue = attrValue.replace(/"/g, '"');
        if (/["'<>`\s]/.test(attrValue)) {
          cssSelector += `[${safeAttribute}*="${safeValue}"]`;
        } else {
          cssSelector += `[${safeAttribute}="${safeValue}"]`;
        }
      }
    }
    return cssSelector;
  } catch (error) {
    // 错误处理:使用 xpath 作为备选
    console.error("Error generating enhanced CSS selector:", error);
    return `${element.tagName.toLowerCase()}[xpath="${xpath.replace(
      /"/g,
      '"'
    )}"]`;
  }
}

// 启动录制器函数
function startRecorder() {
  // 避免重复启动
  if (stopRecording) {
    console.log("Recorder already running.");
    return;
  }
  console.log("Starting rrweb recorder for:", window.location.href);
  isRecordingActive = true;
  // 使用 rrweb 而不是原生 JS 录制的原因:
  // 1. rrweb 提供了完整的 DOM 快照和增量更新机制,可以精确还原页面状态
  // 2. 自动处理 iframe、shadow DOM 等复杂场景
  // 3. 内置了性能优化和内存管理
  // 4. 提供了回放功能,可以完整重现用户操作
  // 5. 处理了跨浏览器兼容性问题
  stopRecording = rrweb.record({
    emit(event) {
      // 如果录制已停止,不处理事件
      if (!isRecordingActive) return;

      // 处理滚动事件,使用防抖和方向检测
      if (
        event.type === EventType.IncrementalSnapshot &&
        event.data.source === IncrementalSource.Scroll
      ) {
        const scrollData = event.data as { id: number; x: number; y: number };
        const currentScrollY = scrollData.y;

        // 获取滚动元素的信息
        let elementInfo = {};
        try {
          // 通过 RRWeb ID 找到对应的元素
          const element = document.querySelector(`[data-rrweb-id="${scrollData.id}"]`) || 
                         (scrollData.id === 1 ? window : null);
          
          if (element && element !== window) {
            const targetElement = element as HTMLElement;
            elementInfo = {
              xpath: getXPath(targetElement),
              cssSelector: getEnhancedCSSSelector(targetElement, getXPath(targetElement)),
              elementTag: targetElement.tagName,
              elementText: targetElement.textContent?.trim().slice(0, 100) || "",
            };
          } else if (scrollData.id === 1) {
            elementInfo = {
              xpath: "window",
              cssSelector: "window", 
              elementTag: "WINDOW",
              elementText: "页面滚动",
            };
          }
        } catch (error) {
          console.error("Error getting scroll element info:", error);
        }

        // 四舍五入坐标值,减少数据量
        const roundedScrollData = {
          ...scrollData,
          x: Math.round(scrollData.x),
          y: Math.round(scrollData.y),
          ...elementInfo,
        };

        console.log('roundedScrollData', roundedScrollData);

        // 判断滚动方向
        let currentDirection: "up" | "down" | null = null;
        if (lastScrollY !== null) {
          currentDirection = currentScrollY > lastScrollY ? "down" : "up";
        }

        // 方向改变时立即记录
        if (
          lastDirection !== null &&
          currentDirection !== null &&
          currentDirection !== lastDirection
        ) {
          if (scrollTimeout) {
            clearTimeout(scrollTimeout);
            scrollTimeout = null;
          }
          chrome.runtime.sendMessage({
            type: "RRWEB_EVENT",
            payload: {
              ...event,
              data: roundedScrollData,
            },
          });
          lastDirection = currentDirection;
          lastScrollY = currentScrollY;
          return;
        }

        // 更新方向和位置
        lastDirection = currentDirection;
        lastScrollY = currentScrollY;

        // 使用防抖优化性能
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(() => {
          chrome.runtime.sendMessage({
            type: "RRWEB_EVENT",
            payload: {
              ...event,
              data: roundedScrollData,
            },
          });
          scrollTimeout = null;
          lastDirection = null;
        }, DEBOUNCE_MS);
      } else {
        // 直接传递非滚动事件
        chrome.runtime.sendMessage({ type: "RRWEB_EVENT", payload: event });
      }
    },
    maskInputOptions: {
      password: true, // 密码字段打码
    },
    checkoutEveryNms: 10000, // 每10秒保存一次完整快照
    checkoutEveryNth: 200, // 或每200个事件保存一次
  });

  // 添加停止函数到window以便手动清理
  (window as any).rrwebStop = stopRecorder;

  // --- 永久附加自定义事件监听器 ---
  // 这些监听器始终处于活动状态，但处理程序会检查 `isRecordingActive`
  // true 参数表示在捕获阶段处理事件，确保在事件到达目标前捕获
  document.addEventListener("click", handleCustomClick, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("change", handleSelectChange, true);
  document.addEventListener("keydown", handleKeydown, true);
  document.addEventListener("mouseover", handleMouseOver, true);
  document.addEventListener("mouseout", handleMouseOut, true);
  document.addEventListener("focus", handleFocus, true);
  document.addEventListener("blur", handleBlur, true);
  console.log("Permanently attached custom event listeners.");
}

// 停止录制器函数
function stopRecorder() {
  if (stopRecording) {
    console.log("Stopping rrweb recorder for:", window.location.href);
    stopRecording();
    stopRecording = undefined;
    isRecordingActive = false;
    (window as any).rrwebStop = undefined; // 清理window属性
    // 移除所有自定义事件监听器
    document.removeEventListener("click", handleCustomClick, true);
    document.removeEventListener("input", handleInput, true);
    document.removeEventListener("change", handleSelectChange, true);
    document.removeEventListener("keydown", handleKeydown, true);
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("focus", handleFocus, true);
    document.removeEventListener("blur", handleBlur, true);
  } else {
    console.log("Recorder not running, cannot stop.");
  }
}

// --- 自定义点击事件处理器 ---
function handleCustomClick(event: MouseEvent) {
  if (!isRecordingActive) return;
  const targetElement = event.target as HTMLElement;
  if (!targetElement) return;

  try {
    const xpath = getXPath(targetElement);
    const clickData = {
      timestamp: Date.now(),
      url: document.location.href, // 主页面URL
      frameUrl: window.location.href, // 事件发生的frame URL
      xpath: xpath,
      cssSelector: getEnhancedCSSSelector(targetElement, xpath),
      elementTag: targetElement.tagName,
      elementText: targetElement.textContent?.trim().slice(0, 200) || "",
    };
    console.log("Sending CUSTOM_CLICK_EVENT:", clickData);
    chrome.runtime.sendMessage({
      type: "CUSTOM_CLICK_EVENT",
      payload: clickData,
    });
  } catch (error) {
    console.error("Error capturing click data:", error);
  }
}
// --- 点击事件处理器结束 ---

// --- 自定义输入事件处理器 ---
function handleInput(event: Event) {
  if (!isRecordingActive) return;
  const targetElement = event.target as HTMLInputElement | HTMLTextAreaElement;
  if (!targetElement || !("value" in targetElement)) return;
  const isPassword = targetElement.type === "password";

  try {
    const xpath = getXPath(targetElement);
    const inputData = {
      timestamp: Date.now(),
      url: document.location.href,
      frameUrl: window.location.href,
      xpath: xpath,
      cssSelector: getEnhancedCSSSelector(targetElement, xpath),
      elementTag: targetElement.tagName,
      value: isPassword ? "********" : targetElement.value, // 密码字段打码
    };
    console.log("Sending CUSTOM_INPUT_EVENT:", inputData);
    chrome.runtime.sendMessage({
      type: "CUSTOM_INPUT_EVENT",
      payload: inputData,
    });
  } catch (error) {
    console.error("Error capturing input data:", error);
  }
}
// --- 输入事件处理器结束 ---

// --- 自定义选择框变更事件处理器 ---
function handleSelectChange(event: Event) {
  if (!isRecordingActive) return;
  const targetElement = event.target as HTMLSelectElement;
  // 确保是select元素
  if (!targetElement || targetElement.tagName !== "SELECT") return;

  try {
    const xpath = getXPath(targetElement);
    const selectedOption = targetElement.options[targetElement.selectedIndex];
    const selectData = {
      timestamp: Date.now(),
      url: document.location.href,
      frameUrl: window.location.href,
      xpath: xpath,
      cssSelector: getEnhancedCSSSelector(targetElement, xpath),
      elementTag: targetElement.tagName,
      selectedValue: targetElement.value,
      selectedText: selectedOption ? selectedOption.text : "", // 获取选中选项的文本
    };
    console.log("Sending CUSTOM_SELECT_EVENT:", selectData);
    chrome.runtime.sendMessage({
      type: "CUSTOM_SELECT_EVENT",
      payload: selectData,
    });
  } catch (error) {
    console.error("Error capturing select change data:", error);
  }
}
// --- 选择框事件处理器结束 ---

// --- 自定义按键事件处理器 ---
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

function handleKeydown(event: KeyboardEvent) {
  if (!isRecordingActive) return;

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
      const keyData = {
        timestamp: Date.now(),
        url: document.location.href,
        frameUrl: window.location.href,
        key: keyToLog, // 按下的键或组合键
        xpath: xpath, // 焦点元素的XPath
        cssSelector: cssSelector, // 焦点元素的CSS选择器
        elementTag: elementTag, // 焦点元素的标签名
      };
      console.log("Sending CUSTOM_KEY_EVENT:", keyData);
      chrome.runtime.sendMessage({
        type: "CUSTOM_KEY_EVENT",
        payload: keyData,
      });
    } catch (error) {
      console.error("Error capturing keydown data:", error);
    }
  }
}
// --- 按键事件处理器结束 ---

// 存储当前的覆盖层以管理其生命周期
let currentOverlay: HTMLDivElement | null = null;
let currentFocusOverlay: HTMLDivElement | null = null;

// 处理鼠标悬停以创建覆盖层
function handleMouseOver(event: MouseEvent) {
  if (!isRecordingActive) return;
  const targetElement = event.target as HTMLElement;
  if (!targetElement) return;

  // 移除已存在的覆盖层以避免重复
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }

  try {
    const xpath = getXPath(targetElement);
    let elementToHighlight: HTMLElement | null = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue as HTMLElement | null;
    if (!elementToHighlight) {
      const enhancedSelector = getEnhancedCSSSelector(targetElement, xpath);
      console.log("CSS Selector:", enhancedSelector);
      const elements = document.querySelectorAll<HTMLElement>(enhancedSelector);

      // 尝试找到鼠标下的元素
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          elementToHighlight = el;
          break;
        }
      }
    }
    if (elementToHighlight) {
      const rect = elementToHighlight.getBoundingClientRect();
      const highlightOverlay = document.createElement("div");
      highlightOverlay.className = "highlight-overlay";
      Object.assign(highlightOverlay.style, {
        position: "absolute",
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: "2px solid lightgreen",
        backgroundColor: "rgba(144, 238, 144, 0.05)", // 浅绿色
        pointerEvents: "none",
        zIndex: "2147483000",
      });
      document.body.appendChild(highlightOverlay);
      currentOverlay = highlightOverlay;
    } else {
      console.warn("No element found to highlight for xpath:", xpath);
    }
  } catch (error) {
    console.error("Error creating highlight overlay:", error);
  }
}

// 处理鼠标移出以移除覆盖层
function handleMouseOut(event: MouseEvent) {
  if (!isRecordingActive) return;
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
}

// 处理焦点事件以为输入元素创建红色覆盖层
function handleFocus(event: FocusEvent) {
  if (!isRecordingActive) return;
  const targetElement = event.target as HTMLElement;
  if (
    !targetElement ||
    !["INPUT", "TEXTAREA", "SELECT"].includes(targetElement.tagName)
  )
    return;

  // 移除已存在的焦点覆盖层
  if (currentFocusOverlay) {
    currentFocusOverlay.remove();
    currentFocusOverlay = null;
  }

  try {
    const xpath = getXPath(targetElement);
    let elementToHighlight: HTMLElement | null = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    ).singleNodeValue as HTMLElement | null;
    if (!elementToHighlight) {
      const enhancedSelector = getEnhancedCSSSelector(targetElement, xpath);
      elementToHighlight = document.querySelector(enhancedSelector);
    }
    if (elementToHighlight) {
      const rect = elementToHighlight.getBoundingClientRect();
      const focusOverlay = document.createElement("div");
      focusOverlay.className = "focus-overlay";
      Object.assign(focusOverlay.style, {
        position: "absolute",
        top: `${rect.top + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: "2px solid red",
        backgroundColor: "rgba(255, 0, 0, 0.05)", // 浅红色
        pointerEvents: "none",
        zIndex: "2147483100", // 高于鼠标悬停覆盖层
      });
      document.body.appendChild(focusOverlay);
      currentFocusOverlay = focusOverlay;
    } else {
      console.warn("No element found to highlight for focus, xpath:", xpath);
    }
  } catch (error) {
    console.error("Error creating focus overlay:", error);
  }
}

// 处理失焦事件以移除焦点覆盖层
function handleBlur(event: FocusEvent) {
  if (!isRecordingActive) return;
  if (currentFocusOverlay) {
    currentFocusOverlay.remove();
    currentFocusOverlay = null;
  }
}

// 导出默认的内容脚本配置
export default defineContentScript({
  matches: ["<all_urls>"], // 匹配所有URL
  main(ctx) {
    // 监听来自后台脚本的状态更新
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 设置录制状态的消息类型
      if (message.type === "SET_RECORDING_STATUS") {
        const shouldBeRecording = message.payload;
        console.log(`Received recording status update: ${shouldBeRecording}`);
        if (shouldBeRecording && !isRecordingActive) {
          startRecorder();
        } else if (!shouldBeRecording && isRecordingActive) {
          stopRecorder();
        }
      }
      // 如果需要,在这里处理其他消息类型
    });

    // 脚本加载时请求初始状态
    console.log(
      "Content script loaded, requesting initial recording status..."
    );
    chrome.runtime.sendMessage(
      { 
        type: "REQUEST_RECORDING_STATUS" // 请求获取当前录制状态
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error requesting initial status:",
            chrome.runtime.lastError.message
          );
          return;
        }
        if (response && response.isRecordingEnabled) {
          console.log("Initial status: Recording enabled.");
          startRecorder();
        } else {
          console.log("Initial status: Recording disabled.");
          stopRecorder();
        }
      }
    );

    // 页面卸载时清理录制器
    window.addEventListener("beforeunload", () => {
      // 移除所有永久监听器
      document.removeEventListener("click", handleCustomClick, true);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("change", handleSelectChange, true);
      document.removeEventListener("keydown", handleKeydown, true);
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      document.removeEventListener("focus", handleFocus, true);
      document.removeEventListener("blur", handleBlur, true);
      stopRecorder(); // 确保停止rrweb
    });
  },
});

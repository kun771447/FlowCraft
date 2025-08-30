import { getXPath, getEnhancedCSSSelector } from "./util";

// 存储当前的覆盖层以管理其生命周期
let currentOverlay: HTMLDivElement | null = null;
let currentFocusOverlay: HTMLDivElement | null = null;

// 处理鼠标悬停以创建覆盖层
export function handleMouseOver(event: MouseEvent) {
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
export function handleMouseOut(event: MouseEvent) {
  if (currentOverlay) {
    currentOverlay.remove();
    currentOverlay = null;
  }
}

// 处理焦点事件以为输入元素创建红色覆盖层
export function handleFocus(event: FocusEvent) {
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
export function handleBlur(event: FocusEvent) {
  if (currentFocusOverlay) {
    currentFocusOverlay.remove();
    currentFocusOverlay = null;
  }
}

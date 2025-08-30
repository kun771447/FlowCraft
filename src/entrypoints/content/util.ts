// --- 生成元素 XPath 的辅助函数 ---
export function getXPath(element: HTMLElement): string {
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

export function getEnhancedCSSSelector(
  element: HTMLElement,
  xpath: string
): string {
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

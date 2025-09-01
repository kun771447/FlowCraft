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

type throttleOptions = {
  leading?: boolean;
  trailing?: boolean;
};

/**
 * 节流函数 - 用于控制事件触发频率，避免短时间内重复执行
 * 
 * @param func 需要节流的函数
 * @param wait 等待时间间隔(ms)
 * @param options 配置选项
 *   - leading: 是否在开始时立即执行一次(默认true)
 *   - trailing: 是否在结束时再执行一次(默认true) 
 */

export function throttle<T>(
  func: (arg: T) => void,
  wait: number,
  options: throttleOptions = {}
) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let previous = 0; // 上次执行的时间戳

  return function (...args: T[]) {
    const now = Date.now();
    // 如果是第一次调用且配置了不立即执行
    if (!previous && options.leading === false) {
      previous = now;
    }

    const remaining = wait - (now - previous); // 距离下次执行的剩余时间
    const context = this;

    // 如果已经到了该执行的时间
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      func.apply(context, args);
    }
    // 如果还没到时间且允许结束后执行,则设置定时器
    else if (!timeout && options.trailing !== false) {
      timeout = setTimeout(() => {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        func.apply(context, args);
      }, remaining);
    }
  };
}


// Event.path is non-standard and used in some older browsers
type NonStandardEvent = Omit<Event, 'composedPath'> & {
  path: EventTarget[];
};

export function getEventTarget(event: Event | NonStandardEvent): EventTarget | null {
  try {
    if ('composedPath' in event) {
      const path = event.composedPath();
      if (path.length) {
        return path[0];
      }
    } else if ('path' in event && event.path.length) {
      return event.path[0];
    }
  } catch {
    // fallback to `event.target` below
  }

  return event && event.target;
}

type PrototypeOwner = Node | ShadowRoot | MutationObserver | Element;
type TypeofPrototypeOwner =
  | typeof Node
  | typeof ShadowRoot
  | typeof MutationObserver
  | typeof Element;

type BasePrototypeCache = {
  Node: typeof Node.prototype;
  ShadowRoot: typeof ShadowRoot.prototype;
  MutationObserver: typeof MutationObserver.prototype;
  Element: typeof Element.prototype;
};

const testableAccessors = {
  Node: ['childNodes', 'parentNode', 'parentElement', 'textContent'] as const,
  ShadowRoot: ['host', 'styleSheets'] as const,
  Element: ['shadowRoot', 'querySelector', 'querySelectorAll'] as const,
  MutationObserver: [] as const,
} as const;

const testableMethods = {
  Node: ['contains', 'getRootNode'] as const,
  ShadowRoot: ['getSelection'],
  Element: [],
  MutationObserver: ['constructor'],
} as const;

const untaintedBasePrototype: Partial<BasePrototypeCache> = {};

/*
 When angular patches things - particularly the MutationObserver -
 they pass the `isNativeFunction` check
 That then causes performance issues
 because Angular's change detection
 doesn't like sharing a mutation observer
 Checking for the presence of the Zone object
 on global is a good-enough proxy for Angular
 to cover most cases
 (you can configure zone.js to have a different name
  on the global object and should then manually run rrweb
  outside the Zone)
 */
export const isAngularZonePresent = (): boolean => {
  return !!(globalThis as { Zone?: unknown }).Zone;
};

export function getUntaintedPrototype<T extends keyof BasePrototypeCache>(
  key: T,
): BasePrototypeCache[T] {
  if (untaintedBasePrototype[key])
    return untaintedBasePrototype[key] as BasePrototypeCache[T];

  const defaultObj = globalThis[key] as TypeofPrototypeOwner;
  const defaultPrototype = defaultObj.prototype as BasePrototypeCache[T];

  // use list of testable accessors to check if the prototype is tainted
  const accessorNames =
    key in testableAccessors ? testableAccessors[key] : undefined;
  const isUntaintedAccessors = Boolean(
    accessorNames &&
      // @ts-expect-error 2345
      accessorNames.every((accessor: keyof typeof defaultPrototype) =>
        Boolean(
          Object.getOwnPropertyDescriptor(defaultPrototype, accessor)
            ?.get?.toString()
            .includes('[native code]'),
        ),
      ),
  );

  const methodNames = key in testableMethods ? testableMethods[key] : undefined;
  const isUntaintedMethods = Boolean(
    methodNames &&
      methodNames.every(
        // @ts-expect-error 2345
        (method: keyof typeof defaultPrototype) =>
          typeof defaultPrototype[method] === 'function' &&
          defaultPrototype[method]?.toString().includes('[native code]'),
      ),
  );

  if (isUntaintedAccessors && isUntaintedMethods && !isAngularZonePresent()) {
    untaintedBasePrototype[key] = defaultObj.prototype as BasePrototypeCache[T];
    return defaultObj.prototype as BasePrototypeCache[T];
  }

  try {
    const iframeEl = document.createElement('iframe');
    document.body.appendChild(iframeEl);
    const win = iframeEl.contentWindow;
    if (!win) return defaultObj.prototype as BasePrototypeCache[T];

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
    const untaintedObject = (win as any)[key]
      .prototype as BasePrototypeCache[T];
    // cleanup
    document.body.removeChild(iframeEl);

    if (!untaintedObject) return defaultPrototype;

    return (untaintedBasePrototype[key] = untaintedObject);
  } catch {
    return defaultPrototype;
  }
}

const untaintedAccessorCache: Record<
  string,
  (this: PrototypeOwner, ...args: unknown[]) => unknown
> = {};

function getUntaintedAccessor<
  K extends keyof BasePrototypeCache,
  T extends keyof BasePrototypeCache[K],
>(
  key: K,
  instance: BasePrototypeCache[K],
  accessor: T,
): BasePrototypeCache[K][T] {
  const cacheKey = `${key}.${String(accessor)}`;
  if (untaintedAccessorCache[cacheKey])
    return untaintedAccessorCache[cacheKey].call(
      instance,
    ) as BasePrototypeCache[K][T];

  const untaintedPrototype = getUntaintedPrototype(key);
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const untaintedAccessor = Object.getOwnPropertyDescriptor(
    untaintedPrototype,
    accessor,
  )?.get;

  if (!untaintedAccessor) return instance[accessor];

  untaintedAccessorCache[cacheKey] = untaintedAccessor;

  return untaintedAccessor.call(instance) as BasePrototypeCache[K][T];
}

export function parentElement(n: Node): HTMLElement | null {
  return getUntaintedAccessor('Node', n, 'parentElement');
}


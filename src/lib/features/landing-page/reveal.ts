interface Options {
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
  delay?: number;
}

export const reveal = (node: HTMLElement, options: Options = {}) => {
  const {
    rootMargin = "0px 0px -8% 0px",
    threshold = 0.12,
    once = true,
    delay = 0,
  } = options;

  if (typeof window === "undefined") {
    return {};
  }

  const reduce = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (reduce) {
    node.classList.add("is-in");
    return {};
  }

  node.classList.add("reveal");
  if (delay) {
    node.style.transitionDelay = `${delay}ms`;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          if (!once) {
            entry.target.classList.remove("is-in");
          }
          continue;
        }
        entry.target.classList.add("is-in");
        if (once) {
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin, threshold }
  );
  observer.observe(node);

  return {
    destroy() {
      observer.disconnect();
    },
  };
};

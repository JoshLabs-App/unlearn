// 结算页数字滚动动画用的小 hook——从 0 缓动滚到目标值，纯 JS state + rAF，不需要
// Reanimated（数值要落到普通 <Text> 上，用 Reanimated 的 useAnimatedProps 接文本得
// 绕 TextInput hack，对这里这种"进屏幕播一次"的场景没必要）。
import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = Date.now();
    function tick() {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

// HUD 里常驻的分数用这个，不是 useCountUp——那个每次 target 变都从 0 重新滚，
// 適合"进屏幕播一次"的结算数字，但分数是随时在涨的，每答对一题 target 就变一次，
// 用 useCountUp 会变成"数字瞬间归零再冲上去"，很像坏了。这个改成从"上一次显示的
// 值"滚到新目标，才是"分数往上爬一截"的效果。
export function useLiveCounter(target: number, durationMs = 450): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let raf: number;
    const start = Date.now();
    function tick() {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

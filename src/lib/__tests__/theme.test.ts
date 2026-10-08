import { act, renderHook } from "@testing-library/react";
import { resolveTheme, useTheme } from "../theme";

function mockMatchMedia(dark: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  const mq = {
    matches: dark,
    addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.add(l),
    removeEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => listeners.delete(l),
  };
  window.matchMedia = vi.fn(() => mq) as unknown as typeof window.matchMedia;
  return (next: boolean) => {
    mq.matches = next;
    listeners.forEach((l) => l({ matches: next } as MediaQueryListEvent));
  };
}

describe("theme", () => {
  it("resolves auto from the system", () => {
    expect(resolveTheme("auto", true)).toBe("mocha");
    expect(resolveTheme("auto", false)).toBe("latte");
    expect(resolveTheme("latte", true)).toBe("latte");
    expect(resolveTheme("mocha", false)).toBe("mocha");
  });

  it("follows system changes under auto", () => {
    const flip = mockMatchMedia(true);
    renderHook(() => useTheme("auto"));
    expect(document.documentElement.dataset.theme).toBe("mocha");
    act(() => flip(false));
    expect(document.documentElement.dataset.theme).toBe("latte");
  });

  it("forced theme ignores the system", () => {
    const flip = mockMatchMedia(true);
    renderHook(() => useTheme("latte"));
    expect(document.documentElement.dataset.theme).toBe("latte");
    act(() => flip(true));
    expect(document.documentElement.dataset.theme).toBe("latte");
  });
});

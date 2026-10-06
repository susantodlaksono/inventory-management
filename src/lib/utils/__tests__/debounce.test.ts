import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { debounce } from "../debounce";

describe("debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("only calls once with the latest arguments after the wait", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 300);
    debounced("p");
    debounced("ph");
    vi.advanceTimersByTime(299);
    debounced("pho");
    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("pho");
  });

  it("can be cancelled", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced(1);
    expect(debounced.pending()).toBe(true);
    debounced.cancel();
    expect(debounced.pending()).toBe(false);
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();
  });

  it("can be flushed immediately", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced("now");
    debounced.flush();
    expect(fn).toHaveBeenCalledWith("now");
    debounced.flush();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

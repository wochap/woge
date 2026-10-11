import { describe, expect, it } from "vitest";
import { suppressContextMenu } from "../contextmenu";

describe("suppressContextMenu", () => {
  it("default-prevents contextmenu events", () => {
    suppressContextMenu();
    const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    document.body.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(true);
  });
});

import { useEditor } from "../editor";
import type { BadgeObj } from "../../model/objects";
import { placeBadge } from "../../tools/badge/editing";

function setup(renumber = true) {
  useEditor
    .getState()
    .loadImage({ width: 100, height: 100, close() {} } as unknown as ImageBitmap, {
      path: null,
      name: "t",
      width: 100,
      height: 100,
    });
  useEditor.setState({ badgeRenumber: renumber });
  return useEditor.getState;
}
const nums = () =>
  useEditor
    .getState()
    .document!.objects.filter((o): o is BadgeObj => o.type === "badge")
    .sort((a, b) => a.z - b.z)
    .map((b) => b.n);
const ids = () => useEditor.getState().document!.objects.map((o) => o.id);

describe("counter badges", () => {
  it("places in sequence and selects the new badge", () => {
    const get = setup();
    for (let i = 0; i < 3; i++) placeBadge({ x: i * 10, y: 0 });
    expect(nums()).toEqual([1, 2, 3]);
    expect(get().nextBadgeNumber()).toBe(4);
    expect(get().selection).toEqual([ids()[2]]);
    expect(get().history!.past.length).toBe(3);
  });

  it("renumbers after deleting from the middle", () => {
    const get = setup();
    for (let i = 0; i < 4; i++) placeBadge({ x: i, y: 0 });
    get().deleteObjects([ids()[1]]);
    expect(nums()).toEqual([1, 2, 3]);
    expect(get().nextBadgeNumber()).toBe(4);
  });

  it("keeps gaps when renumbering is off", () => {
    const get = setup(false);
    for (let i = 0; i < 4; i++) placeBadge({ x: i, y: 0 });
    get().deleteObjects([ids()[1]]);
    expect(nums()).toEqual([1, 3, 4]);
    expect(get().nextBadgeNumber()).toBe(5);
  });

  it("manual number and reset", () => {
    const get = setup();
    for (let i = 0; i < 3; i++) placeBadge({ x: i, y: 0 });
    get().setBadgeNumber(ids()[2], 7);
    expect(nums()).toEqual([1, 2, 7]);
    expect(get().nextBadgeNumber()).toBe(8);
    get().resetBadgeCounter();
    expect(get().nextBadgeNumber()).toBe(1);
    placeBadge({ x: 0, y: 0 });
    placeBadge({ x: 0, y: 0 });
    expect(nums()).toEqual([1, 2, 7, 1, 2]);
  });

  it("duplicate takes the next number", () => {
    const get = setup();
    for (let i = 0; i < 3; i++) placeBadge({ x: i, y: 0 });
    get().duplicate([ids()[1]]);
    expect(nums()).toEqual([1, 2, 3, 4]);
    get().duplicate(ids().slice(0, 2));
    expect(nums()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

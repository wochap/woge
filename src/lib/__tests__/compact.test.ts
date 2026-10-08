import { compactRules } from "../compact";

describe("compact rules", () => {
  it("default window is not compact", () => {
    expect(compactRules(1280, 800)).toEqual({ narrow: false, short: false });
  });
  it("thresholds are exclusive at 960×600", () => {
    expect(compactRules(960, 600)).toEqual({ narrow: false, short: false });
    expect(compactRules(959, 599)).toEqual({ narrow: true, short: true });
  });
  it("minimum window is narrow and short", () => {
    expect(compactRules(640, 520)).toEqual({ narrow: true, short: true });
  });
});

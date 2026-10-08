import { createLoadGuard } from "../decode";

it("only the latest load is current", () => {
  const g = createLoadGuard();
  const a = g.begin();
  const b = g.begin();
  expect(g.isCurrent(a)).toBe(false);
  expect(g.isCurrent(b)).toBe(true);
});

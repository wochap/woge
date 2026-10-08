import Konva from "konva";
import {
  buildExportStage,
  exportDocument,
  formatFromExt,
  resolveFormat,
  rewriteExtension,
} from "../export";
import { newDocument, type Document } from "../../model/document";
import { rotateDocument } from "../../model/geometry";
import { useEditor } from "../../store/editor";

const bitmap = { width: 1920, height: 1080 } as unknown as CanvasImageSource;

function doc(): Document {
  const d = newDocument({ path: "/tmp/shot.png", name: "shot.png", width: 1920, height: 1080 });
  return { ...d, crop: { x: 100, y: 50, w: 1000, h: 500 }, size: { w: 500, h: 250 } };
}

/** jsdom has no canvas: encode the stage tree and requested size instead of pixels. */
function fakeCanvas(
  stage: Konva.Stage,
  cfg: { width?: number; height?: number; pixelRatio?: number },
) {
  const json = JSON.stringify({ tree: stage.toJSON(), cfg });
  return {
    toBlob(cb: (b: Blob) => void, type: string) {
      cb(new Blob([json], { type: type === "image/webp" ? "image/png" : type }));
    },
  } as unknown as HTMLCanvasElement;
}

describe("exportDocument", () => {
  beforeEach(() => {
    // Konva builds scene/hit canvases on construction; any 2D call is a no-op here.
    const ctx = new Proxy({} as Record<string | symbol, unknown>, {
      get: (t, k) =>
        k in t
          ? t[k]
          : k === "getImageData"
            ? () => ({ data: new Uint8ClampedArray(4) })
            : () => ({}),
      set: (t, k, v) => ((t[k] = v), true),
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
    vi.spyOn(Konva.Stage.prototype, "toCanvas").mockImplementation(function (
      this: Konva.Stage,
      cfg,
    ) {
      return fakeCanvas(this, cfg ?? {});
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const decode = async (bytes: Uint8Array) => JSON.parse(new TextDecoder().decode(bytes));

  it("is independent of viewport zoom", async () => {
    useEditor.setState({ viewport: { x: 0, y: 0, scale: 0.25 } });
    const a = await exportDocument(doc(), bitmap, "png");
    useEditor.setState({ viewport: { x: -400, y: 90, scale: 4 } });
    const b = await exportDocument(doc(), bitmap, "png");
    expect(a.bytes).toEqual(b.bytes);
  });

  it("renders at output size, pixelRatio 1", async () => {
    const out = await decode((await exportDocument(doc(), bitmap, "png")).bytes);
    expect(out.cfg).toMatchObject({ width: 500, height: 250, pixelRatio: 1 });
    const tree = JSON.parse(out.tree);
    expect(tree.attrs).toMatchObject({ width: 500, height: 250 });
  });

  it("includes rotation and flattens JPEG onto white", async () => {
    const d = rotateDocument(doc(), "cw");
    const out = await decode((await exportDocument(d, bitmap, "jpeg", 0.92)).bytes);
    const s = out.tree as string;
    expect(s).toContain('"fill":"#fff"');
    expect(s).toContain('"rotation":90');
  });

  it("falls back to PNG when WebP cannot be encoded", async () => {
    const r = await exportDocument(doc(), bitmap, "webp", 0.9);
    expect(r.format).toBe("png");
  });

  it("exports objects with the flavour's palette", () => {
    const d: Document = {
      ...doc(),
      objects: [
        {
          id: "r1",
          type: "rect",
          z: 1,
          x: 200,
          y: 100,
          w: 50,
          h: 40,
          stroke: "red",
          strokeWidth: "M",
          fill: false,
        },
      ],
    };
    const stage = buildExportStage(d, bitmap, "png", "latte");
    const node = stage.findOne("#r1")!;
    expect(node.getAttr("stroke")).toBe("#d20f39");
    expect(node.getAttr("strokeWidth")).toBe(4);
    stage.destroy();
  });

  it("bakes redact regions: cached, filtered crop of the base bitmap", () => {
    const d: Document = {
      ...rotateDocument(doc(), "cw"),
      objects: [
        {
          id: "x1",
          z: 1,
          type: "redact",
          x: 10,
          y: 20,
          w: 30,
          h: 40,
          mode: "pixelate",
          strength: 16,
        },
        { id: "x2", z: 2, type: "redact", x: 0, y: 0, w: 5, h: 5, mode: "blur", strength: 8 },
      ],
    };
    const cache = vi.spyOn(Konva.Image.prototype, "cache");
    const stage = buildExportStage(d, bitmap, "png");
    const img = (stage.findOne("#x1") as Konva.Group).findOne("Image") as Konva.Image;
    expect(img.image()).toBe(bitmap);
    expect(img.filters()).toEqual([Konva.Filters.Pixelate]);
    expect(img.pixelSize()).toBe(16);
    expect(img.rotation()).toBe(90);
    // Rotated-space (10, 20, 30×40) maps back to base (20, 1040, 40×30) for a 1920×1080 base.
    expect(img.crop()).toEqual({ x: 20, y: 1040, width: 40, height: 30 });
    const blur = (stage.findOne("#x2") as Konva.Group).findOne("Image") as Konva.Image;
    expect(blur.filters()).toEqual([Konva.Filters.Blur]);
    expect(blur.blurRadius()).toBe(8);
    expect(cache).toHaveBeenCalledTimes(2);
    expect(cache).toHaveBeenCalledWith({ pixelRatio: 1 });
    stage.destroy();
  });
});

describe("format resolution", () => {
  it("explicit > source extension > png", () => {
    expect(resolveFormat("webp", "/a.jpg")).toBe("webp");
    expect(resolveFormat(null, "/a.JPG")).toBe("jpeg");
    expect(resolveFormat(null, "/a.gif")).toBe("png");
    expect(resolveFormat(null, null)).toBe("png");
    expect(formatFromExt("jpeg")).toBe("jpeg");
  });

  it("rewrites extensions", () => {
    expect(rewriteExtension("/t/out.jpg", "webp")).toBe("/t/out.webp");
    expect(rewriteExtension("/t/out.jpeg", "jpeg")).toBe("/t/out.jpeg");
    expect(rewriteExtension("/t/out.bmp", "png")).toBe("/t/out.bmp.png");
    expect(rewriteExtension("/t.d/out", "png")).toBe("/t.d/out.png");
  });
});

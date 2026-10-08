## ADDED Requirements

### Requirement: Export renders the document at output size
Export SHALL render the document on an offscreen stage of exactly `size.w × size.h` pixels at pixelRatio 1, independent of viewport zoom, window size and display scale, including rotation, crop, scale and all objects.

#### Scenario: Zoom does not matter
- **WHEN** the same document is exported at 25% and at 400% viewport zoom
- **THEN** both outputs are byte-identical

#### Scenario: Resized document
- **WHEN** a 1920×1080 crop with size 960×540 is exported
- **THEN** the output image is 960×540 and is downscaled from the original pixels

### Requirement: Output formats
Export SHALL support PNG (lossless, default), JPEG (`jpeg_quality`, default 92, transparency flattened to white) and WebP (`webp_quality`, default 90). Format resolves as `--format` flag, then `-o` extension, then config `format`, then source extension, then PNG.

#### Scenario: Source extension wins by default
- **WHEN** a `.jpg` source is saved in place with no flags or config
- **THEN** the output is JPEG

#### Scenario: Flag beats extension
- **WHEN** `--format png -o out.jpg` is given
- **THEN** the file written is PNG data and the path is rewritten to `out.png`

#### Scenario: Unsupported WebP encoder
- **WHEN** the webview cannot encode WebP
- **THEN** export falls back to PNG and a toast "WebP not supported here, saved as PNG" is shown

### Requirement: Bytes are transferred without encoding overhead
Exported bytes SHALL be passed to the backend as binary (`Uint8Array`), not base64 strings.

#### Scenario: Large image
- **WHEN** a 30 MB PNG is exported
- **THEN** the IPC payload is the raw 30 MB and the save completes without a string conversion

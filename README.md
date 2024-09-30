sgrp
====

Convert ANSI SGR (color/style) escape sequences to appropriately-styled HTML spans in TypeScript.


Usage
-----

### Backend

Import sgrp from JSR and use it in your code. Example [Deno](https://deno.com/) program to
convert colored terminal output from stdin to HTML on stdout:

```typescript
import { SGRToStringTransformer } from "jsr:@mkuranowski/sgrp";
await Deno.stdin.readable
    .pipeThrough(new TextDecoderStream())
    .pipeThrough((new SGRToStringTransformer()).toStream())
    .pipeThrough(new TransformStream({
        start: (controller) => controller.enqueue("<!DOCTYPE html><html><body><pre>"),
        flush: (controller) => controller.enqueue("</pre></body></html>"),
    }))
    .pipeThrough(new TextEncoderStream())
    .pipeTo(Deno.stdout.writable);
```

### Frontend

Download sgrp.js [Javascript module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
from GitHub releases and put it in your server. This example below will load a colored terminal
output file provided by the user and render it in a `<pre>` container:


```html
<!DOCTYPE html>
<html>
<body>
    <h3>Upload console output:</h3>
    <input type="file" id="fileSelector" />
    <h3>Rendered HTML:</h3>
    <pre id="outputElement"></pre>
</body>
<script type="module">
    import { SGRToElementSink } from "./sgrp.js";
    const fileSelector = document.getElementById("fileSelector");
    const outputElement = document.getElementById("outputElement");
    fileSelector.addEventListener("change", async () => {
        outputElement.innerText = "";
        if (fileSelector.files !== null && fileSelector.files.length > 0) {
            await fileSelector.files[0].stream()
                .pipeThrough(new TextDecoderStream())
                .pipeTo((new SGRToElementSink(outputElement)).toStream());
        }
    });
</script>
</html>
```

Supported Features
------------------

sgrp only "consumes" [Select Graphic Rendition](https://en.wikipedia.org/wiki/ANSI_escape_code#SGR_(Select_Graphic_Rendition)_parameters)
[ANSI escape sequences](https://en.wikipedia.org/wiki/ANSI_escape_code). Any other ANSI escape sequence
is passed as-is.

Only the following SGRs are supported. Everything else is silently ignored:

| Number | Name             | Applied CSS                               | Overwritten by |
|--------|------------------|-------------------------------------------|----------------|
| 0      | Reset            | (everything removed)                      | (anything other than 0) |
| 1      | Bold             | font-weight: bolder                       | 0, 2, 22       |
| 2      | Faint            | font-weight: lighter                      | 0, 1, 22       |
| 3      | Italic           | font-style: italic                        | 0, 23          |
| 4      | Underline        | text-decoration: underline                | 0, 24          |
| 9      | Crossed out      | text-decoration: line-through             | 0, 29          |
| 22     | Normal intensity | removed font-weight                       | 1, 2           |
| 23     | Not italic       | removed font-style                        | 3              |
| 24     | Not underlined   | removed underline from text-decoration    | 4              |
| 29     | Not crossed out  | removed line-through from text-decoration | 9              |
| 30     | foreground black | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 31     | fg red           | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 32     | fg green         | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 33     | fg yellow        | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 34     | fg blue          | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 35     | fg magenta       | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 36     | fg cyan          | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 37     | fg white         | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 38     | fg custom        | set color; see below for details          | 0, 30-39, 90-97 |
| 39     | default fg       | removed color                             | 0, 30-39, 90-97 |
| 40     | background black | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 41     | bg red           | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 42     | bg green         | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 43     | bg yellow        | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 44     | bg blue          | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 45     | bg magenta       | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 46     | bg cyan          | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 47     | bg white         | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 48     | bg custom        | set background-color; see below for details | 0, 40-49, 100-107 |
| 49     | default bg       | removed background-color                    | 0, 40-49, 100-107 |
| 90     | fg bright black   | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 91     | fg bright red     | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 92     | fg bright green   | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 93     | fg bright yellow  | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 94     | fg bright blue    | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 95     | fg bright magenta | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 96     | fg bright cyan    | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 97     | fg bright white   | color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 30-39, 90-97 |
| 100    | bg bright black   | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 101    | bg bright red     | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 102    | bg bright green   | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 103    | bg bright yellow  | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 104    | bg bright blue    | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 105    | bg bright magenta | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 106    | bg bright cyan    | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |
| 107    | bg bright white   | background-color: (value from [options](#options) or [defaultPalette](#defaultpalette)) | 0, 40-49, 100-107 |

Parameters 38 and 48 must be followed by `5;n` or `2;r;g;b`, where n, r, g & b are integers
between 0 and 255 (inclusive). Any missing or invalid parameters cause the 38/48 and all following
parameters to be ignored, accompanied by a warning.

The format `2;r;b;g` cause color or background-color to be set to `rgb(r,g,b)`.

The format `5;n` has different meanings depending on the value of n:

- values 0 through 7 have the same meaning as "set standard color" (parameters 30-37/40-47);
- values 8 through 15 have the same meaning as "set bright color" (parameters 90-97/100-107);
- values 16 though 231 select a colors from [a 6x6x6 colors cube](http://www.alcyone.com/max/reference/compsci/cube.html),
    computed using this formula: `16 + 36r + 6g + b; 0 ≤ r, g, b ≤ 5`;
- values 232 though 255 select a gray-scale color from #000000 to #fdfdfd,
    computed using this formula: `232 + v * 11; 0 ≤ v ≤ 23`.

Any non-SGR [CSI sequence](https://en.wikipedia.org/wiki/ANSI_escape_code#CSI_(Control_Sequence_Introducer)_sequences)
is passed as-is. SGR parameter list must match `/[0-9;]*/`. Empty parameters, including an empty parameter list
is treated the same as "reset": `\x1B[m` is the same as `\x1B[0m`; `\x1B[2;;1m` is the same as `\x1B[2;0;1m`.

SGR parameters are processed in order they appear. `\x1B[1;0m` is semantically the same as
`\x1B[0m`, as the "bold" is immediately overwritten by a "reset". However, `\x1B[0;1m` is different,
as it first "resets" the style, then enables "bold". `\x1B[1m` is also different, as it only adds
"bold" to the previous style.

sgrp always escapes HTML in its input. This the default behavior when appending text to the DOM.
Not escaping HTML would create malformed output if HTML is intermixed with ANSI escape codes.

API Reference
-------------

### Colors

Colors represents a set of css colors to use when converting ANSI SGR escape sequences to HTML span elements.

```typescript
interface Colors {
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
}
```

### Palette

Palette determines the css colors to use when converting ANSI SGR escape sequence
to HTML span elements.

The "standard" colors are used by SGR parameters 30 to 37 and 40 to 47, while
"bright" colors are used by SGR parameters 90 to 97 and 100 to 107.

```typescript
interface Palette {
    standard: Colors;
    bright: Colors;
}
```

### PartialPalette

PartialPalette is a variant of [Palette](#palette) with all attributes optional.

```typescript
interface PartialPalette {
    standard?: Partial<Colors>;
    bright?: Partial<Colors>;
}
```

### Options

Options customize the ANSI SGR to HTML span conversion process.

`palette` overrides colors from [defaultPalette](#defaultpalette).

`escapeControlCodes`, if set to true, will cause control codes \x00-\x07 and \x0E-\x1F
to be replaced by corresponding [control pictures](https://en.wikipedia.org/wiki/Control_Pictures)
(U+2400-U+241F).

```typescript
interface Options {
    palette?: PartialPalette;
    escapeControlCodes?: boolean;
}
```

### defaultPalette

defaultPalette is the set of default colors used by sgrp.

This object is [recursively frozen](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze).

```typescript
const defaultPalette: Palette = {
    standard: {
        black: "#0c0c0c",
        red: "#c50f1f",
        green: "#13a10e",
        yellow: "#c19c00",
        blue: "#0037da",
        magenta: "#881798",
        cyan: "#3a96dd",
        white: "#cccccc",
    },
    bright: {
        black: "#767676",
        red: "#e74856",
        green: "#16c60c",
        yellow: "#f9f1a5",
        blue: "#3b78ff",
        magenta: "#b4009e",
        cyan: "#61d6d6",
        white: "#f2f2f2",
    },
}
```

### SGRToStringTransformer

SGRToStringTransformer is a `Transformer<string, string>` converting ANSI SGR escape sequences
to appropriately-styled HTML span elements.

Any incoming HTML data is escaped, as otherwise the output might become malformed
(think what would happen on this input: `<\x1B[1mb\x1B[m>`).

```typescript
class SGRToStringTransformer implements Transformer<string, string> {
    constructor(options: Options = {});
}
```

#### SGRToStringTransformer.transform

transform processes a chunk of input string. Part of the
[TransformStream's transformer API](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream/TransformStream#transformer).

```typescript
class SGRToStringTransformer {
    transform(chunk: string, controller: TransformStreamDefaultController<string>): void;
}
```

#### SGRToStringTransformer.flush

flush marks the end of stream. Part of the
[TransformStream's transformer API](https://developer.mozilla.org/en-US/docs/Web/API/TransformStream/TransformStream#transformer).

```typescript
class SGRToStringTransformer {
    flush(controller: TransformStreamDefaultController<string>): void;
}
```

#### SGRToStringTransformer.toStream

Returns a new TransformStream around this SGRToStringTransformer.

```typescript
class SGRToStringTransformer {
    toStream(): TransformStream<string, string>;
}
```

### SGRToElementSink

SGRToElementSink is a `UnderlyingSink<string, string>` converting ANSI SGR escape sequences
to appropriately-styled HTML span elements, which are incrementally appended to the provided
parent element.

Any incoming HTML data is escaped, as otherwise the output might become malformed
(think what would happen on this input: `<\x1B[1mb\x1B[m>`).

```typescript
class SGRToElementSink implements UnderlyingSink<string> {
    constructor(public element: Node, options: Options = {});
}
```

#### SGRToElementSink.write

write processes a chunk of input string. Part of the
[WritableStream's underlyingSink API](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream/WritableStream#underlyingsink).

```typescript
class SGRToElementSink {
    write(chunk: string, _controller?: WritableStreamDefaultController): void;
}
```

#### SGRToElementSink.close

close marks the end of stream. Part of the
[WritableStream's underlyingSink API](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream/WritableStream#underlyingsink).

```typescript
class SGRToElementSink {
    close(): void;
}
```

#### SGRToElementSink.toStream

Returns a new WritableStream around this SGRToElementSink.

```typescript
class SGRToElementSink {
    toStream(): WritableStream<string>;
}
```

### sgrToString

sgrToString converts text containing ANSI SGR escape sequences to text containing
appropriately-styled HTML span elements.

Note that usage of this function should be reserved for testing purposes only.
When appending data to the document, use [sgrToElement](#sgrToElement). When writing data to a file
or over a network, use [SGRToStringTransformer](#sgrtostringtransformer) directly to fully utilize JavaScript's
streaming API.

Any HTML in the input is escaped, as otherwise the output might become malformed
(think what would happen on this input: `<\x1B[1mb\x1B[m>`).

```typescript
function sgrToString(
    source: string | ReadableStream<string>,
    options: Options = {},
): Promise<string>
```

### sgrToElement

sgrToElement converts text containing ANSI SGR escape sequences to a series of
appropriately-styled HTML span elements and incrementally appends them to the provided DOM node.

```typescript
function sgrToElement(
    source: string | ReadableStream<string>,
    element: Node,
    options: Options = {},
): Promise<void>
```

### StringChunkSource

StringChunkSource implements `UnderlyingDefaultSource<string>` over a constant string value.
This makes it possible to jump-start a `ReadableStream<string>` using a single string.

```typescript
class StringChunkSource implements UnderlyingDefaultSource<string> {
    text: string;
    offset: number = 0;

    constructor(text: string);
    pull(controller: ReadableStreamDefaultController<string>): void;
    toStream(): ReadableStream<string>;
}
```

### StringChunkSink

StringChunkSink implements `UnderlyingSink<string>` by collecting all incoming strings
into an array. This makes it possible to jump-start `WritableString<string>` by collecting
all strings into memory.

```typescript
class StringChunkSink implements UnderlyingSink<string> {
    chunks: string[] = [];

    constructor();
    write(chunk: string, _controller?: WritableStreamDefaultController);
    toStream(): WritableStream<string>;
    toString(): string;
}
```


License
-------

sgrp is provided under the MIT license, included in the `LICENSE` file.

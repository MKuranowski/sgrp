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

Download sgrp.js or sgrp.min.js [Javascript module](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
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

```typescript
interface Options {
    palette?: PartialPalette;
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

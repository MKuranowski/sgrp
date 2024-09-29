// Copyright (c) 2024 Mikołaj Kuranowski
// SPDX-License-Identifier: MIT

const htmlEscapes: Record<string, string> = {
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&#39;",
    '"': "&quot;",
};

const htmlEscape = (x: string) => x.replaceAll(/[<>&'"]/g, (c) => htmlEscapes[c]);

/**
 * Colors represents a set of css colors to use when converting ANSI SGR escape sequences
 * to HTML span elements.
 */
export interface Colors {
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
}

/**
 * Palette determines the css colors to use when converting ANSI SGR escape sequences
 * to HTML span elements.
 *
 * The "standard" colors are used by SGR parameters 30 to 37 and 40 to 47, while
 * "bright" colors are used by SGR parameters 90 to 97 and 100 to 107.
 */
export interface Palette {
    standard: Colors;
    bright: Colors;
}

/** PartialPalette is a variant of {@link Palette} with all attributes optional. */
export interface PartialPalette {
    standard?: Partial<Colors>;
    bright?: Partial<Colors>;
}

function resolveColors(a: Partial<Colors> | undefined, b: Colors): Colors {
    return {
        black: a?.black ?? b.black,
        red: a?.red ?? b.red,
        green: a?.green ?? b.green,
        yellow: a?.yellow ?? b.yellow,
        blue: a?.blue ?? b.blue,
        magenta: a?.magenta ?? b.magenta,
        cyan: a?.cyan ?? b.cyan,
        white: a?.white ?? b.white,
    };
}

function resolvePalette(a: PartialPalette | undefined, b: Palette = defaultPalette): Palette {
    return {
        standard: resolveColors(a?.standard, b.standard),
        bright: resolveColors(a?.bright, b.bright),
    };
}

/**
 * defaultPalette is the set of default colors used by sgrp.
 */
export const defaultPalette: Palette = {
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
};

export interface Options {
    palette?: PartialPalette;
}

class Style {
    fontWeight: "" | "bolder" | "lighter" = "";
    fontStyle: "" | "italic" = "";
    textDecorationUnderline: boolean = false;
    textDecorationLineThrough: boolean = false;
    color: string = "";
    backgroundColor: string = "";

    copy(): Style {
        const n = new Style();
        n.fontWeight = this.fontWeight;
        n.fontStyle = this.fontStyle;
        n.textDecorationUnderline = this.textDecorationUnderline;
        n.textDecorationLineThrough = this.textDecorationLineThrough;
        n.color = this.color;
        n.backgroundColor = this.backgroundColor;
        return n;
    }

    equals(o: Style): boolean {
        return this.fontWeight === o.fontWeight && this.fontStyle === o.fontStyle &&
            this.textDecorationUnderline === o.textDecorationUnderline &&
            this.textDecorationLineThrough === o.textDecorationLineThrough &&
            this.color === o.color && this.backgroundColor === o.backgroundColor;
    }

    isEmpty(): boolean {
        return this.fontWeight === "" && this.fontStyle === "" && !this.textDecorationUnderline &&
            !this.textDecorationLineThrough && this.color === "" && this.backgroundColor === "";
    }

    toCssStyle(): string {
        const parts = ['style="'];

        if (this.fontWeight !== "") {
            parts.push("font-weight:");
            parts.push(this.fontWeight);
            parts.push(";");
        }

        if (this.fontStyle !== "") {
            parts.push("font-style:");
            parts.push(this.fontStyle);
            parts.push(";");
        }

        if (this.textDecorationUnderline || this.textDecorationLineThrough) {
            parts.push("text-decoration:");
            parts.push(this.textDecoration);
            parts.push(";");
        }

        if (this.color !== "") {
            parts.push("color:");
            parts.push(this.color); // TODO: escape CSS value
            parts.push(";");
        }

        if (this.backgroundColor !== "") {
            parts.push("background-color:");
            parts.push(this.backgroundColor); // TODO: escape CSS value
            parts.push(";");
        }

        parts.push('"');
        return parts.join("");
    }

    applyTo(s: CSSStyleDeclaration): void {
        s.fontWeight = this.fontWeight;
        s.fontStyle = this.fontStyle;
        s.textDecoration = this.textDecoration;
        s.color = this.color;
        s.backgroundColor = this.backgroundColor;
    }

    get textDecoration(): string {
        if (this.textDecorationUnderline && this.textDecorationLineThrough) {
            return "underline line-through";
        } else if (this.textDecorationUnderline) {
            return "underline";
        } else if (this.textDecorationLineThrough) {
            return "line-through";
        }
        return "";
    }
}

interface Handler {
    onText(t: string): void;
    onStyleChange(s: Style): void;
}

enum State {
    Text,
    Esc,
    Csi,
}

class Parser {
    private static readonly csiArgLenLimit = 64;

    palette: Palette;

    #state: State = State.Text;
    #csiArgs: string = "";
    #csiCommand: string = "";
    #style: Style = new Style();

    constructor(public handler: Handler, options: Options = {}) {
        this.palette = resolvePalette(options.palette);
    }

    push(chunk: string): void {
        while (chunk.length > 0) {
            switch (this.#state) {
                case State.Text:
                    chunk = this.handleText(chunk);
                    break;
                case State.Esc:
                    chunk = this.handleEsc(chunk);
                    break;
                case State.Csi:
                    chunk = this.handleCsi(chunk);
                    break;
            }
        }
    }

    finalize(): void {
        switch (this.#state) {
            case State.Text:
                break; // nothing to do

            case State.Esc:
                this.handler.onText("\x1B");
                break;

            case State.Csi:
                this.dumpUnknownCsi();
                break;
        }
    }

    private handleText(chunk: string): string {
        const escIdx = chunk.indexOf("\x1B");
        if (escIdx < 0) {
            this.handler.onText(chunk);
            return "";
        } else {
            this.handler.onText(chunk.slice(0, escIdx));
            this.#state = State.Esc;
            return chunk.slice(escIdx + 1);
        }
    }

    private handleEsc(chunk: string): string {
        if (chunk.charCodeAt(0) === 0x5B) { // "["
            this.#state = State.Csi;
            return chunk.slice(1);
        } else {
            this.handler.onText("\x1B");
            this.#state = State.Text;
            return chunk;
        }
    }

    private handleCsi(chunk: string): string {
        const spaceLeft = Parser.csiArgLenLimit - this.#csiArgs.length;
        const commandIdx = chunk.search(/[^0-9;]/);

        const argsChunk = commandIdx < 0 ? chunk : chunk.slice(0, commandIdx);
        if (argsChunk.length > spaceLeft) {
            console.error("[sgrp] CSI parameter list too long. Rewriting as-is.");
            this.dumpUnknownCsi();
            return chunk;
        }

        this.#csiArgs += argsChunk;
        if (commandIdx >= 0) {
            this.#csiCommand = chunk.charAt(commandIdx);
            if (this.#csiCommand === "m") {
                this.handleSgr();
            } else {
                this.dumpUnknownCsi();
            }
            return chunk.slice(commandIdx + 1);
        } else {
            return "";
        }
    }

    private handleSgr(): void {
        if (this.#csiArgs.match(/^[0-9;]*$/) === null) {
            console.error("[sgrp]: CSI parameter list doesn't match /^[0-9;]*$/. Rewriting as-is.");
            this.dumpUnknownCsi();
            return;
        }

        const parameters = this.#csiArgs.length > 0
            ? this.#csiArgs.split(";").map((i) => i.length > 0 ? parseInt(i, 10) : 0)
            : [0];

        const newStyle = this.parseSgrParameters(parameters);
        if (!this.#style.equals(newStyle)) {
            this.#style = newStyle;
            this.handler.onStyleChange(this.#style);
        }

        this.#csiArgs = "";
        this.#csiCommand = "";
        this.#state = State.Text;
    }

    private parseSgrParameters(parameters: number[]): Style {
        const newStyle = this.#style.copy();
        for (const parameter of parameters) {
            switch (parameter) {
                case 0:
                    newStyle.fontWeight = "";
                    break;

                case 1:
                    newStyle.fontWeight = "bolder";
                    break;

                case 2:
                    newStyle.fontWeight = "lighter";
                    break;

                case 3:
                    newStyle.fontStyle = "italic";
                    break;

                case 4:
                    newStyle.textDecorationUnderline = true;
                    break;

                case 9:
                    newStyle.textDecorationLineThrough = true;
                    break;

                case 22:
                    newStyle.fontWeight = "";
                    break;

                case 23:
                    newStyle.fontStyle = "";
                    break;

                case 24:
                    newStyle.textDecorationUnderline = false;
                    break;

                case 29:
                    newStyle.textDecorationLineThrough = false;
                    break;

                case 30:
                    newStyle.color = this.palette.standard.black;
                    break;

                case 31:
                    newStyle.color = this.palette.standard.red;
                    break;

                case 32:
                    newStyle.color = this.palette.standard.green;
                    break;

                case 33:
                    newStyle.color = this.palette.standard.yellow;
                    break;

                case 34:
                    newStyle.color = this.palette.standard.blue;
                    break;

                case 35:
                    newStyle.color = this.palette.standard.magenta;
                    break;

                case 36:
                    newStyle.color = this.palette.standard.cyan;
                    break;

                case 37:
                    newStyle.color = this.palette.standard.white;
                    break;

                case 39:
                    newStyle.color = "";
                    break;

                case 40:
                    newStyle.backgroundColor = this.palette.standard.black;
                    break;

                case 41:
                    newStyle.backgroundColor = this.palette.standard.red;
                    break;

                case 42:
                    newStyle.backgroundColor = this.palette.standard.green;
                    break;

                case 43:
                    newStyle.backgroundColor = this.palette.standard.yellow;
                    break;

                case 44:
                    newStyle.backgroundColor = this.palette.standard.blue;
                    break;

                case 45:
                    newStyle.backgroundColor = this.palette.standard.magenta;
                    break;

                case 46:
                    newStyle.backgroundColor = this.palette.standard.cyan;
                    break;

                case 47:
                    newStyle.backgroundColor = this.palette.standard.white;
                    break;

                case 49:
                    newStyle.backgroundColor = "";
                    break;

                case 90:
                    newStyle.color = this.palette.bright.black;
                    break;

                case 91:
                    newStyle.color = this.palette.bright.red;
                    break;

                case 92:
                    newStyle.color = this.palette.bright.green;
                    break;

                case 93:
                    newStyle.color = this.palette.bright.yellow;
                    break;

                case 94:
                    newStyle.color = this.palette.bright.blue;
                    break;

                case 95:
                    newStyle.color = this.palette.bright.magenta;
                    break;

                case 96:
                    newStyle.color = this.palette.bright.cyan;
                    break;

                case 97:
                    newStyle.color = this.palette.bright.white;
                    break;

                case 100:
                    newStyle.backgroundColor = this.palette.bright.black;
                    break;

                case 101:
                    newStyle.backgroundColor = this.palette.bright.red;
                    break;

                case 102:
                    newStyle.backgroundColor = this.palette.bright.green;
                    break;

                case 103:
                    newStyle.backgroundColor = this.palette.bright.yellow;
                    break;

                case 104:
                    newStyle.backgroundColor = this.palette.bright.blue;
                    break;

                case 105:
                    newStyle.backgroundColor = this.palette.bright.magenta;
                    break;

                case 106:
                    newStyle.backgroundColor = this.palette.bright.cyan;
                    break;

                case 107:
                    newStyle.backgroundColor = this.palette.bright.white;
                    break;

                default:
                    break;
            }
        }
        return newStyle;
    }

    private dumpUnknownCsi(): void {
        this.handler.onText(`\x1B[${this.#csiArgs}${this.#csiCommand}`);
        this.#csiArgs = "";
        this.#csiCommand = "";
        this.#state = State.Text;
    }
}

/**
 * SGRToStringTransformer is a Transformer<string, string> converting ANSI SGR escape sequences
 * to appropriately-styled HTML span elements.
 *
 * Any incoming HTML data is escaped, as otherwise the output might become malformed
 * (think what would happen on this input: "<\x1B[1mb\x1B[m>").
 */
export class SGRToStringTransformer implements Transformer<string, string>, Handler {
    parser: Parser;
    #controller: TransformStreamDefaultController<string> | null = null;
    #inSpan: boolean = false;

    constructor(options: Options = {}) {
        this.parser = new Parser(this, options);
    }

    transform(chunk: string, controller: TransformStreamDefaultController<string>): void {
        this.#controller = controller;
        this.parser.push(chunk);
    }

    flush(controller: TransformStreamDefaultController<string>): void {
        this.#controller = controller;
        this.parser.finalize();
        if (this.#inSpan) {
            controller.enqueue("</span>");
            this.#inSpan = false;
        }
    }

    onText(t: string): void {
        this.#controller!.enqueue(htmlEscape(t));
    }

    onStyleChange(s: Style): void {
        if (this.#inSpan) {
            this.#controller!.enqueue("</span>");
            this.#inSpan = false;
        }

        if (!s.isEmpty()) {
            this.#controller!.enqueue(`<span ${s.toCssStyle()}>`);
            this.#inSpan = true;
        }
    }

    toStream(): TransformStream<string, string> {
        return new TransformStream(this);
    }
}

/**
 * SGRToElementSink is a UnderlyingSink<string, string> converting ANSI SGR escape sequences
 * to appropriately-styled HTML span elements, which are incrementally appended to the provided
 * parent element.
 *
 * Any incoming HTML data is escaped, as otherwise the output might become malformed
 * (think what would happen on this input: "<\x1B[1mb\x1B[m>").
 */
export class SGRToElementSink implements UnderlyingSink<string>, Handler {
    parser: Parser;
    #currentSpan: HTMLSpanElement;

    constructor(public element: Node, options: Options = {}) {
        this.parser = new Parser(this, options);
        this.#currentSpan = this.element.appendChild(document.createElement("span"));
    }

    write(chunk: string, _controller: WritableStreamDefaultController): void {
        this.parser.push(chunk);
    }

    close(): void {
        this.parser.finalize();
    }

    onText(t: string): void {
        this.#currentSpan.appendChild(new Text(t));
    }

    onStyleChange(s: Style): void {
        this.#currentSpan = this.element.appendChild(document.createElement("span"));
        s.applyTo(this.#currentSpan.style);
    }

    toStream(): WritableStream<string> {
        return new WritableStream(this);
    }
}

/**
 * StringChunkSource implements UnderlyingDefaultSource<string> over a constant string value.
 * This makes it possible to jump-start a ReadableStream<string> using a single string.
 */
export class StringChunkSource implements UnderlyingDefaultSource<string> {
    text: string;
    offset: number = 0;

    constructor(text: string) {
        this.text = text;
    }

    pull(controller: ReadableStreamDefaultController<string>): void {
        if (this.offset >= this.text.length) controller.close();

        const size = controller.desiredSize;
        if (size === null) {
            controller.enqueue(this.text.slice(this.offset));
            this.offset = this.text.length;
        } else {
            const end = Math.min(this.offset + size, this.text.length);
            controller.enqueue(this.text.slice(this.offset, end));
            this.offset = end;
        }
    }

    toStream(): ReadableStream<string> {
        return new ReadableStream(this);
    }
}

/**
 * StringChunkSink implements UnderlyingSink<string> by collecting all incoming strings
 * into an array. This makes it possible to jump-start WritableString<string> by collecting
 * all strings into memory.
 */
export class StringChunkSink implements UnderlyingSink<string> {
    chunks: string[] = [];

    write(chunk: string, _controller: WritableStreamDefaultController): void {
        this.chunks.push(chunk);
    }

    toStream(): WritableStream<string> {
        return new WritableStream(this);
    }

    toString(): string {
        return this.chunks.join("");
    }
}

/**
 * sgrToString converts text containing ANSI SGR escape sequences to text containing
 * appropriately-styled HTML span elements.
 *
 * Note that usage of this function should be reserved for testing purposes only.
 * When appending data to the document, use {@link sgrToElement}. When writing data to a file
 * or over a network, use {@link SGRToStringTransformer} directly to fully utilize JavaScript's
 * streaming API.
 *
 * Any HTML in the input is escaped, as otherwise the output might become malformed
 * (think what would happen on this input: "<\x1B[1mb\x1B[m>").
 *
 * @param {string | ReadableStream<string>} source string or a ReadableStream over text containing ANSI SGR escape sequences
 * @param {Options} options to customize the conversion process
 * @returns {Promise<string>} promise resolving to a string with HTML span elements
 */
export async function sgrToString(
    source: string | ReadableStream<string>,
    options: Options = {},
): Promise<string> {
    if (typeof source === "string") {
        source = (new StringChunkSource(source)).toStream();
    }
    const transformer = (new SGRToStringTransformer(options)).toStream();
    const sink = new StringChunkSink();
    await source.pipeThrough(transformer).pipeTo(sink.toStream());
    return sink.toString();
}

/**
 * sgrToElement converts text containing ANSI SGR escape sequences to a series of
 * appropriately-styled HTML span elements and incrementally appends them to the provided DOM node.
 *
 * @param {string | ReadableStream<string>} source string or a ReadableStream over text containing ANSI SGR escape sequences
 * @param {Node} element container for all the span tags
 * @param {Options} options to customize the conversion process
 * @returns {Promise<void>} promise resolved when all of the input has been consumed and fully converted
 */
export function sgrToElement(
    source: string | ReadableStream<string>,
    element: Node,
    options: Options = {},
): Promise<void> {
    if (typeof source === "string") {
        source = (new StringChunkSource(source)).toStream();
    }
    const sink = (new SGRToElementSink(element, options)).toStream();
    return source.pipeTo(sink);
}

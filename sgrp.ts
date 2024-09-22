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

class Style {
    fontWeight: "" | "bolder" = "";

    copy(): Style {
        const n = new Style();
        n.fontWeight = this.fontWeight;
        return n;
    }

    equals(o: Style): boolean {
        return this.fontWeight === o.fontWeight;
    }

    isEmpty(): boolean {
        return this.fontWeight === "";
    }

    toCssStyle(): string {
        const parts = ['style="'];

        if (this.fontWeight !== "") {
            parts.push("font-weight:");
            parts.push(this.fontWeight);
            parts.push(";");
        }

        parts.push('"');
        return parts.join("");
    }

    applyTo(s: CSSStyleDeclaration): void {
        s.fontWeight = this.fontWeight;
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

    #state: State = State.Text;
    #csiArgs: string = "";
    #csiCommand: string = "";
    #style: Style = new Style();

    constructor(public handler: Handler) {}

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

    constructor() {
        this.parser = new Parser(this);
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

    constructor(public element: Node) {
        this.parser = new Parser(this);
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
 * @returns {Promise<string>} promise resolving to a string with HTML span elements
 */
export async function sgrToString(source: string | ReadableStream<string>): Promise<string> {
    if (typeof source === "string") {
        source = (new StringChunkSource(source)).toStream();
    }
    const transformer = (new SGRToStringTransformer()).toStream();
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
 * @returns {Promise<void>} promise resolved when all of the input has been consumed and fully converted
 */
export function sgrToElement(
    source: string | ReadableStream<string>,
    element: Node,
): Promise<void> {
    if (typeof source === "string") {
        source = (new StringChunkSource(source)).toStream();
    }
    const sink = (new SGRToElementSink(element)).toStream();
    return source.pipeTo(sink);
}

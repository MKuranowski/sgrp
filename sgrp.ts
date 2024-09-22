// Copyright (c) 2024 Mikołaj Kuranowski
// SPDX-License-Identifier: MIT

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
 * default_palette is the set of default colors used by sgrp.
 */
export const default_palette: Palette = {
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

enum SGRParserState {
    Text,
    Esc,
    Csi,
}

class SGRStyle {
    fontWeight: "" | "bolder" = "";

    copy(): SGRStyle {
        const n = new SGRStyle();
        n.fontWeight = this.fontWeight;
        return n;
    }

    equals(o: SGRStyle): boolean {
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
}

export class SGRParser implements Transformer<string, string> {
    private static readonly csiArgLenLimit = 64;

    #state: SGRParserState = SGRParserState.Text;
    #csiArgs: string = "";
    #csiCommand: string = "";

    #inSpan: boolean = false;
    #style: SGRStyle = new SGRStyle();

    transform(chunk: string, controller: TransformStreamDefaultController<string>): void {
        while (chunk.length > 0) {
            switch (this.#state) {
                case SGRParserState.Text:
                    chunk = this.handleText(chunk, controller);
                    break;
                case SGRParserState.Esc:
                    chunk = this.handleEsc(chunk, controller);
                    break;
                case SGRParserState.Csi:
                    chunk = this.handleCsi(chunk, controller);
                    break;
            }
        }
    }

    flush(controller: TransformStreamDefaultController<string>): void {
        switch (this.#state) {
            case SGRParserState.Text:
                break; // nothing to do

            case SGRParserState.Esc:
                controller.enqueue("\x1B");
                break;

            case SGRParserState.Csi:
                this.dumpUnknownCsi(controller);
                break;
        }

        if (this.#inSpan) {
            controller.enqueue("</span>");
            this.#inSpan = false;
        }
    }

    private handleText(
        chunk: string,
        controller: TransformStreamDefaultController<string>,
    ): string {
        const escIdx = chunk.indexOf("\x1B");
        if (escIdx < 0) {
            controller.enqueue(chunk);
            return "";
        } else {
            controller.enqueue(chunk.slice(0, escIdx));
            this.#state = SGRParserState.Esc;
            return chunk.slice(escIdx + 1);
        }
    }

    private handleEsc(chunk: string, controller: TransformStreamDefaultController<string>): string {
        if (chunk.charCodeAt(0) === 0x5B) { // "["
            this.#state = SGRParserState.Csi;
            return chunk.slice(1);
        } else {
            controller.enqueue("\x1B");
            this.#state = SGRParserState.Text;
            return chunk;
        }
    }

    private handleCsi(chunk: string, controller: TransformStreamDefaultController<string>): string {
        const spaceLeft = SGRParser.csiArgLenLimit - this.#csiArgs.length;
        const commandIdx = chunk.search(/[^0-9;]/);

        const argsChunk = commandIdx < 0 ? chunk : chunk.slice(0, commandIdx);
        if (argsChunk.length > spaceLeft) {
            console.error("[sgrp] CSI parameter list too long. Rewriting as-is.");
            this.dumpUnknownCsi(controller);
            return chunk;
        }

        this.#csiArgs += argsChunk;
        if (commandIdx >= 0) {
            this.#csiCommand = chunk.charAt(commandIdx);
            if (this.#csiCommand === "m") {
                this.handleSgr(controller);
            } else {
                this.dumpUnknownCsi(controller);
            }
            return chunk.slice(commandIdx + 1);
        } else {
            return "";
        }
    }

    private handleSgr(controller: TransformStreamDefaultController<string>): void {
        if (this.#csiArgs.match(/^[0-9;]*$/) === null) {
            console.error("[sgrp]: CSI parameter list doesn't match /^[0-9;]*$/. Rewriting as-is.");
            this.dumpUnknownCsi(controller);
            return;
        }

        const parameters = this.#csiArgs.length > 0
            ? this.#csiArgs.split(";").map((i) => i.length > 0 ? parseInt(i, 10) : 0)
            : [0];

        const newStyle = this.parseSgrParameters(parameters);
        if (!this.#style.equals(newStyle)) {
            this.#style = newStyle;
            this.handleStyleChange(controller);
        }

        this.#csiArgs = "";
        this.#csiCommand = "";
        this.#state = SGRParserState.Text;
    }

    private parseSgrParameters(parameters: number[]): SGRStyle {
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

    private handleStyleChange(controller: TransformStreamDefaultController<string>): void {
        if (this.#inSpan) {
            controller.enqueue("</span>");
            this.#inSpan = false;
        }

        if (!this.#style.isEmpty()) {
            controller.enqueue(`<span ${this.#style.toCssStyle()}>`);
            this.#inSpan = true;
        }
    }

    private dumpUnknownCsi(controller: TransformStreamDefaultController<string>): void {
        controller.enqueue(`\x1B[${this.#csiArgs}${this.#csiCommand}`);
        this.#csiArgs = "";
        this.#csiCommand = "";
        this.#state = SGRParserState.Text;
    }

    toStream(): TransformStream<string, string> {
        return new TransformStream(this);
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
 * HTMLEscaper implements Transformer<string, string> by replacing all occurrences of
 * <, >, &, ' and " by their entity references (&lt;, &gt;, &amp;, &#39;, &quot; respectively);
 * making the output safe to use in HTML contexts.
 */
export class HTMLEscaper implements Transformer<string, string> {
    static readonly escapes: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&#39;",
        '"': "&quot;",
    };

    transform(chunk: string, controller: TransformStreamDefaultController<string>): void {
        controller.enqueue(chunk.replaceAll(/[<>&'"]/g, (c) => HTMLEscaper.escapes[c]));
    }

    toStream(): TransformStream<string, string> {
        return new TransformStream(this);
    }
}

export async function parse_sgr(x: string): Promise<string> {
    const source = new StringChunkSource(x);
    const escaper = new HTMLEscaper();
    const parser = new SGRParser();
    const sink = new StringChunkSink();
    await source.toStream().pipeThrough(escaper.toStream()).pipeThrough(parser.toStream()).pipeTo(
        sink.toStream(),
    );
    return sink.toString();
}

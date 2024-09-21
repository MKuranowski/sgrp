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

export class SGRParser implements Transformer<string, string> {
    transform(chunk: string, controller: TransformStreamDefaultController<string>): void {
        controller.enqueue(chunk);
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

export async function parse_sgr(x: string): Promise<string> {
    const source = new StringChunkSource(x);
    const parser = new SGRParser();
    const sink = new StringChunkSink();
    await source.toStream().pipeThrough(parser.toStream()).pipeTo(sink.toStream());
    return sink.toString();
}

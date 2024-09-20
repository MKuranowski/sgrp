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

export function add(a: number, b: number): number {
    return a + b;
}

// Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
if (import.meta.main) {
    console.log("Add 2 + 3 =", add(2, 3));
}

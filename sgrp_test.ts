// Copyright (c) 2024 Mikołaj Kuranowski
// SPDX-License-Identifier: MIT

import { assertEquals } from "@std/assert";
import { sgrToString } from "./sgrp.ts";

Deno.test("passes text as-is", async () =>
    assertEquals(await sgrToString("hello, world!"), "hello, world!"));

Deno.test("supports bold and reset", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[1mworld\x1B[0m!"),
        'hello, <span style="font-weight:bolder;">world</span>!',
    ));

Deno.test("supports implicit reset", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[1mworld\x1B[m!"),
        'hello, <span style="font-weight:bolder;">world</span>!',
    ));

Deno.test("supports faint and normal intensity", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[2mworld\x1B[22m!"),
        'hello, <span style="font-weight:lighter;">world</span>!',
    ));

Deno.test("supports italic and not italic", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[3mworld\x1B[23m!"),
        'hello, <span style="font-style:italic;">world</span>!',
    ));

Deno.test("supports combining attributes", async () =>
    assertEquals(
        await sgrToString("\x1B[1mhello, \x1B[3mworld\x1B[22m!\x1B[23m"),
        '<span style="font-weight:bolder;">hello, </span>' +
            '<span style="font-weight:bolder;font-style:italic;">world</span>' +
            '<span style="font-style:italic;">!</span>',
    ));

Deno.test("supports underline and not underline", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[4mworld\x1B[24m!"),
        'hello, <span style="text-decoration:underline;">world</span>!',
    ));

Deno.test("supports crossed-out and not crossed-out", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[9mworld\x1B[29m!"),
        'hello, <span style="text-decoration:line-through;">world</span>!',
    ));

Deno.test("supports underline and crossed-out simultaneously", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[4;9mworld\x1B[24;29m!"),
        'hello, <span style="text-decoration:underline line-through;">world</span>!',
    ));

Deno.test("supports standard foreground colors", async () =>
    assertEquals(
        await sgrToString("\x1B[30mlorem \x1B[31mipsum \x1B[32mdolor \x1B[33msit \x1B[39mamet"),
        '<span style="color:#0c0c0c;">lorem </span>' +
            '<span style="color:#c50f1f;">ipsum </span>' +
            '<span style="color:#13a10e;">dolor </span>' +
            '<span style="color:#c19c00;">sit </span>' +
            "amet",
    ));

Deno.test("supports custom standard foreground colors", async () =>
    assertEquals(
        await sgrToString(
            "\x1B[34mlorem \x1B[35mipsum \x1B[36mdolor \x1B[37msit \x1B[39mamet",
            { palette: { standard: { magenta: "#a0a", cyan: "#0aa" } } },
        ),
        '<span style="color:#0037da;">lorem </span>' +
            '<span style="color:#a0a;">ipsum </span>' +
            '<span style="color:#0aa;">dolor </span>' +
            '<span style="color:#cccccc;">sit </span>' +
            "amet",
    ));

Deno.test("supports bright foreground colors", async () =>
    assertEquals(
        await sgrToString("\x1B[90mlorem \x1B[91mipsum \x1B[92mdolor \x1B[93msit \x1B[39mamet"),
        '<span style="color:#767676;">lorem </span>' +
            '<span style="color:#e74856;">ipsum </span>' +
            '<span style="color:#16c60c;">dolor </span>' +
            '<span style="color:#f9f1a5;">sit </span>' +
            "amet",
    ));

Deno.test("supports custom bright foreground colors", async () =>
    assertEquals(
        await sgrToString(
            "\x1B[94mlorem \x1B[95mipsum \x1B[96mdolor \x1B[97msit \x1B[39mamet",
            { palette: { bright: { magenta: "#a5a", cyan: "#5aa" } } },
        ),
        '<span style="color:#3b78ff;">lorem </span>' +
            '<span style="color:#a5a;">ipsum </span>' +
            '<span style="color:#5aa;">dolor </span>' +
            '<span style="color:#f2f2f2;">sit </span>' +
            "amet",
    ));

Deno.test("supports standard background colors", async () =>
    assertEquals(
        await sgrToString("\x1B[40mlorem \x1B[41mipsum \x1B[42mdolor \x1B[43msit \x1B[49mamet"),
        '<span style="background-color:#0c0c0c;">lorem </span>' +
            '<span style="background-color:#c50f1f;">ipsum </span>' +
            '<span style="background-color:#13a10e;">dolor </span>' +
            '<span style="background-color:#c19c00;">sit </span>' +
            "amet",
    ));

Deno.test("supports custom standard background colors", async () =>
    assertEquals(
        await sgrToString(
            "\x1B[44mlorem \x1B[45mipsum \x1B[46mdolor \x1B[47msit \x1B[49mamet",
            { palette: { standard: { magenta: "#a0a", cyan: "#0aa" } } },
        ),
        '<span style="background-color:#0037da;">lorem </span>' +
            '<span style="background-color:#a0a;">ipsum </span>' +
            '<span style="background-color:#0aa;">dolor </span>' +
            '<span style="background-color:#cccccc;">sit </span>' +
            "amet",
    ));

Deno.test("supports bright background colors", async () =>
    assertEquals(
        await sgrToString("\x1B[100mlorem \x1B[101mipsum \x1B[102mdolor \x1B[103msit \x1B[49mamet"),
        '<span style="background-color:#767676;">lorem </span>' +
            '<span style="background-color:#e74856;">ipsum </span>' +
            '<span style="background-color:#16c60c;">dolor </span>' +
            '<span style="background-color:#f9f1a5;">sit </span>' +
            "amet",
    ));

Deno.test("supports custom bright background colors", async () =>
    assertEquals(
        await sgrToString(
            "\x1B[104mlorem \x1B[105mipsum \x1B[106mdolor \x1B[107msit \x1B[49mamet",
            { palette: { bright: { magenta: "#a5a", cyan: "#5aa" } } },
        ),
        '<span style="background-color:#3b78ff;">lorem </span>' +
            '<span style="background-color:#a5a;">ipsum </span>' +
            '<span style="background-color:#5aa;">dolor </span>' +
            '<span style="background-color:#f2f2f2;">sit </span>' +
            "amet",
    ));

Deno.test("supports 8-bit colorspace standard colors", async () =>
    assertEquals(
        await sgrToString("\x1B[38;5;3mhello"),
        '<span style="color:#c19c00;">hello</span>',
    ));

Deno.test("supports 8-bit colorspace bright colors", async () =>
    assertEquals(
        await sgrToString("\x1B[48;5;10mhello"),
        '<span style="background-color:#16c60c;">hello</span>',
    ));

Deno.test("supports 8-bit colorspace cube colors", async () =>
    assertEquals(
        await sgrToString("\x1B[38;5;182mhello"),
        '<span style="color:rgb(204,153,204);">hello</span>',
    ));

Deno.test("supports 8-bit colorspace grayscale colors", async () =>
    assertEquals(
        await sgrToString("\x1B[48;5;243mhello"),
        '<span style="background-color:rgb(121,121,121);">hello</span>',
    ));

Deno.test("supports 24-bit colorspace FG colors", async () =>
    assertEquals(
        await sgrToString("\x1B[38;2;100;255;100mhello"),
        '<span style="color:rgb(100,255,100);">hello</span>',
    ));

Deno.test("supports 24-bit colorspace BG colors", async () =>
    assertEquals(
        await sgrToString("\x1B[48;2;42;42;242mhello"),
        '<span style="background-color:rgb(42,42,242);">hello</span>',
    ));

Deno.test("bails out on missing colorspace", async () =>
    assertEquals(
        await sgrToString("\x1B[38mhello"),
        "hello",
    ));

Deno.test("bails out on invalid colorspace", async () =>
    assertEquals(
        await sgrToString("\x1B[38;1mhello"),
        "hello",
    ));

Deno.test("bails out on missing 8-bit colorspace parameter", async () =>
    assertEquals(
        await sgrToString("\x1B[38;5mhello"),
        "hello",
    ));

Deno.test("bails out on invalid 8-bit colorspace parameter", async () =>
    assertEquals(
        await sgrToString("\x1B[38;5;420mhello"),
        "hello",
    ));

Deno.test("bails out on missing 24-bit colorspace parameter", async () =>
    assertEquals(
        await sgrToString("\x1B[38;2;100mhello"),
        "hello",
    ));

Deno.test("bails out on invalid 24-bit colorspace parameter", async () =>
    assertEquals(
        await sgrToString("\x1B[38;2;100;100;420mhello"),
        "hello",
    ));

Deno.test("escapes html", async () =>
    assertEquals(
        await sgrToString("<\x1B[1mtag\x1B[0m attr='value with &'>"),
        '&lt;<span style="font-weight:bolder;">tag</span> attr=&#39;value with &amp;&#39;&gt;',
    ));

Deno.test("flushes terminal escapes", async () =>
    assertEquals(
        await sgrToString("hello, \x1B"),
        "hello, \x1B",
    ));

Deno.test("flushes unterminated CSI sequences", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[0"),
        "hello, \x1B[0",
    ));

Deno.test("closes spans", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[1mworld"),
        'hello, <span style="font-weight:bolder;">world</span>',
    ));

Deno.test("passes through non-CSI sequences", async () =>
    assertEquals(
        await sgrToString("hello, \x1BKworld"),
        "hello, \x1BKworld",
    ));

Deno.test("passes through unknown CSI sequences", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[Kworld"),
        "hello, \x1B[Kworld",
    ));

Deno.test("ignores unsupported SGRs", async () =>
    assertEquals(
        await sgrToString("hello, \x1B[8mworld"),
        "hello, world",
    ));

Deno.test("bails out on too long CSI parameter lists", async () =>
    assertEquals(
        await sgrToString(
            "hello, \x1B[0123456789012345678901234567890123456789012345678901234567890123456789mworld",
        ),
        "hello, \x1B[0123456789012345678901234567890123456789012345678901234567890123456789mworld",
    ));

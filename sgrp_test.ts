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

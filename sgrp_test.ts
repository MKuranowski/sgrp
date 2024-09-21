// Copyright (c) 2024 Mikołaj Kuranowski
// SPDX-License-Identifier: MIT

import { assertEquals } from "@std/assert";
import { parse_sgr } from "./sgrp.ts";

Deno.test("passes text as-is", async () =>
    assertEquals(await parse_sgr("hello, world!"), "hello, world!"));

Deno.test("supports bold and reset", async () =>
    assertEquals(
        await parse_sgr("hello, \x1B[1mworld\x1B[0m!"),
        'hello, <span style="font-weight:bolder;">world</span>!',
    ));

Deno.test("supports implicit reset", async () =>
    assertEquals(
        await parse_sgr("hello, \x1B[1mworld\x1B[m!"),
        'hello, <span style="font-weight:bolder;">world</span>!',
    ));

Deno.test("flushes terminal escapes", async () =>
    assertEquals(
        await parse_sgr("hello, \x1B"),
        "hello, \x1B",
    ));

Deno.test("flushes unterminated CSI sequences", async () =>
    assertEquals(
        await parse_sgr("hello, \x1B[0"),
        "hello, \x1B[0",
    ));

Deno.test("closes spans", async () =>
    assertEquals(
        await parse_sgr("hello, \x1B[1mworld"),
        'hello, <span style="font-weight:bolder;">world</span>',
    ));

Deno.test("passes through non-CSI sequences", async () =>
    assertEquals(
        await parse_sgr("hello, \x1BKworld"),
        "hello, \x1BKworld",
    ));

Deno.test("passes through unknown CSI sequences", async () =>
    assertEquals(
        await parse_sgr("hello, \x1B[Kworld"),
        "hello, \x1B[Kworld",
    ));

Deno.test("ignores unsupported SGRs", async () =>
    assertEquals(
        await parse_sgr("hello, \x1B[8mworld"),
        "hello, world",
    ));

Deno.test("bails out on too long CSI parameter lists", async () =>
    assertEquals(
        await parse_sgr(
            "hello, \x1B[0123456789012345678901234567890123456789012345678901234567890123456789mworld",
        ),
        "hello, \x1B[0123456789012345678901234567890123456789012345678901234567890123456789mworld",
    ));

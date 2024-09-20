import { assertEquals } from "@std/assert";
import { parse_sgr } from "./sgrp.ts";

Deno.test("passes text as-is", async () =>
    assertEquals(await parse_sgr("hello, world!"), "hello, world!"));

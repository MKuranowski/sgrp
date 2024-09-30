// Copyright (c) 2024 Mikołaj Kuranowski
// SPDX-License-Identifier: MIT

import { bundle } from "@deno/emit";

const r = await bundle("./sgrp.ts", { minify: true });
await Deno.writeTextFile(
    "./sgrp.js",
    "// Copyright (c) 2024 Mikołaj Kuranowski\n// SPDX-License-Identifier: MIT\n" + r.code,
);

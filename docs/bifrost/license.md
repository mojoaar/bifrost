# License

Bifröst is free and open-source software released under the **GNU Affero General Public License, version 3.0 (AGPL-3.0)**. The full legal text lives in the [`LICENSE`](../../LICENSE) file at the root of the repository.

This page summarizes what that means in plain language. It is not a substitute for the license itself — where this summary and the license text disagree, the license text governs.

## What you can do

The AGPL grants you broad freedoms:

- **Use** Bifröst for any purpose, including running your own blog.
- **Study** the source code and understand how it works.
- **Modify** it to suit your needs — change themes, add features, remove things you don't want.
- **Self-host** it on your own server, VM, or container.
- **Redistribute** copies, modified or not, to anyone.

There is no fee, no per-seat pricing, and no telemetry.

## What you must do

The AGPL is a **copyleft** license. In exchange for these freedoms, it asks that the same freedoms are preserved for everyone downstream:

- **Share your source.** If you distribute Bifröst — or a modified version — you must make the complete corresponding source code available under the AGPL.
- **Network use counts as distribution.** This is the defining feature of the AGPL. If you run a modified version of Bifröst as a network service (for example, a public blog other people interact with), you must offer those users access to the modified source code. Running an unmodified copy for your own blog does not create new obligations beyond keeping the license intact.
- **Keep the notices.** Retain the copyright notices and the license, and state significant changes you made.

## The per-file license header

Every source file in the project carries a short AGPL header, for example:

```typescript
/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */
```

If you contribute a new source file, add this header to the top of it.

## Why AGPL?

Bifröst is built on the idea that you should own your writing and the software that publishes it. The AGPL protects that idea at the community level: improvements made to publicly hosted versions flow back to everyone, so the framework can't be quietly turned into a closed, proprietary service.

If the AGPL doesn't fit your use case, the third-party dependencies Bifröst builds on are listed — with their own, often more permissive, licenses — in [Credits & Thanks](credits.md).

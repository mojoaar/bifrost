/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { createLogger } from "@/lib/logger";

describe("logger", () => {
  const original = {
    level: process.env.BIFROST_LOG_LEVEL,
    format: process.env.BIFROST_LOG_FORMAT,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.BIFROST_LOG_LEVEL = original.level;
    process.env.BIFROST_LOG_FORMAT = original.format;
  });

  it("prefixes messages with the scope", () => {
    process.env.BIFROST_LOG_LEVEL = "debug";
    delete process.env.BIFROST_LOG_FORMAT;
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    createLogger("test").info("hello");
    expect(spy).toHaveBeenCalledWith("[test]", "hello");
  });

  it("filters out messages below the configured level", () => {
    process.env.BIFROST_LOG_LEVEL = "warn";
    delete process.env.BIFROST_LOG_FORMAT;
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = createLogger("test");
    log.debug("nope");
    log.info("nope");
    log.warn("yes");
    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("emits structured JSON when BIFROST_LOG_FORMAT=json", () => {
    process.env.BIFROST_LOG_LEVEL = "debug";
    process.env.BIFROST_LOG_FORMAT = "json";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    createLogger("scope").error("boom", { code: 1 });
    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(payload.level).toBe("error");
    expect(payload.scope).toBe("scope");
    expect(payload.msg).toBe("boom");
    expect(payload.detail).toEqual({ code: 1 });
    expect(typeof payload.ts).toBe("string");
  });

  it("serializes Error objects in JSON mode", () => {
    process.env.BIFROST_LOG_LEVEL = "debug";
    process.env.BIFROST_LOG_FORMAT = "json";
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    createLogger("scope").error("failed", new Error("kaboom"));
    const payload = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(payload.detail.name).toBe("Error");
    expect(payload.detail.message).toBe("kaboom");
  });
});

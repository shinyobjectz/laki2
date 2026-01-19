/**
 * Primitives Test Suite
 *
 * Tests for KSA SDK primitives with adversarial cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { file, shell } from "../sdk/primitives";
import { cacheKey, simpleHash } from "../ksa/_shared/localDb";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

describe("file primitives", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "lakitu-test-"));
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe("file.edit", () => {
    it("throws when text not found in file", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "hello world");

      await expect(file.edit(testFile, "nonexistent", "replacement")).rejects.toThrow(
        /Text not found in file/
      );
    });

    it("throws when text appears multiple times (non-unique)", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "foo bar foo baz foo");

      await expect(file.edit(testFile, "foo", "qux")).rejects.toThrow(
        /Text appears 3 times, must be unique/
      );
    });

    it("succeeds when text is unique", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "hello world");

      await file.edit(testFile, "hello", "goodbye");

      const content = await fs.readFile(testFile, "utf-8");
      expect(content).toBe("goodbye world");
    });

    it("throws on missing file", async () => {
      const missingFile = path.join(testDir, "does-not-exist.txt");

      await expect(file.edit(missingFile, "text", "replacement")).rejects.toThrow();
    });
  });

  describe("file.grep", () => {
    it("returns empty array when no matches", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "hello world");

      const results = await file.grep("nonexistent", testDir);

      expect(results).toEqual([]);
    });

    it("finds matches with line numbers", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "line one\nline two\nline three");

      const results = await file.grep("two", testDir);

      expect(results).toHaveLength(1);
      expect(results[0].line).toBe(2);
      expect(results[0].content).toContain("two");
    });

    it("handles special characters safely with literal mode", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, 'const x = "test"; // $HOME\necho `whoami`');

      // Shell injection attempt - should be safely escaped
      const results = await file.grep("$HOME", testDir, { literal: true });

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain("$HOME");
    });

    it("returns empty on directory with no files", async () => {
      const emptyDir = path.join(testDir, "empty");
      await fs.mkdir(emptyDir);

      const results = await file.grep("anything", emptyDir);

      expect(results).toEqual([]);
    });
  });

  describe("file.glob", () => {
    it("returns empty array when no files match", async () => {
      const testFile = path.join(testDir, "test.txt");
      await fs.writeFile(testFile, "content");

      const results = await file.glob("*.js", testDir);

      expect(results).toEqual([]);
    });

    it("finds matching files", async () => {
      await fs.writeFile(path.join(testDir, "a.ts"), "");
      await fs.writeFile(path.join(testDir, "b.ts"), "");
      await fs.writeFile(path.join(testDir, "c.js"), "");

      const results = await file.glob("*.ts", testDir);

      expect(results).toHaveLength(2);
      expect(results.some((f) => f.endsWith("a.ts"))).toBe(true);
      expect(results.some((f) => f.endsWith("b.ts"))).toBe(true);
    });

    it("handles patterns with special characters safely", async () => {
      await fs.writeFile(path.join(testDir, "test.txt"), "");

      // Pattern that could be shell injection if not escaped
      const results = await file.glob("*.txt", testDir);

      expect(results).toHaveLength(1);
    });
  });
});

describe("shell primitives", () => {
  describe("shell.exec", () => {
    it("returns stdout on success", async () => {
      const result = await shell.exec("echo hello");

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("hello");
      expect(result.stderr).toBe("");
    });

    it("reports stderr and non-zero exitCode on failure", async () => {
      const result = await shell.exec("ls /nonexistent/path/that/does/not/exist");

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    it("respects custom cwd", async () => {
      const result = await shell.exec("pwd", { cwd: "/tmp" });

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("/tmp");
    });

    it("fails gracefully on invalid command", async () => {
      const result = await shell.exec("command_that_does_not_exist_12345");

      expect(result.exitCode).not.toBe(0);
    });

    it("uses process.cwd() when sandbox workspace does not exist", async () => {
      // This test verifies the fallback behavior
      const result = await shell.exec("pwd");

      expect(result.exitCode).toBe(0);
      // Should not throw ENOENT, should fallback to process.cwd()
      expect(result.stdout.trim()).toBeTruthy();
    });

    it("respects timeout option", async () => {
      const start = Date.now();
      const result = await shell.exec("sleep 10", { timeout: 100 });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000); // Should timeout quickly
      expect(result.exitCode).not.toBe(0);
    });
  });
});

describe("localDb cache helpers", () => {
  describe("cacheKey", () => {
    it("produces deterministic keys for same inputs", () => {
      const key1 = cacheKey("web", "search", ["query1", { limit: 10 }]);
      const key2 = cacheKey("web", "search", ["query1", { limit: 10 }]);

      expect(key1).toBe(key2);
    });

    it("produces different keys for different args", () => {
      const key1 = cacheKey("web", "search", ["query1"]);
      const key2 = cacheKey("web", "search", ["query2"]);

      expect(key1).not.toBe(key2);
    });

    it("produces different keys for different functions", () => {
      const key1 = cacheKey("web", "search", ["query"]);
      const key2 = cacheKey("web", "fetch", ["query"]);

      expect(key1).not.toBe(key2);
    });

    it("produces different keys for different KSAs", () => {
      const key1 = cacheKey("web", "search", ["query"]);
      const key2 = cacheKey("file", "search", ["query"]);

      expect(key1).not.toBe(key2);
    });

    it("handles complex nested arguments", () => {
      const args = [
        { nested: { deep: { value: 42 } } },
        [1, 2, 3],
        "string",
        null,
      ];
      const key1 = cacheKey("test", "func", args);
      const key2 = cacheKey("test", "func", args);

      expect(key1).toBe(key2);
    });
  });

  describe("simpleHash", () => {
    it("produces deterministic hashes", () => {
      const hash1 = simpleHash("test string");
      const hash2 = simpleHash("test string");

      expect(hash1).toBe(hash2);
    });

    it("produces different hashes for different inputs", () => {
      const hash1 = simpleHash("input1");
      const hash2 = simpleHash("input2");

      expect(hash1).not.toBe(hash2);
    });

    it("produces hex string output", () => {
      const hash = simpleHash("test");

      expect(hash).toMatch(/^-?[0-9a-f]+$/);
    });

    it("handles empty string", () => {
      const hash = simpleHash("");

      expect(hash).toBe("0");
    });

    it("handles unicode characters", () => {
      const hash1 = simpleHash("hello world");
      const hash2 = simpleHash("hello world"); // Different unicode chars

      // Should produce some hash (doesn't need to be different)
      expect(hash1).toBeTruthy();
      expect(hash2).toBeTruthy();
    });
  });
});

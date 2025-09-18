import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { AsterisCallback, AsterisOptions } from "./types";

/**
 * File extensions that should be loaded using **CommonJS `require()`**.
 */
const useRequireExtensions = new Set([".js", ".cjs", ".cts"]);

/**
 * File extensions that should be loaded using **native ES `import()`**.
 */
const useImportExtensions = new Set([".ts", ".mjs", ".mts"]);

/**
 * Loads up your commands or events from a folder — nice and easy.
 *
 * Perfect for `discord.js` projects! It walks through folders, grabs the files,
 * optionally turns them into class instances, and runs your callback for each one.
 *
 * @template T - Whatever type you're expecting each module to be (like a class instance).
 *
 * @param dir - The main folder to look in (e.g., './commands' or './events').
 * @param callback - This gets called for every file found — gives you the loaded module and its path.
 * @param options - Extra stuff you can pass in to control how it loads things, skips folders, or tweaks behavior.
 *
 * @example
 * ```typescript
 * import { asteris } from "@wxrayut/asteris.js";
 *
 * await asteris("./commands", (command, path) => {
 *     // do stuff with command
 * });
 * ```
 */
async function asteris<T>(
    dir: string,
    callback: AsterisCallback<T>,
    options?: AsterisOptions
): Promise<void> {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });

    const {
        filterDir,
        filterFile,
        extensions,
        recursive = true,
        ignore = [],
        lazy = false,
        instantiate = true,
        args = [],
        transform,
        onSuccess,
        onSkip,
        onError
    } = options ?? ({} as AsterisOptions<T>);

    const extensionSet = extensions ? new Set(extensions) : undefined;

    await Promise.all(
        dirents.map(async (entry) => {
            const fp = path.join(dir, entry.name);

            if (ignore?.some((i) => fp.includes(i))) {
                onSkip?.(fp, "matches ignore pattern");
                return;
            }

            if (entry.isDirectory()) {
                const shouldEnter = filterDir ? filterDir(entry) : true;

                if (!shouldEnter) {
                    onSkip?.(fp, "directory filtered out");
                    return;
                }

                if (recursive) {
                    await asteris<T>(fp, callback, options);
                    return;
                }
            } else if (entry.isFile()) {
                const ext = path.extname(fp);
                const isExtension = extensionSet
                    ? extensionSet.has(ext)
                    : useImportExtensions.has(ext) ||
                      useRequireExtensions.has(ext);

                if (!isExtension) {
                    onSkip?.(fp, "unsupported file extension");
                    return;
                }

                const shouldLoad = filterFile ? filterFile(entry, fp) : true;

                if (!shouldLoad) {
                    onSkip?.(fp, "file filtered out");
                    return;
                }

                if (lazy) {
                    callback(fp as unknown as T, fp);
                    onSuccess?.(fp);
                    return;
                }

                try {
                    let imported;

                    if (useImportExtensions.has(ext)) {
                        imported = await import(pathToFileURL(fp).href);
                    } else if (useRequireExtensions.has(ext)) {
                        const absPath = path.isAbsolute(fp)
                            ? fp
                            : path.resolve(fp);
                        imported = require(absPath);
                    } else {
                        onSkip?.(fp, "unsupported file extension");
                        return;
                    }

                    if (
                        typeof imported === "object" &&
                        Object.keys(imported).length === 0
                    ) {
                        onSkip?.(fp, "empty export");
                        return;
                    }

                    const rawExport = imported?.default ?? imported;

                    const transformed =
                        typeof rawExport !== "function"
                            ? (transform?.(rawExport) ?? rawExport)
                            : rawExport;

                    const items = Array.isArray(transformed)
                        ? transformed
                        : [transformed];

                    for (const item of items) {
                        if (!item) continue;

                        const instance =
                            typeof item === "function" && instantiate
                                ? new item(...(args ?? []))
                                : item;

                        callback(instance, fp);
                        onSuccess?.(fp);
                    }
                } catch (error) {
                    if (error instanceof Error) {
                        onError?.(error, fp);
                    } else {
                        onError?.(new Error("Unknown error during import"), fp);
                    }
                }
            }
        })
    );
}

export { asteris };
export type { AsterisCallback, AsterisOptions };

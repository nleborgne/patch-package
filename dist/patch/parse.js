"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyHunkIntegrity = exports.parsePatchFile = exports.interpretParsedPatchFile = exports.EXECUTABLE_FILE_MODE = exports.NON_EXECUTABLE_FILE_MODE = exports.parseHunkHeaderLine = void 0;
const assertNever_1 = require("../assertNever");
const parseHunkHeaderLine = (headerLine) => {
    const match = headerLine
        .trim()
        .match(/^@@ -(\d+)(,(\d+))? \+(\d+)(,(\d+))? @@.*/);
    if (!match) {
        throw new Error(`Bad header line: '${headerLine}'`);
    }
    return {
        original: {
            start: Math.max(Number(match[1]), 1),
            length: Number(match[3] || 1),
        },
        patched: {
            start: Math.max(Number(match[4]), 1),
            length: Number(match[6] || 1),
        },
    };
};
exports.parseHunkHeaderLine = parseHunkHeaderLine;
exports.NON_EXECUTABLE_FILE_MODE = 0o644;
exports.EXECUTABLE_FILE_MODE = 0o755;
const emptyFilePatch = () => ({
    diffLineFromPath: null,
    diffLineToPath: null,
    oldMode: null,
    newMode: null,
    deletedFileMode: null,
    newFileMode: null,
    renameFrom: null,
    renameTo: null,
    beforeHash: null,
    afterHash: null,
    fromPath: null,
    toPath: null,
    hunks: null,
});
const emptyHunk = (headerLine) => ({
    header: exports.parseHunkHeaderLine(headerLine),
    parts: [],
    source: "",
});
const hunkLinetypes = {
    "@": "header",
    "-": "deletion",
    "+": "insertion",
    " ": "context",
    "\\": "pragma",
    // Treat blank lines as context
    undefined: "context",
    "\r": "context",
};
function parsePatchLines(lines, { supportLegacyDiffs }) {
    const result = [];
    let currentFilePatch = emptyFilePatch();
    let state = "parsing header";
    let currentHunk = null;
    let currentHunkMutationPart = null;
    let hunkStartLineIndex = 0;
    function commitHunk(i) {
        if (currentHunk) {
            if (currentHunkMutationPart) {
                currentHunk.parts.push(currentHunkMutationPart);
                currentHunkMutationPart = null;
            }
            currentHunk.source = lines.slice(hunkStartLineIndex, i).join("\n");
            currentFilePatch.hunks.push(currentHunk);
            currentHunk = null;
        }
    }
    function commitFilePatch(i) {
        commitHunk(i);
        result.push(currentFilePatch);
        currentFilePatch = emptyFilePatch();
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (state === "parsing header") {
            if (line.startsWith("@@")) {
                hunkStartLineIndex = i;
                state = "parsing hunks";
                currentFilePatch.hunks = [];
                i--;
            }
            else if (line.startsWith("diff --git ")) {
                if (currentFilePatch && currentFilePatch.diffLineFromPath) {
                    commitFilePatch(i);
                }
                const match = line.match(/^diff --git a\/(.*?) b\/(.*?)\s*$/);
                if (!match) {
                    throw new Error("Bad diff line: " + line);
                }
                currentFilePatch.diffLineFromPath = match[1];
                currentFilePatch.diffLineToPath = match[2];
            }
            else if (line.startsWith("old mode ")) {
                currentFilePatch.oldMode = line.slice("old mode ".length).trim();
            }
            else if (line.startsWith("new mode ")) {
                currentFilePatch.newMode = line.slice("new mode ".length).trim();
            }
            else if (line.startsWith("deleted file mode ")) {
                currentFilePatch.deletedFileMode = line
                    .slice("deleted file mode ".length)
                    .trim();
            }
            else if (line.startsWith("new file mode ")) {
                currentFilePatch.newFileMode = line
                    .slice("new file mode ".length)
                    .trim();
            }
            else if (line.startsWith("rename from ")) {
                currentFilePatch.renameFrom = line.slice("rename from ".length).trim();
            }
            else if (line.startsWith("rename to ")) {
                currentFilePatch.renameTo = line.slice("rename to ".length).trim();
            }
            else if (line.startsWith("index ")) {
                const match = line.match(/(\w+)\.\.(\w+)/);
                if (!match) {
                    continue;
                }
                currentFilePatch.beforeHash = match[1];
                currentFilePatch.afterHash = match[2];
            }
            else if (line.startsWith("--- ")) {
                currentFilePatch.fromPath = line.slice("--- a/".length).trim();
            }
            else if (line.startsWith("+++ ")) {
                currentFilePatch.toPath = line.slice("+++ b/".length).trim();
            }
        }
        else {
            if (supportLegacyDiffs && line.startsWith("--- a/")) {
                state = "parsing header";
                commitFilePatch(i);
                i--;
                continue;
            }
            // parsing hunks
            const lineType = hunkLinetypes[line[0]] || null;
            switch (lineType) {
                case "header":
                    commitHunk(i);
                    currentHunk = emptyHunk(line);
                    break;
                case null:
                    // unrecognized, bail out
                    state = "parsing header";
                    commitFilePatch(i);
                    i--;
                    break;
                case "pragma":
                    if (!line.startsWith("\\ No newline at end of file")) {
                        throw new Error("Unrecognized pragma in patch file: " + line);
                    }
                    if (!currentHunkMutationPart) {
                        throw new Error("Bad parser state: No newline at EOF pragma encountered without context");
                    }
                    currentHunkMutationPart.noNewlineAtEndOfFile = true;
                    break;
                case "insertion":
                case "deletion":
                case "context":
                    if (!currentHunk) {
                        throw new Error("Bad parser state: Hunk lines encountered before hunk header");
                    }
                    if (currentHunkMutationPart &&
                        currentHunkMutationPart.type !== lineType) {
                        currentHunk.parts.push(currentHunkMutationPart);
                        currentHunkMutationPart = null;
                    }
                    if (!currentHunkMutationPart) {
                        currentHunkMutationPart = {
                            type: lineType,
                            lines: [],
                            noNewlineAtEndOfFile: false,
                        };
                    }
                    currentHunkMutationPart.lines.push(line.slice(1));
                    break;
                default:
                    // exhausitveness check
                    assertNever_1.assertNever(lineType);
            }
        }
    }
    commitFilePatch(lines.length);
    for (const { hunks } of result) {
        if (hunks) {
            for (const hunk of hunks) {
                verifyHunkIntegrity(hunk);
            }
        }
    }
    return result;
}
function interpretParsedPatchFile(files) {
    const result = [];
    for (const file of files) {
        const { diffLineFromPath, diffLineToPath, oldMode, newMode, deletedFileMode, newFileMode, renameFrom, renameTo, beforeHash, afterHash, fromPath, toPath, hunks, } = file;
        const type = renameFrom
            ? "rename"
            : deletedFileMode
                ? "file deletion"
                : newFileMode
                    ? "file creation"
                    : hunks && hunks.length > 0
                        ? "patch"
                        : "mode change";
        let destinationFilePath = null;
        switch (type) {
            case "rename":
                if (!renameFrom || !renameTo) {
                    throw new Error("Bad parser state: rename from & to not given");
                }
                result.push({
                    type: "rename",
                    fromPath: renameFrom,
                    toPath: renameTo,
                });
                destinationFilePath = renameTo;
                break;
            case "file deletion": {
                const path = diffLineFromPath || fromPath;
                if (!path) {
                    throw new Error("Bad parse state: no path given for file deletion");
                }
                result.push({
                    type: "file deletion",
                    hunk: (hunks && hunks[0]) || null,
                    path,
                    mode: parseFileMode(deletedFileMode),
                    hash: beforeHash,
                });
                break;
            }
            case "file creation": {
                const path = diffLineToPath || toPath;
                if (!path) {
                    throw new Error("Bad parse state: no path given for file creation");
                }
                result.push({
                    type: "file creation",
                    hunk: (hunks && hunks[0]) || null,
                    path,
                    mode: parseFileMode(newFileMode),
                    hash: afterHash,
                });
                break;
            }
            case "patch":
            case "mode change":
                destinationFilePath = toPath || diffLineToPath;
                break;
            default:
                assertNever_1.assertNever(type);
        }
        if (destinationFilePath && oldMode && newMode && oldMode !== newMode) {
            result.push({
                type: "mode change",
                path: destinationFilePath,
                oldMode: parseFileMode(oldMode),
                newMode: parseFileMode(newMode),
            });
        }
        if (destinationFilePath && hunks && hunks.length) {
            result.push({
                type: "patch",
                path: destinationFilePath,
                hunks,
                beforeHash,
                afterHash,
            });
        }
    }
    return result;
}
exports.interpretParsedPatchFile = interpretParsedPatchFile;
function parseFileMode(mode) {
    // tslint:disable-next-line:no-bitwise
    const parsedMode = parseInt(mode, 8) & 0o777;
    if (parsedMode !== exports.NON_EXECUTABLE_FILE_MODE &&
        parsedMode !== exports.EXECUTABLE_FILE_MODE) {
        throw new Error("Unexpected file mode string: " + mode);
    }
    return parsedMode;
}
function parsePatchFile(file) {
    const lines = file.split(/\n/g);
    if (lines[lines.length - 1] === "") {
        lines.pop();
    }
    try {
        return interpretParsedPatchFile(parsePatchLines(lines, { supportLegacyDiffs: false }));
    }
    catch (e) {
        if (e instanceof Error &&
            e.message === "hunk header integrity check failed") {
            return interpretParsedPatchFile(parsePatchLines(lines, { supportLegacyDiffs: true }));
        }
        throw e;
    }
}
exports.parsePatchFile = parsePatchFile;
function verifyHunkIntegrity(hunk) {
    // verify hunk integrity
    let originalLength = 0;
    let patchedLength = 0;
    for (const { type, lines } of hunk.parts) {
        switch (type) {
            case "context":
                patchedLength += lines.length;
                originalLength += lines.length;
                break;
            case "deletion":
                originalLength += lines.length;
                break;
            case "insertion":
                patchedLength += lines.length;
                break;
            default:
                assertNever_1.assertNever(type);
        }
    }
    if (originalLength !== hunk.header.original.length ||
        patchedLength !== hunk.header.patched.length) {
        throw new Error("hunk header integrity check failed");
    }
}
exports.verifyHunkIntegrity = verifyHunkIntegrity;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcGF0Y2gvcGFyc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0RBQTRDO0FBYXJDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxVQUFrQixFQUFjLEVBQUU7SUFDcEUsTUFBTSxLQUFLLEdBQUcsVUFBVTtTQUNyQixJQUFJLEVBQUU7U0FDTixLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQTtJQUNyRCxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxxQkFBcUIsVUFBVSxHQUFHLENBQUMsQ0FBQTtLQUNwRDtJQUVELE9BQU87UUFDTCxRQUFRLEVBQUU7WUFDUixLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3BDLE1BQU0sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztTQUM5QjtRQUNELE9BQU8sRUFBRTtZQUNQLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDcEMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1NBQzlCO0tBQ0YsQ0FBQTtBQUNILENBQUMsQ0FBQTtBQWxCWSxRQUFBLG1CQUFtQix1QkFrQi9CO0FBRVksUUFBQSx3QkFBd0IsR0FBRyxLQUFLLENBQUE7QUFDaEMsUUFBQSxvQkFBb0IsR0FBRyxLQUFLLENBQUE7QUFnRnpDLE1BQU0sY0FBYyxHQUFHLEdBQWMsRUFBRSxDQUFDLENBQUM7SUFDdkMsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixjQUFjLEVBQUUsSUFBSTtJQUNwQixPQUFPLEVBQUUsSUFBSTtJQUNiLE9B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QUFBO2dCQUM5QixNQUFLO1lBQ1AsS0FBSyxVQUFVO2dCQUNiLGNBQWMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFBO2dCQUM5QixNQUFLO1lBQ1AsS0FBSyxXQUFXO2dCQUNkLGFBQWEsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFBO2dCQUM3QixNQUFLO1lBQ1A7Z0JBQ0UseUJBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUNwQjtLQUNGO0lBRUQsSUFDRSxjQUFjLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTTtRQUM5QyxhQUFhLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUM1QztRQUNBLE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQTtLQUN0RDtBQUNILENBQUM7QUEzQkQsa0RBMkJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYXNzZXJ0TmV2ZXIgfSBmcm9tIFwiLi4vYXNzZXJ0TmV2ZXJcIlxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIdW5rSGVhZGVyIHtcclxuICBvcmlnaW5hbDoge1xyXG4gICAgc3RhcnQ6IG51bWJlclxyXG4gICAgbGVuZ3RoOiBudW1iZXJcclxuICB9XHJcbiAgcGF0Y2hlZDoge1xyXG4gICAgc3RhcnQ6IG51bWJlclxyXG4gICAgbGVuZ3RoOiBudW1iZXJcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBwYXJzZUh1bmtIZWFkZXJMaW5lID0gKGhlYWRlckxpbmU6IHN0cmluZyk6IEh1bmtIZWFkZXIgPT4ge1xyXG4gIGNvbnN0IG1hdGNoID0gaGVhZGVyTGluZVxyXG4gICAgLnRyaW0oKVxyXG4gICAgLm1hdGNoKC9eQEAgLShcXGQrKSgsKFxcZCspKT8gXFwrKFxcZCspKCwoXFxkKykpPyBAQC4qLylcclxuICBpZiAoIW1hdGNoKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEJhZCBoZWFkZXIgbGluZTogJyR7aGVhZGVyTGluZX0nYClcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBvcmlnaW5hbDoge1xyXG4gICAgICBzdGFydDogTWF0aC5tYXgoTnVtYmVyKG1hdGNoWzFdKSwgMSksXHJcbiAgICAgIGxlbmd0aDogTnVtYmVyKG1hdGNoWzNdIHx8IDEpLFxyXG4gICAgfSxcclxuICAgIHBhdGNoZWQ6IHtcclxuICAgICAgc3RhcnQ6IE1hdGgubWF4KE51bWJlcihtYXRjaFs0XSksIDEpLFxyXG4gICAgICBsZW5ndGg6IE51bWJlcihtYXRjaFs2XSB8fCAxKSxcclxuICAgIH0sXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgY29uc3QgTk9OX0VYRUNVVEFCTEVfRklMRV9NT0RFID0gMG82NDRcclxuZXhwb3J0IGNvbnN0IEVYRUNVVEFCTEVfRklMRV9NT0RFID0gMG83NTVcclxuXHJcbnR5cGUgRmlsZU1vZGUgPSB0eXBlb2YgTk9OX0VYRUNVVEFCTEVfRklMRV9NT0RFIHwgdHlwZW9mIEVYRUNVVEFCTEVfRklMRV9NT0RFXHJcblxyXG5pbnRlcmZhY2UgUGF0Y2hNdXRhdGlvblBhcnQge1xyXG4gIHR5cGU6IFwiY29udGV4dFwiIHwgXCJpbnNlcnRpb25cIiB8IFwiZGVsZXRpb25cIlxyXG4gIGxpbmVzOiBzdHJpbmdbXVxyXG4gIG5vTmV3bGluZUF0RW5kT2ZGaWxlOiBib29sZWFuXHJcbn1cclxuXHJcbmludGVyZmFjZSBGaWxlUmVuYW1lIHtcclxuICB0eXBlOiBcInJlbmFtZVwiXHJcbiAgZnJvbVBhdGg6IHN0cmluZ1xyXG4gIHRvUGF0aDogc3RyaW5nXHJcbn1cclxuXHJcbmludGVyZmFjZSBGaWxlTW9kZUNoYW5nZSB7XHJcbiAgdHlwZTogXCJtb2RlIGNoYW5nZVwiXHJcbiAgcGF0aDogc3RyaW5nXHJcbiAgb2xkTW9kZTogRmlsZU1vZGVcclxuICBuZXdNb2RlOiBGaWxlTW9kZVxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVQYXRjaCB7XHJcbiAgdHlwZTogXCJwYXRjaFwiXHJcbiAgcGF0aDogc3RyaW5nXHJcbiAgaHVua3M6IEh1bmtbXVxyXG4gIGJlZm9yZUhhc2g6IHN0cmluZyB8IG51bGxcclxuICBhZnRlckhhc2g6IHN0cmluZyB8IG51bGxcclxufVxyXG5cclxuaW50ZXJmYWNlIEZpbGVEZWxldGlvbiB7XHJcbiAgdHlwZTogXCJmaWxlIGRlbGV0aW9uXCJcclxuICBwYXRoOiBzdHJpbmdcclxuICBtb2RlOiBGaWxlTW9kZVxyXG4gIGh1bms6IEh1bmsgfCBudWxsXHJcbiAgaGFzaDogc3RyaW5nIHwgbnVsbFxyXG59XHJcblxyXG5pbnRlcmZhY2UgRmlsZUNyZWF0aW9uIHtcclxuICB0eXBlOiBcImZpbGUgY3JlYXRpb25cIlxyXG4gIG1vZGU6IEZpbGVNb2RlXHJcbiAgcGF0aDogc3RyaW5nXHJcbiAgaHVuazogSHVuayB8IG51bGxcclxuICBoYXNoOiBzdHJpbmcgfCBudWxsXHJcbn1cclxuXHJcbmV4cG9ydCB0eXBlIFBhdGNoRmlsZVBhcnQgPVxyXG4gIHwgRmlsZVBhdGNoXHJcbiAgfCBGaWxlRGVsZXRpb25cclxuICB8IEZpbGVDcmVhdGlvblxyXG4gIHwgRmlsZVJlbmFtZVxyXG4gIHwgRmlsZU1vZGVDaGFuZ2VcclxuXHJcbmV4cG9ydCB0eXBlIFBhcnNlZFBhdGNoRmlsZSA9IFBhdGNoRmlsZVBhcnRbXVxyXG5cclxudHlwZSBTdGF0ZSA9IFwicGFyc2luZyBoZWFkZXJcIiB8IFwicGFyc2luZyBodW5rc1wiXHJcblxyXG5pbnRlcmZhY2UgRmlsZURlZXRzIHtcclxuICBkaWZmTGluZUZyb21QYXRoOiBzdHJpbmcgfCBudWxsXHJcbiAgZGlmZkxpbmVUb1BhdGg6IHN0cmluZyB8IG51bGxcclxuICBvbGRNb2RlOiBzdHJpbmcgfCBudWxsXHJcbiAgbmV3TW9kZTogc3RyaW5nIHwgbnVsbFxyXG4gIGRlbGV0ZWRGaWxlTW9kZTogc3RyaW5nIHwgbnVsbFxyXG4gIG5ld0ZpbGVNb2RlOiBzdHJpbmcgfCBudWxsXHJcbiAgcmVuYW1lRnJvbTogc3RyaW5nIHwgbnVsbFxyXG4gIHJlbmFtZVRvOiBzdHJpbmcgfCBudWxsXHJcbiAgYmVmb3JlSGFzaDogc3RyaW5nIHwgbnVsbFxyXG4gIGFmdGVySGFzaDogc3RyaW5nIHwgbnVsbFxyXG4gIGZyb21QYXRoOiBzdHJpbmcgfCBudWxsXHJcbiAgdG9QYXRoOiBzdHJpbmcgfCBudWxsXHJcbiAgaHVua3M6IEh1bmtbXSB8IG51bGxcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBIdW5rIHtcclxuICBoZWFkZXI6IEh1bmtIZWFkZXJcclxuICBwYXJ0czogUGF0Y2hNdXRhdGlvblBhcnRbXVxyXG4gIHNvdXJjZTogc3RyaW5nXHJcbn1cclxuXHJcbmNvbnN0IGVtcHR5RmlsZVBhdGNoID0gKCk6IEZpbGVEZWV0cyA9PiAoe1xyXG4gIGRpZmZMaW5lRnJvbVBhdGg6IG51bGwsXHJcbiAgZGlmZkxpbmVUb1BhdGg6IG51bGwsXHJcbiAgb2xkTW9kZTogbnVsbCxcclxuICBuZXdNb2RlOiBudWxsLFxyXG4gIGRlbGV0ZWRGaWxlTW9kZTogbnVsbCxcclxuICBuZXdGaWxlTW9kZTogbnVsbCxcclxuICByZW5hbWVGcm9tOiBudWxsLFxyXG4gIHJlbmFtZVRvOiBudWxsLFxyXG4gIGJlZm9yZUhhc2g6IG51bGwsXHJcbiAgYWZ0ZXJIYXNoOiBudWxsLFxyXG4gIGZyb21QYXRoOiBudWxsLFxyXG4gIHRvUGF0aDogbnVsbCxcclxuICBodW5rczogbnVsbCxcclxufSlcclxuXHJcbmNvbnN0IGVtcHR5SHVuayA9IChoZWFkZXJMaW5lOiBzdHJpbmcpOiBIdW5rID0+ICh7XHJcbiAgaGVhZGVyOiBwYXJzZUh1bmtIZWFkZXJMaW5lKGhlYWRlckxpbmUpLFxyXG4gIHBhcnRzOiBbXSxcclxuICBzb3VyY2U6IFwiXCIsXHJcbn0pXHJcblxyXG5jb25zdCBodW5rTGluZXR5cGVzOiB7XHJcbiAgW2s6IHN0cmluZ106IFBhdGNoTXV0YXRpb25QYXJ0W1widHlwZVwiXSB8IFwicHJhZ21hXCIgfCBcImhlYWRlclwiXHJcbn0gPSB7XHJcbiAgXCJAXCI6IFwiaGVhZGVyXCIsXHJcbiAgXCItXCI6IFwiZGVsZXRpb25cIixcclxuICBcIitcIjogXCJpbnNlcnRpb25cIixcclxuICBcIiBcIjogXCJjb250ZXh0XCIsXHJcbiAgXCJcXFxcXCI6IFwicHJhZ21hXCIsXHJcbiAgLy8gVHJlYXQgYmxhbmsgbGluZXMgYXMgY29udGV4dFxyXG4gIHVuZGVmaW5lZDogXCJjb250ZXh0XCIsXHJcbiAgXCJcXHJcIjogXCJjb250ZXh0XCIsXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlUGF0Y2hMaW5lcyhcclxuICBsaW5lczogc3RyaW5nW10sXHJcbiAgeyBzdXBwb3J0TGVnYWN5RGlmZnMgfTogeyBzdXBwb3J0TGVnYWN5RGlmZnM6IGJvb2xlYW4gfSxcclxuKTogRmlsZURlZXRzW10ge1xyXG4gIGNvbnN0IHJlc3VsdDogRmlsZURlZXRzW10gPSBbXVxyXG4gIGxldCBjdXJyZW50RmlsZVBhdGNoOiBGaWxlRGVldHMgPSBlbXB0eUZpbGVQYXRjaCgpXHJcbiAgbGV0IHN0YXRlOiBTdGF0ZSA9IFwicGFyc2luZyBoZWFkZXJcIlxyXG4gIGxldCBjdXJyZW50SHVuazogSHVuayB8IG51bGwgPSBudWxsXHJcbiAgbGV0IGN1cnJlbnRIdW5rTXV0YXRpb25QYXJ0OiBQYXRjaE11dGF0aW9uUGFydCB8IG51bGwgPSBudWxsXHJcbiAgbGV0IGh1bmtTdGFydExpbmVJbmRleCA9IDBcclxuXHJcbiAgZnVuY3Rpb24gY29tbWl0SHVuayhpOiBudW1iZXIpIHtcclxuICAgIGlmIChjdXJyZW50SHVuaykge1xyXG4gICAgICBpZiAoY3VycmVudEh1bmtNdXRhdGlvblBhcnQpIHtcclxuICAgICAgICBjdXJyZW50SHVuay5wYXJ0cy5wdXNoKGN1cnJlbnRIdW5rTXV0YXRpb25QYXJ0KVxyXG4gICAgICAgIGN1cnJlbnRIdW5rTXV0YXRpb25QYXJ0ID0gbnVsbFxyXG4gICAgICB9XHJcbiAgICAgIGN1cnJlbnRIdW5rLnNvdXJjZSA9IGxpbmVzLnNsaWNlKGh1bmtTdGFydExpbmVJbmRleCwgaSkuam9pbihcIlxcblwiKVxyXG4gICAgICBjdXJyZW50RmlsZVBhdGNoLmh1bmtzIS5wdXNoKGN1cnJlbnRIdW5rKVxyXG4gICAgICBjdXJyZW50SHVuayA9IG51bGxcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGNvbW1pdEZpbGVQYXRjaChpOiBudW1iZXIpIHtcclxuICAgIGNvbW1pdEh1bmsoaSlcclxuICAgIHJlc3VsdC5wdXNoKGN1cnJlbnRGaWxlUGF0Y2gpXHJcbiAgICBjdXJyZW50RmlsZVBhdGNoID0gZW1wdHlGaWxlUGF0Y2goKVxyXG4gIH1cclxuXHJcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xyXG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2ldXHJcblxyXG4gICAgaWYgKHN0YXRlID09PSBcInBhcnNpbmcgaGVhZGVyXCIpIHtcclxuICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aChcIkBAXCIpKSB7XHJcbiAgICAgICAgaHVua1N0YXJ0TGluZUluZGV4ID0gaVxyXG4gICAgICAgIHN0YXRlID0gXCJwYXJzaW5nIGh1bmtzXCJcclxuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLmh1bmtzID0gW11cclxuICAgICAgICBpLS1cclxuICAgICAgfSBlbHNlIGlmIChsaW5lLnN0YXJ0c1dpdGgoXCJkaWZmIC0tZ2l0IFwiKSkge1xyXG4gICAgICAgIGlmIChjdXJyZW50RmlsZVBhdGNoICYmIGN1cnJlbnRGaWxlUGF0Y2guZGlmZkxpbmVGcm9tUGF0aCkge1xyXG4gICAgICAgICAgY29tbWl0RmlsZVBhdGNoKGkpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCgvXmRpZmYgLS1naXQgYVxcLyguKj8pIGJcXC8oLio/KVxccyokLylcclxuICAgICAgICBpZiAoIW1hdGNoKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWQgZGlmZiBsaW5lOiBcIiArIGxpbmUpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2guZGlmZkxpbmVGcm9tUGF0aCA9IG1hdGNoWzFdXHJcbiAgICAgICAgY3VycmVudEZpbGVQYXRjaC5kaWZmTGluZVRvUGF0aCA9IG1hdGNoWzJdXHJcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwib2xkIG1vZGUgXCIpKSB7XHJcbiAgICAgICAgY3VycmVudEZpbGVQYXRjaC5vbGRNb2RlID0gbGluZS5zbGljZShcIm9sZCBtb2RlIFwiLmxlbmd0aCkudHJpbSgpXHJcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwibmV3IG1vZGUgXCIpKSB7XHJcbiAgICAgICAgY3VycmVudEZpbGVQYXRjaC5uZXdNb2RlID0gbGluZS5zbGljZShcIm5ldyBtb2RlIFwiLmxlbmd0aCkudHJpbSgpXHJcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwiZGVsZXRlZCBmaWxlIG1vZGUgXCIpKSB7XHJcbiAgICAgICAgY3VycmVudEZpbGVQYXRjaC5kZWxldGVkRmlsZU1vZGUgPSBsaW5lXHJcbiAgICAgICAgICAuc2xpY2UoXCJkZWxldGVkIGZpbGUgbW9kZSBcIi5sZW5ndGgpXHJcbiAgICAgICAgICAudHJpbSgpXHJcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwibmV3IGZpbGUgbW9kZSBcIikpIHtcclxuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLm5ld0ZpbGVNb2RlID0gbGluZVxyXG4gICAgICAgICAgLnNsaWNlKFwibmV3IGZpbGUgbW9kZSBcIi5sZW5ndGgpXHJcbiAgICAgICAgICAudHJpbSgpXHJcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwicmVuYW1lIGZyb20gXCIpKSB7XHJcbiAgICAgICAgY3VycmVudEZpbGVQYXRjaC5yZW5hbWVGcm9tID0gbGluZS5zbGljZShcInJlbmFtZSBmcm9tIFwiLmxlbmd0aCkudHJpbSgpXHJcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwicmVuYW1lIHRvIFwiKSkge1xyXG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2gucmVuYW1lVG8gPSBsaW5lLnNsaWNlKFwicmVuYW1lIHRvIFwiLmxlbmd0aCkudHJpbSgpXHJcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwiaW5kZXggXCIpKSB7XHJcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKC8oXFx3KylcXC5cXC4oXFx3KykvKVxyXG4gICAgICAgIGlmICghbWF0Y2gpIHtcclxuICAgICAgICAgIGNvbnRpbnVlXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2guYmVmb3JlSGFzaCA9IG1hdGNoWzFdXHJcbiAgICAgICAgY3VycmVudEZpbGVQYXRjaC5hZnRlckhhc2ggPSBtYXRjaFsyXVxyXG4gICAgICB9IGVsc2UgaWYgKGxpbmUuc3RhcnRzV2l0aChcIi0tLSBcIikpIHtcclxuICAgICAgICBjdXJyZW50RmlsZVBhdGNoLmZyb21QYXRoID0gbGluZS5zbGljZShcIi0tLSBhL1wiLmxlbmd0aCkudHJpbSgpXHJcbiAgICAgIH0gZWxzZSBpZiAobGluZS5zdGFydHNXaXRoKFwiKysrIFwiKSkge1xyXG4gICAgICAgIGN1cnJlbnRGaWxlUGF0Y2gudG9QYXRoID0gbGluZS5zbGljZShcIisrKyBiL1wiLmxlbmd0aCkudHJpbSgpXHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChzdXBwb3J0TGVnYWN5RGlmZnMgJiYgbGluZS5zdGFydHNXaXRoKFwiLS0tIGEvXCIpKSB7XHJcbiAgICAgICAgc3RhdGUgPSBcInBhcnNpbmcgaGVhZGVyXCJcclxuICAgICAgICBjb21taXRGaWxlUGF0Y2goaSlcclxuICAgICAgICBpLS1cclxuICAgICAgICBjb250aW51ZVxyXG4gICAgICB9XHJcbiAgICAgIC8vIHBhcnNpbmcgaHVua3NcclxuICAgICAgY29uc3QgbGluZVR5cGUgPSBodW5rTGluZXR5cGVzW2xpbmVbMF1dIHx8IG51bGxcclxuICAgICAgc3dpdGNoIChsaW5lVHlwZSkge1xyXG4gICAgICAgIGNhc2UgXCJoZWFkZXJcIjpcclxuICAgICAgICAgIGNvbW1pdEh1bmsoaSlcclxuICAgICAgICAgIGN1cnJlbnRIdW5rID0gZW1wdHlIdW5rKGxpbmUpXHJcbiAgICAgICAgICBicmVha1xyXG4gICAgICAgIGNhc2UgbnVsbDpcclxuICAgICAgICAgIC8vIHVucmVjb2duaXplZCwgYmFpbCBvdXRcclxuICAgICAgICAgIHN0YXRlID0gXCJwYXJzaW5nIGhlYWRlclwiXHJcbiAgICAgICAgICBjb21taXRGaWxlUGF0Y2goaSlcclxuICAgICAgICAgIGktLVxyXG4gICAgICAgICAgYnJlYWtcclxuICAgICAgICBjYXNlIFwicHJhZ21hXCI6XHJcbiAgICAgICAgICBpZiAoIWxpbmUuc3RhcnRzV2l0aChcIlxcXFwgTm8gbmV3bGluZSBhdCBlbmQgb2YgZmlsZVwiKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbnJlY29nbml6ZWQgcHJhZ21hIGluIHBhdGNoIGZpbGU6IFwiICsgbGluZSlcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICghY3VycmVudEh1bmtNdXRhdGlvblBhcnQpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgIFwiQmFkIHBhcnNlciBzdGF0ZTogTm8gbmV3bGluZSBhdCBFT0YgcHJhZ21hIGVuY291bnRlcmVkIHdpdGhvdXQgY29udGV4dFwiLFxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBjdXJyZW50SHVua011dGF0aW9uUGFydC5ub05ld2xpbmVBdEVuZE9mRmlsZSA9IHRydWVcclxuICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgY2FzZSBcImluc2VydGlvblwiOlxyXG4gICAgICAgIGNhc2UgXCJkZWxldGlvblwiOlxyXG4gICAgICAgIGNhc2UgXCJjb250ZXh0XCI6XHJcbiAgICAgICAgICBpZiAoIWN1cnJlbnRIdW5rKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgICBcIkJhZCBwYXJzZXIgc3RhdGU6IEh1bmsgbGluZXMgZW5jb3VudGVyZWQgYmVmb3JlIGh1bmsgaGVhZGVyXCIsXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgY3VycmVudEh1bmtNdXRhdGlvblBhcnQgJiZcclxuICAgICAgICAgICAgY3VycmVudEh1bmtNdXRhdGlvblBhcnQudHlwZSAhPT0gbGluZVR5cGVcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICBjdXJyZW50SHVuay5wYXJ0cy5wdXNoKGN1cnJlbnRIdW5rTXV0YXRpb25QYXJ0KVxyXG4gICAgICAgICAgICBjdXJyZW50SHVua011dGF0aW9uUGFydCA9IG51bGxcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICghY3VycmVudEh1bmtNdXRhdGlvblBhcnQpIHtcclxuICAgICAgICAgICAgY3VycmVudEh1bmtNdXRhdGlvblBhcnQgPSB7XHJcbiAgICAgICAgICAgICAgdHlwZTogbGluZVR5cGUsXHJcbiAgICAgICAgICAgICAgbGluZXM6IFtdLFxyXG4gICAgICAgICAgICAgIG5vTmV3bGluZUF0RW5kT2ZGaWxlOiBmYWxzZSxcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY3VycmVudEh1bmtNdXRhdGlvblBhcnQubGluZXMucHVzaChsaW5lLnNsaWNlKDEpKVxyXG4gICAgICAgICAgYnJlYWtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgLy8gZXhoYXVzaXR2ZW5lc3MgY2hlY2tcclxuICAgICAgICAgIGFzc2VydE5ldmVyKGxpbmVUeXBlKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb21taXRGaWxlUGF0Y2gobGluZXMubGVuZ3RoKVxyXG5cclxuICBmb3IgKGNvbnN0IHsgaHVua3MgfSBvZiByZXN1bHQpIHtcclxuICAgIGlmIChodW5rcykge1xyXG4gICAgICBmb3IgKGNvbnN0IGh1bmsgb2YgaHVua3MpIHtcclxuICAgICAgICB2ZXJpZnlIdW5rSW50ZWdyaXR5KGh1bmspXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiByZXN1bHRcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGludGVycHJldFBhcnNlZFBhdGNoRmlsZShmaWxlczogRmlsZURlZXRzW10pOiBQYXJzZWRQYXRjaEZpbGUge1xyXG4gIGNvbnN0IHJlc3VsdDogUGFyc2VkUGF0Y2hGaWxlID0gW11cclxuXHJcbiAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcbiAgICBjb25zdCB7XHJcbiAgICAgIGRpZmZMaW5lRnJvbVBhdGgsXHJcbiAgICAgIGRpZmZMaW5lVG9QYXRoLFxyXG4gICAgICBvbGRNb2RlLFxyXG4gICAgICBuZXdNb2RlLFxyXG4gICAgICBkZWxldGVkRmlsZU1vZGUsXHJcbiAgICAgIG5ld0ZpbGVNb2RlLFxyXG4gICAgICByZW5hbWVGcm9tLFxyXG4gICAgICByZW5hbWVUbyxcclxuICAgICAgYmVmb3JlSGFzaCxcclxuICAgICAgYWZ0ZXJIYXNoLFxyXG4gICAgICBmcm9tUGF0aCxcclxuICAgICAgdG9QYXRoLFxyXG4gICAgICBodW5rcyxcclxuICAgIH0gPSBmaWxlXHJcbiAgICBjb25zdCB0eXBlOiBQYXRjaEZpbGVQYXJ0W1widHlwZVwiXSA9IHJlbmFtZUZyb21cclxuICAgICAgPyBcInJlbmFtZVwiXHJcbiAgICAgIDogZGVsZXRlZEZpbGVNb2RlXHJcbiAgICAgID8gXCJmaWxlIGRlbGV0aW9uXCJcclxuICAgICAgOiBuZXdGaWxlTW9kZVxyXG4gICAgICA/IFwiZmlsZSBjcmVhdGlvblwiXHJcbiAgICAgIDogaHVua3MgJiYgaHVua3MubGVuZ3RoID4gMFxyXG4gICAgICA/IFwicGF0Y2hcIlxyXG4gICAgICA6IFwibW9kZSBjaGFuZ2VcIlxyXG5cclxuICAgIGxldCBkZXN0aW5hdGlvbkZpbGVQYXRoOiBzdHJpbmcgfCBudWxsID0gbnVsbFxyXG4gICAgc3dpdGNoICh0eXBlKSB7XHJcbiAgICAgIGNhc2UgXCJyZW5hbWVcIjpcclxuICAgICAgICBpZiAoIXJlbmFtZUZyb20gfHwgIXJlbmFtZVRvKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWQgcGFyc2VyIHN0YXRlOiByZW5hbWUgZnJvbSAmIHRvIG5vdCBnaXZlblwiKVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXN1bHQucHVzaCh7XHJcbiAgICAgICAgICB0eXBlOiBcInJlbmFtZVwiLFxyXG4gICAgICAgICAgZnJvbVBhdGg6IHJlbmFtZUZyb20sXHJcbiAgICAgICAgICB0b1BhdGg6IHJlbmFtZVRvLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgZGVzdGluYXRpb25GaWxlUGF0aCA9IHJlbmFtZVRvXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSBcImZpbGUgZGVsZXRpb25cIjoge1xyXG4gICAgICAgIGNvbnN0IHBhdGggPSBkaWZmTGluZUZyb21QYXRoIHx8IGZyb21QYXRoXHJcbiAgICAgICAgaWYgKCFwYXRoKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWQgcGFyc2Ugc3RhdGU6IG5vIHBhdGggZ2l2ZW4gZm9yIGZpbGUgZGVsZXRpb25cIilcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVzdWx0LnB1c2goe1xyXG4gICAgICAgICAgdHlwZTogXCJmaWxlIGRlbGV0aW9uXCIsXHJcbiAgICAgICAgICBodW5rOiAoaHVua3MgJiYgaHVua3NbMF0pIHx8IG51bGwsXHJcbiAgICAgICAgICBwYXRoLFxyXG4gICAgICAgICAgbW9kZTogcGFyc2VGaWxlTW9kZShkZWxldGVkRmlsZU1vZGUhKSxcclxuICAgICAgICAgIGhhc2g6IGJlZm9yZUhhc2gsXHJcbiAgICAgICAgfSlcclxuICAgICAgICBicmVha1xyXG4gICAgICB9XHJcbiAgICAgIGNhc2UgXCJmaWxlIGNyZWF0aW9uXCI6IHtcclxuICAgICAgICBjb25zdCBwYXRoID0gZGlmZkxpbmVUb1BhdGggfHwgdG9QYXRoXHJcbiAgICAgICAgaWYgKCFwYXRoKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJCYWQgcGFyc2Ugc3RhdGU6IG5vIHBhdGggZ2l2ZW4gZm9yIGZpbGUgY3JlYXRpb25cIilcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVzdWx0LnB1c2goe1xyXG4gICAgICAgICAgdHlwZTogXCJmaWxlIGNyZWF0aW9uXCIsXHJcbiAgICAgICAgICBodW5rOiAoaHVua3MgJiYgaHVua3NbMF0pIHx8IG51bGwsXHJcbiAgICAgICAgICBwYXRoLFxyXG4gICAgICAgICAgbW9kZTogcGFyc2VGaWxlTW9kZShuZXdGaWxlTW9kZSEpLFxyXG4gICAgICAgICAgaGFzaDogYWZ0ZXJIYXNoLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgfVxyXG4gICAgICBjYXNlIFwicGF0Y2hcIjpcclxuICAgICAgY2FzZSBcIm1vZGUgY2hhbmdlXCI6XHJcbiAgICAgICAgZGVzdGluYXRpb25GaWxlUGF0aCA9IHRvUGF0aCB8fCBkaWZmTGluZVRvUGF0aFxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgYXNzZXJ0TmV2ZXIodHlwZSlcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZGVzdGluYXRpb25GaWxlUGF0aCAmJiBvbGRNb2RlICYmIG5ld01vZGUgJiYgb2xkTW9kZSAhPT0gbmV3TW9kZSkge1xyXG4gICAgICByZXN1bHQucHVzaCh7XHJcbiAgICAgICAgdHlwZTogXCJtb2RlIGNoYW5nZVwiLFxyXG4gICAgICAgIHBhdGg6IGRlc3RpbmF0aW9uRmlsZVBhdGgsXHJcbiAgICAgICAgb2xkTW9kZTogcGFyc2VGaWxlTW9kZShvbGRNb2RlKSxcclxuICAgICAgICBuZXdNb2RlOiBwYXJzZUZpbGVNb2RlKG5ld01vZGUpLFxyXG4gICAgICB9KVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChkZXN0aW5hdGlvbkZpbGVQYXRoICYmIGh1bmtzICYmIGh1bmtzLmxlbmd0aCkge1xyXG4gICAgICByZXN1bHQucHVzaCh7XHJcbiAgICAgICAgdHlwZTogXCJwYXRjaFwiLFxyXG4gICAgICAgIHBhdGg6IGRlc3RpbmF0aW9uRmlsZVBhdGgsXHJcbiAgICAgICAgaHVua3MsXHJcbiAgICAgICAgYmVmb3JlSGFzaCxcclxuICAgICAgICBhZnRlckhhc2gsXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHBhcnNlRmlsZU1vZGUobW9kZTogc3RyaW5nKTogRmlsZU1vZGUge1xyXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1iaXR3aXNlXHJcbiAgY29uc3QgcGFyc2VkTW9kZSA9IHBhcnNlSW50KG1vZGUsIDgpICYgMG83NzdcclxuICBpZiAoXHJcbiAgICBwYXJzZWRNb2RlICE9PSBOT05fRVhFQ1VUQUJMRV9GSUxFX01PREUgJiZcclxuICAgIHBhcnNlZE1vZGUgIT09IEVYRUNVVEFCTEVfRklMRV9NT0RFXHJcbiAgKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmV4cGVjdGVkIGZpbGUgbW9kZSBzdHJpbmc6IFwiICsgbW9kZSlcclxuICB9XHJcbiAgcmV0dXJuIHBhcnNlZE1vZGVcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUGF0Y2hGaWxlKGZpbGU6IHN0cmluZyk6IFBhcnNlZFBhdGNoRmlsZSB7XHJcbiAgY29uc3QgbGluZXMgPSBmaWxlLnNwbGl0KC9cXG4vZylcclxuICBpZiAobGluZXNbbGluZXMubGVuZ3RoIC0gMV0gPT09IFwiXCIpIHtcclxuICAgIGxpbmVzLnBvcCgpXHJcbiAgfVxyXG4gIHRyeSB7XHJcbiAgICByZXR1cm4gaW50ZXJwcmV0UGFyc2VkUGF0Y2hGaWxlKFxyXG4gICAgICBwYXJzZVBhdGNoTGluZXMobGluZXMsIHsgc3VwcG9ydExlZ2FjeURpZmZzOiBmYWxzZSB9KSxcclxuICAgIClcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICBpZiAoXHJcbiAgICAgIGUgaW5zdGFuY2VvZiBFcnJvciAmJlxyXG4gICAgICBlLm1lc3NhZ2UgPT09IFwiaHVuayBoZWFkZXIgaW50ZWdyaXR5IGNoZWNrIGZhaWxlZFwiXHJcbiAgICApIHtcclxuICAgICAgcmV0dXJuIGludGVycHJldFBhcnNlZFBhdGNoRmlsZShcclxuICAgICAgICBwYXJzZVBhdGNoTGluZXMobGluZXMsIHsgc3VwcG9ydExlZ2FjeURpZmZzOiB0cnVlIH0pLFxyXG4gICAgICApXHJcbiAgICB9XHJcbiAgICB0aHJvdyBlXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdmVyaWZ5SHVua0ludGVncml0eShodW5rOiBIdW5rKSB7XHJcbiAgLy8gdmVyaWZ5IGh1bmsgaW50ZWdyaXR5XHJcbiAgbGV0IG9yaWdpbmFsTGVuZ3RoID0gMFxyXG4gIGxldCBwYXRjaGVkTGVuZ3RoID0gMFxyXG4gIGZvciAoY29uc3QgeyB0eXBlLCBsaW5lcyB9IG9mIGh1bmsucGFydHMpIHtcclxuICAgIHN3aXRjaCAodHlwZSkge1xyXG4gICAgICBjYXNlIFwiY29udGV4dFwiOlxyXG4gICAgICAgIHBhdGNoZWRMZW5ndGggKz0gbGluZXMubGVuZ3RoXHJcbiAgICAgICAgb3JpZ2luYWxMZW5ndGggKz0gbGluZXMubGVuZ3RoXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSBcImRlbGV0aW9uXCI6XHJcbiAgICAgICAgb3JpZ2luYWxMZW5ndGggKz0gbGluZXMubGVuZ3RoXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSBcImluc2VydGlvblwiOlxyXG4gICAgICAgIHBhdGNoZWRMZW5ndGggKz0gbGluZXMubGVuZ3RoXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICBhc3NlcnROZXZlcih0eXBlKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKFxyXG4gICAgb3JpZ2luYWxMZW5ndGggIT09IGh1bmsuaGVhZGVyLm9yaWdpbmFsLmxlbmd0aCB8fFxyXG4gICAgcGF0Y2hlZExlbmd0aCAhPT0gaHVuay5oZWFkZXIucGF0Y2hlZC5sZW5ndGhcclxuICApIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcImh1bmsgaGVhZGVyIGludGVncml0eSBjaGVjayBmYWlsZWRcIilcclxuICB9XHJcbn1cclxuIl19
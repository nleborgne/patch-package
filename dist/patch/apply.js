"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeEffects = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = require("path");
const assertNever_1 = require("../assertNever");
const executeEffects = (effects, { dryRun, bestEffort, errors, cwd, }) => {
    const inCwd = (path) => (cwd ? path_1.join(cwd, path) : path);
    const humanReadable = (path) => path_1.relative(process.cwd(), inCwd(path));
    effects.forEach((eff) => {
        switch (eff.type) {
            case "file deletion":
                if (dryRun) {
                    if (!fs_extra_1.default.existsSync(inCwd(eff.path))) {
                        throw new Error("Trying to delete file that doesn't exist: " +
                            humanReadable(eff.path));
                    }
                }
                else {
                    // TODO: integrity checks
                    try {
                        fs_extra_1.default.unlinkSync(inCwd(eff.path));
                    }
                    catch (e) {
                        if (bestEffort) {
                            errors === null || errors === void 0 ? void 0 : errors.push(`Failed to delete file ${eff.path}`);
                        }
                        else {
                            throw e;
                        }
                    }
                }
                break;
            case "rename":
                if (dryRun) {
                    // TODO: see what patch files look like if moving to exising path
                    if (!fs_extra_1.default.existsSync(inCwd(eff.fromPath))) {
                        throw new Error("Trying to move file that doesn't exist: " +
                            humanReadable(eff.fromPath));
                    }
                }
                else {
                    try {
                        fs_extra_1.default.moveSync(inCwd(eff.fromPath), inCwd(eff.toPath));
                    }
                    catch (e) {
                        if (bestEffort) {
                            errors === null || errors === void 0 ? void 0 : errors.push(`Failed to rename file ${eff.fromPath} to ${eff.toPath}`);
                        }
                        else {
                            throw e;
                        }
                    }
                }
                break;
            case "file creation":
                if (dryRun) {
                    if (fs_extra_1.default.existsSync(inCwd(eff.path))) {
                        throw new Error("Trying to create file that already exists: " +
                            humanReadable(eff.path));
                    }
                    // todo: check file contents matches
                }
                else {
                    const fileContents = eff.hunk
                        ? eff.hunk.parts[0].lines.join("\n") +
                            (eff.hunk.parts[0].noNewlineAtEndOfFile ? "" : "\n")
                        : "";
                    const path = inCwd(eff.path);
                    try {
                        fs_extra_1.default.ensureDirSync(path_1.dirname(path));
                        fs_extra_1.default.writeFileSync(path, fileContents, { mode: eff.mode });
                    }
                    catch (e) {
                        if (bestEffort) {
                            errors === null || errors === void 0 ? void 0 : errors.push(`Failed to create new file ${eff.path}`);
                        }
                        else {
                            throw e;
                        }
                    }
                }
                break;
            case "patch":
                applyPatch(eff, { dryRun, cwd, bestEffort, errors });
                break;
            case "mode change":
                const currentMode = fs_extra_1.default.statSync(inCwd(eff.path)).mode;
                if (((isExecutable(eff.newMode) && isExecutable(currentMode)) ||
                    (!isExecutable(eff.newMode) && !isExecutable(currentMode))) &&
                    dryRun) {
                    console.log(`Mode change is not required for file ${humanReadable(eff.path)}`);
                }
                fs_extra_1.default.chmodSync(inCwd(eff.path), eff.newMode);
                break;
            default:
                assertNever_1.assertNever(eff);
        }
    });
};
exports.executeEffects = executeEffects;
function isExecutable(fileMode) {
    // tslint:disable-next-line:no-bitwise
    return (fileMode & 64) > 0;
}
const trimRight = (s) => s.replace(/\s+$/, "");
function linesAreEqual(a, b) {
    return trimRight(a) === trimRight(b);
}
/**
 * How does noNewLineAtEndOfFile work?
 *
 * if you remove the newline from a file that had one without editing other bits:
 *
 *    it creates an insertion/removal pair where the insertion has \ No new line at end of file
 *
 * if you edit a file that didn't have a new line and don't add one:
 *
 *    both insertion and deletion have \ No new line at end of file
 *
 * if you edit a file that didn't have a new line and add one:
 *
 *    deletion has \ No new line at end of file
 *    but not insertion
 *
 * if you edit a file that had a new line and leave it in:
 *
 *    neither insetion nor deletion have the annoation
 *
 */
function applyPatch({ hunks, path }, { dryRun, cwd, bestEffort, errors, }) {
    path = cwd ? path_1.resolve(cwd, path) : path;
    // modifying the file in place
    const fileContents = fs_extra_1.default.readFileSync(path).toString();
    const mode = fs_extra_1.default.statSync(path).mode;
    const fileLines = fileContents.split(/\n/);
    const result = [];
    for (const hunk of hunks) {
        let fuzzingOffset = 0;
        while (true) {
            const modifications = evaluateHunk(hunk, fileLines, fuzzingOffset);
            if (modifications) {
                result.push(modifications);
                break;
            }
            fuzzingOffset =
                fuzzingOffset < 0 ? fuzzingOffset * -1 : fuzzingOffset * -1 - 1;
            if (Math.abs(fuzzingOffset) > 20) {
                const message = `Cannot apply hunk ${hunks.indexOf(hunk)} for file ${path_1.relative(process.cwd(), path)}\n\`\`\`diff\n${hunk.source}\n\`\`\`\n`;
                if (bestEffort) {
                    errors === null || errors === void 0 ? void 0 : errors.push(message);
                    break;
                }
                else {
                    throw new Error(message);
                }
            }
        }
    }
    if (dryRun) {
        return;
    }
    let diffOffset = 0;
    for (const modifications of result) {
        for (const modification of modifications) {
            switch (modification.type) {
                case "splice":
                    fileLines.splice(modification.index + diffOffset, modification.numToDelete, ...modification.linesToInsert);
                    diffOffset +=
                        modification.linesToInsert.length - modification.numToDelete;
                    break;
                case "pop":
                    fileLines.pop();
                    break;
                case "push":
                    fileLines.push(modification.line);
                    break;
                default:
                    assertNever_1.assertNever(modification);
            }
        }
    }
    try {
        fs_extra_1.default.writeFileSync(path, fileLines.join("\n"), { mode });
    }
    catch (e) {
        if (bestEffort) {
            errors === null || errors === void 0 ? void 0 : errors.push(`Failed to write file ${path}`);
        }
        else {
            throw e;
        }
    }
}
function evaluateHunk(hunk, fileLines, fuzzingOffset) {
    const result = [];
    let contextIndex = hunk.header.original.start - 1 + fuzzingOffset;
    // do bounds checks for index
    if (contextIndex < 0) {
        return null;
    }
    if (fileLines.length - contextIndex < hunk.header.original.length) {
        return null;
    }
    for (const part of hunk.parts) {
        switch (part.type) {
            case "deletion":
            case "context":
                for (const line of part.lines) {
                    const originalLine = fileLines[contextIndex];
                    if (!linesAreEqual(originalLine, line)) {
                        return null;
                    }
                    contextIndex++;
                }
                if (part.type === "deletion") {
                    result.push({
                        type: "splice",
                        index: contextIndex - part.lines.length,
                        numToDelete: part.lines.length,
                        linesToInsert: [],
                    });
                    if (part.noNewlineAtEndOfFile) {
                        result.push({
                            type: "push",
                            line: "",
                        });
                    }
                }
                break;
            case "insertion":
                result.push({
                    type: "splice",
                    index: contextIndex,
                    numToDelete: 0,
                    linesToInsert: part.lines,
                });
                if (part.noNewlineAtEndOfFile) {
                    result.push({ type: "pop" });
                }
                break;
            default:
                assertNever_1.assertNever(part.type);
        }
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcGF0Y2gvYXBwbHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0RBQXlCO0FBQ3pCLCtCQUF1RDtBQUV2RCxnREFBNEM7QUFFckMsTUFBTSxjQUFjLEdBQUcsQ0FDNUIsT0FBd0IsRUFDeEIsRUFDRSxNQUFNLEVBQ04sVUFBVSxFQUNWLE1BQU0sRUFDTixHQUFHLEdBQ3VFLEVBQzVFLEVBQUU7SUFDRixNQUFNLEtBQUssR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzlELE1BQU0sYUFBYSxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUUsQ0FBQyxlQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzVFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtRQUN0QixRQUFRLEdBQUcsQ0FBQyxJQUFJLEVBQUU7WUFDaEIsS0FBSyxlQUFlO2dCQUNsQixJQUFJLE1BQU0sRUFBRTtvQkFDVixJQUFJLENBQUMsa0JBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFO3dCQUNuQyxNQUFNLElBQUksS0FBSyxDQUNiLDRDQUE0Qzs0QkFDMUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FDMUIsQ0FBQTtxQkFDRjtpQkFDRjtxQkFBTTtvQkFDTCx5QkFBeUI7b0JBQ3pCLElBQUk7d0JBQ0Ysa0JBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO3FCQUMvQjtvQkFBQyxPQUFPLENBQUMsRUFB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SSxDQUFDLEtBQUssQ0FBQyxNQUFNO3dCQUN2QyxXQUFXLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO3dCQUM5QixhQUFhLEVBQUUsRUFBRTtxQkFDbEIsQ0FBQyxDQUFBO29CQUVGLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFO3dCQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDOzRCQUNWLElBQUksRUFBRSxNQUFNOzRCQUNaLElBQUksRUFBRSxFQUFFO3lCQUNULENBQUMsQ0FBQTtxQkFDSDtpQkFDRjtnQkFDRCxNQUFLO1lBQ1AsS0FBSyxXQUFXO2dCQUNkLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1YsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsS0FBSyxFQUFFLFlBQVk7b0JBQ25CLFdBQVcsRUFBRSxDQUFDO29CQUNkLGFBQWEsRUFBRSxJQUFJLENBQUMsS0FBSztpQkFDMUIsQ0FBQyxDQUFBO2dCQUNGLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFO29CQUM3QixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7aUJBQzdCO2dCQUNELE1BQUs7WUFDUDtnQkFDRSx5QkFBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUN6QjtLQUNGO0lBRUQsT0FBTyxNQUFNLENBQUE7QUFDZixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gXCJmcy1leHRyYVwiXHJcbmltcG9ydCB7IGRpcm5hbWUsIGpvaW4sIHJlbGF0aXZlLCByZXNvbHZlIH0gZnJvbSBcInBhdGhcIlxyXG5pbXBvcnQgeyBQYXJzZWRQYXRjaEZpbGUsIEZpbGVQYXRjaCwgSHVuayB9IGZyb20gXCIuL3BhcnNlXCJcclxuaW1wb3J0IHsgYXNzZXJ0TmV2ZXIgfSBmcm9tIFwiLi4vYXNzZXJ0TmV2ZXJcIlxyXG5cclxuZXhwb3J0IGNvbnN0IGV4ZWN1dGVFZmZlY3RzID0gKFxyXG4gIGVmZmVjdHM6IFBhcnNlZFBhdGNoRmlsZSxcclxuICB7XHJcbiAgICBkcnlSdW4sXHJcbiAgICBiZXN0RWZmb3J0LFxyXG4gICAgZXJyb3JzLFxyXG4gICAgY3dkLFxyXG4gIH06IHsgZHJ5UnVuOiBib29sZWFuOyBjd2Q/OiBzdHJpbmc7IGVycm9ycz86IHN0cmluZ1tdOyBiZXN0RWZmb3J0OiBib29sZWFuIH0sXHJcbikgPT4ge1xyXG4gIGNvbnN0IGluQ3dkID0gKHBhdGg6IHN0cmluZykgPT4gKGN3ZCA/IGpvaW4oY3dkLCBwYXRoKSA6IHBhdGgpXHJcbiAgY29uc3QgaHVtYW5SZWFkYWJsZSA9IChwYXRoOiBzdHJpbmcpID0+IHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGluQ3dkKHBhdGgpKVxyXG4gIGVmZmVjdHMuZm9yRWFjaCgoZWZmKSA9PiB7XHJcbiAgICBzd2l0Y2ggKGVmZi50eXBlKSB7XHJcbiAgICAgIGNhc2UgXCJmaWxlIGRlbGV0aW9uXCI6XHJcbiAgICAgICAgaWYgKGRyeVJ1bikge1xyXG4gICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGluQ3dkKGVmZi5wYXRoKSkpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgIFwiVHJ5aW5nIHRvIGRlbGV0ZSBmaWxlIHRoYXQgZG9lc24ndCBleGlzdDogXCIgK1xyXG4gICAgICAgICAgICAgICAgaHVtYW5SZWFkYWJsZShlZmYucGF0aCksXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgLy8gVE9ETzogaW50ZWdyaXR5IGNoZWNrc1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgZnMudW5saW5rU3luYyhpbkN3ZChlZmYucGF0aCkpXHJcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGlmIChiZXN0RWZmb3J0KSB7XHJcbiAgICAgICAgICAgICAgZXJyb3JzPy5wdXNoKGBGYWlsZWQgdG8gZGVsZXRlIGZpbGUgJHtlZmYucGF0aH1gKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIHRocm93IGVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlIFwicmVuYW1lXCI6XHJcbiAgICAgICAgaWYgKGRyeVJ1bikge1xyXG4gICAgICAgICAgLy8gVE9ETzogc2VlIHdoYXQgcGF0Y2ggZmlsZXMgbG9vayBsaWtlIGlmIG1vdmluZyB0byBleGlzaW5nIHBhdGhcclxuICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhpbkN3ZChlZmYuZnJvbVBhdGgpKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgXCJUcnlpbmcgdG8gbW92ZSBmaWxlIHRoYXQgZG9lc24ndCBleGlzdDogXCIgK1xyXG4gICAgICAgICAgICAgICAgaHVtYW5SZWFkYWJsZShlZmYuZnJvbVBhdGgpLFxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGZzLm1vdmVTeW5jKGluQ3dkKGVmZi5mcm9tUGF0aCksIGluQ3dkKGVmZi50b1BhdGgpKVxyXG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBpZiAoYmVzdEVmZm9ydCkge1xyXG4gICAgICAgICAgICAgIGVycm9ycz8ucHVzaChcclxuICAgICAgICAgICAgICAgIGBGYWlsZWQgdG8gcmVuYW1lIGZpbGUgJHtlZmYuZnJvbVBhdGh9IHRvICR7ZWZmLnRvUGF0aH1gLFxyXG4gICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICB0aHJvdyBlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgY2FzZSBcImZpbGUgY3JlYXRpb25cIjpcclxuICAgICAgICBpZiAoZHJ5UnVuKSB7XHJcbiAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhpbkN3ZChlZmYucGF0aCkpKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgICBcIlRyeWluZyB0byBjcmVhdGUgZmlsZSB0aGF0IGFscmVhZHkgZXhpc3RzOiBcIiArXHJcbiAgICAgICAgICAgICAgICBodW1hblJlYWRhYmxlKGVmZi5wYXRoKSxcclxuICAgICAgICAgICAgKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgLy8gdG9kbzogY2hlY2sgZmlsZSBjb250ZW50cyBtYXRjaGVzXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNvbnN0IGZpbGVDb250ZW50cyA9IGVmZi5odW5rXHJcbiAgICAgICAgICAgID8gZWZmLmh1bmsucGFydHNbMF0ubGluZXMuam9pbihcIlxcblwiKSArXHJcbiAgICAgICAgICAgICAgKGVmZi5odW5rLnBhcnRzWzBdLm5vTmV3bGluZUF0RW5kT2ZGaWxlID8gXCJcIiA6IFwiXFxuXCIpXHJcbiAgICAgICAgICAgIDogXCJcIlxyXG4gICAgICAgICAgY29uc3QgcGF0aCA9IGluQ3dkKGVmZi5wYXRoKVxyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgZnMuZW5zdXJlRGlyU3luYyhkaXJuYW1lKHBhdGgpKVxyXG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHBhdGgsIGZpbGVDb250ZW50cywgeyBtb2RlOiBlZmYubW9kZSB9KVxyXG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBpZiAoYmVzdEVmZm9ydCkge1xyXG4gICAgICAgICAgICAgIGVycm9ycz8ucHVzaChgRmFpbGVkIHRvIGNyZWF0ZSBuZXcgZmlsZSAke2VmZi5wYXRofWApXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgdGhyb3cgZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgXCJwYXRjaFwiOlxyXG4gICAgICAgIGFwcGx5UGF0Y2goZWZmLCB7IGRyeVJ1biwgY3dkLCBiZXN0RWZmb3J0LCBlcnJvcnMgfSlcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlIFwibW9kZSBjaGFuZ2VcIjpcclxuICAgICAgICBjb25zdCBjdXJyZW50TW9kZSA9IGZzLnN0YXRTeW5jKGluQ3dkKGVmZi5wYXRoKSkubW9kZVxyXG4gICAgICAgIGlmIChcclxuICAgICAgICAgICgoaXNFeGVjdXRhYmxlKGVmZi5uZXdNb2RlKSAmJiBpc0V4ZWN1dGFibGUoY3VycmVudE1vZGUpKSB8fFxyXG4gICAgICAgICAgICAoIWlzRXhlY3V0YWJsZShlZmYubmV3TW9kZSkgJiYgIWlzRXhlY3V0YWJsZShjdXJyZW50TW9kZSkpKSAmJlxyXG4gICAgICAgICAgZHJ5UnVuXHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgYE1vZGUgY2hhbmdlIGlzIG5vdCByZXF1aXJlZCBmb3IgZmlsZSAke2h1bWFuUmVhZGFibGUoZWZmLnBhdGgpfWAsXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZzLmNobW9kU3luYyhpbkN3ZChlZmYucGF0aCksIGVmZi5uZXdNb2RlKVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgYXNzZXJ0TmV2ZXIoZWZmKVxyXG4gICAgfVxyXG4gIH0pXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGlzRXhlY3V0YWJsZShmaWxlTW9kZTogbnVtYmVyKSB7XHJcbiAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWJpdHdpc2VcclxuICByZXR1cm4gKGZpbGVNb2RlICYgMGIwMDFfMDAwXzAwMCkgPiAwXHJcbn1cclxuXHJcbmNvbnN0IHRyaW1SaWdodCA9IChzOiBzdHJpbmcpID0+IHMucmVwbGFjZSgvXFxzKyQvLCBcIlwiKVxyXG5mdW5jdGlvbiBsaW5lc0FyZUVxdWFsKGE6IHN0cmluZywgYjogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIHRyaW1SaWdodChhKSA9PT0gdHJpbVJpZ2h0KGIpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIb3cgZG9lcyBub05ld0xpbmVBdEVuZE9mRmlsZSB3b3JrP1xyXG4gKlxyXG4gKiBpZiB5b3UgcmVtb3ZlIHRoZSBuZXdsaW5lIGZyb20gYSBmaWxlIHRoYXQgaGFkIG9uZSB3aXRob3V0IGVkaXRpbmcgb3RoZXIgYml0czpcclxuICpcclxuICogICAgaXQgY3JlYXRlcyBhbiBpbnNlcnRpb24vcmVtb3ZhbCBwYWlyIHdoZXJlIHRoZSBpbnNlcnRpb24gaGFzIFxcIE5vIG5ldyBsaW5lIGF0IGVuZCBvZiBmaWxlXHJcbiAqXHJcbiAqIGlmIHlvdSBlZGl0IGEgZmlsZSB0aGF0IGRpZG4ndCBoYXZlIGEgbmV3IGxpbmUgYW5kIGRvbid0IGFkZCBvbmU6XHJcbiAqXHJcbiAqICAgIGJvdGggaW5zZXJ0aW9uIGFuZCBkZWxldGlvbiBoYXZlIFxcIE5vIG5ldyBsaW5lIGF0IGVuZCBvZiBmaWxlXHJcbiAqXHJcbiAqIGlmIHlvdSBlZGl0IGEgZmlsZSB0aGF0IGRpZG4ndCBoYXZlIGEgbmV3IGxpbmUgYW5kIGFkZCBvbmU6XHJcbiAqXHJcbiAqICAgIGRlbGV0aW9uIGhhcyBcXCBObyBuZXcgbGluZSBhdCBlbmQgb2YgZmlsZVxyXG4gKiAgICBidXQgbm90IGluc2VydGlvblxyXG4gKlxyXG4gKiBpZiB5b3UgZWRpdCBhIGZpbGUgdGhhdCBoYWQgYSBuZXcgbGluZSBhbmQgbGVhdmUgaXQgaW46XHJcbiAqXHJcbiAqICAgIG5laXRoZXIgaW5zZXRpb24gbm9yIGRlbGV0aW9uIGhhdmUgdGhlIGFubm9hdGlvblxyXG4gKlxyXG4gKi9cclxuXHJcbmZ1bmN0aW9uIGFwcGx5UGF0Y2goXHJcbiAgeyBodW5rcywgcGF0aCB9OiBGaWxlUGF0Y2gsXHJcbiAge1xyXG4gICAgZHJ5UnVuLFxyXG4gICAgY3dkLFxyXG4gICAgYmVzdEVmZm9ydCxcclxuICAgIGVycm9ycyxcclxuICB9OiB7IGRyeVJ1bjogYm9vbGVhbjsgY3dkPzogc3RyaW5nOyBiZXN0RWZmb3J0OiBib29sZWFuOyBlcnJvcnM/OiBzdHJpbmdbXSB9LFxyXG4pOiB2b2lkIHtcclxuICBwYXRoID0gY3dkID8gcmVzb2x2ZShjd2QsIHBhdGgpIDogcGF0aFxyXG4gIC8vIG1vZGlmeWluZyB0aGUgZmlsZSBpbiBwbGFjZVxyXG4gIGNvbnN0IGZpbGVDb250ZW50cyA9IGZzLnJlYWRGaWxlU3luYyhwYXRoKS50b1N0cmluZygpXHJcbiAgY29uc3QgbW9kZSA9IGZzLnN0YXRTeW5jKHBhdGgpLm1vZGVcclxuXHJcbiAgY29uc3QgZmlsZUxpbmVzOiBzdHJpbmdbXSA9IGZpbGVDb250ZW50cy5zcGxpdCgvXFxuLylcclxuXHJcbiAgY29uc3QgcmVzdWx0OiBNb2RpZmljYXRpb25bXVtdID0gW11cclxuXHJcbiAgZm9yIChjb25zdCBodW5rIG9mIGh1bmtzKSB7XHJcbiAgICBsZXQgZnV6emluZ09mZnNldCA9IDBcclxuICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgIGNvbnN0IG1vZGlmaWNhdGlvbnMgPSBldmFsdWF0ZUh1bmsoaHVuaywgZmlsZUxpbmVzLCBmdXp6aW5nT2Zmc2V0KVxyXG4gICAgICBpZiAobW9kaWZpY2F0aW9ucykge1xyXG4gICAgICAgIHJlc3VsdC5wdXNoKG1vZGlmaWNhdGlvbnMpXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgfVxyXG5cclxuICAgICAgZnV6emluZ09mZnNldCA9XHJcbiAgICAgICAgZnV6emluZ09mZnNldCA8IDAgPyBmdXp6aW5nT2Zmc2V0ICogLTEgOiBmdXp6aW5nT2Zmc2V0ICogLTEgLSAxXHJcblxyXG4gICAgICBpZiAoTWF0aC5hYnMoZnV6emluZ09mZnNldCkgPiAyMCkge1xyXG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBgQ2Fubm90IGFwcGx5IGh1bmsgJHtodW5rcy5pbmRleE9mKFxyXG4gICAgICAgICAgaHVuayxcclxuICAgICAgICApfSBmb3IgZmlsZSAke3JlbGF0aXZlKHByb2Nlc3MuY3dkKCksIHBhdGgpfVxcblxcYFxcYFxcYGRpZmZcXG4ke1xyXG4gICAgICAgICAgaHVuay5zb3VyY2VcclxuICAgICAgICB9XFxuXFxgXFxgXFxgXFxuYFxyXG5cclxuICAgICAgICBpZiAoYmVzdEVmZm9ydCkge1xyXG4gICAgICAgICAgZXJyb3JzPy5wdXNoKG1lc3NhZ2UpXHJcbiAgICAgICAgICBicmVha1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChkcnlSdW4pIHtcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgbGV0IGRpZmZPZmZzZXQgPSAwXHJcblxyXG4gIGZvciAoY29uc3QgbW9kaWZpY2F0aW9ucyBvZiByZXN1bHQpIHtcclxuICAgIGZvciAoY29uc3QgbW9kaWZpY2F0aW9uIG9mIG1vZGlmaWNhdGlvbnMpIHtcclxuICAgICAgc3dpdGNoIChtb2RpZmljYXRpb24udHlwZSkge1xyXG4gICAgICAgIGNhc2UgXCJzcGxpY2VcIjpcclxuICAgICAgICAgIGZpbGVMaW5lcy5zcGxpY2UoXHJcbiAgICAgICAgICAgIG1vZGlmaWNhdGlvbi5pbmRleCArIGRpZmZPZmZzZXQsXHJcbiAgICAgICAgICAgIG1vZGlmaWNhdGlvbi5udW1Ub0RlbGV0ZSxcclxuICAgICAgICAgICAgLi4ubW9kaWZpY2F0aW9uLmxpbmVzVG9JbnNlcnQsXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICBkaWZmT2Zmc2V0ICs9XHJcbiAgICAgICAgICAgIG1vZGlmaWNhdGlvbi5saW5lc1RvSW5zZXJ0Lmxlbmd0aCAtIG1vZGlmaWNhdGlvbi5udW1Ub0RlbGV0ZVxyXG4gICAgICAgICAgYnJlYWtcclxuICAgICAgICBjYXNlIFwicG9wXCI6XHJcbiAgICAgICAgICBmaWxlTGluZXMucG9wKClcclxuICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgY2FzZSBcInB1c2hcIjpcclxuICAgICAgICAgIGZpbGVMaW5lcy5wdXNoKG1vZGlmaWNhdGlvbi5saW5lKVxyXG4gICAgICAgICAgYnJlYWtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgYXNzZXJ0TmV2ZXIobW9kaWZpY2F0aW9uKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgZnMud3JpdGVGaWxlU3luYyhwYXRoLCBmaWxlTGluZXMuam9pbihcIlxcblwiKSwgeyBtb2RlIH0pXHJcbiAgfSBjYXRjaCAoZSkge1xyXG4gICAgaWYgKGJlc3RFZmZvcnQpIHtcclxuICAgICAgZXJyb3JzPy5wdXNoKGBGYWlsZWQgdG8gd3JpdGUgZmlsZSAke3BhdGh9YClcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRocm93IGVcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmludGVyZmFjZSBQdXNoIHtcclxuICB0eXBlOiBcInB1c2hcIlxyXG4gIGxpbmU6IHN0cmluZ1xyXG59XHJcbmludGVyZmFjZSBQb3Age1xyXG4gIHR5cGU6IFwicG9wXCJcclxufVxyXG5pbnRlcmZhY2UgU3BsaWNlIHtcclxuICB0eXBlOiBcInNwbGljZVwiXHJcbiAgaW5kZXg6IG51bWJlclxyXG4gIG51bVRvRGVsZXRlOiBudW1iZXJcclxuICBsaW5lc1RvSW5zZXJ0OiBzdHJpbmdbXVxyXG59XHJcblxyXG50eXBlIE1vZGlmaWNhdGlvbiA9IFB1c2ggfCBQb3AgfCBTcGxpY2VcclxuXHJcbmZ1bmN0aW9uIGV2YWx1YXRlSHVuayhcclxuICBodW5rOiBIdW5rLFxyXG4gIGZpbGVMaW5lczogc3RyaW5nW10sXHJcbiAgZnV6emluZ09mZnNldDogbnVtYmVyLFxyXG4pOiBNb2RpZmljYXRpb25bXSB8IG51bGwge1xyXG4gIGNvbnN0IHJlc3VsdDogTW9kaWZpY2F0aW9uW10gPSBbXVxyXG4gIGxldCBjb250ZXh0SW5kZXggPSBodW5rLmhlYWRlci5vcmlnaW5hbC5zdGFydCAtIDEgKyBmdXp6aW5nT2Zmc2V0XHJcbiAgLy8gZG8gYm91bmRzIGNoZWNrcyBmb3IgaW5kZXhcclxuICBpZiAoY29udGV4dEluZGV4IDwgMCkge1xyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcbiAgaWYgKGZpbGVMaW5lcy5sZW5ndGggLSBjb250ZXh0SW5kZXggPCBodW5rLmhlYWRlci5vcmlnaW5hbC5sZW5ndGgpIHtcclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG5cclxuICBmb3IgKGNvbnN0IHBhcnQgb2YgaHVuay5wYXJ0cykge1xyXG4gICAgc3dpdGNoIChwYXJ0LnR5cGUpIHtcclxuICAgICAgY2FzZSBcImRlbGV0aW9uXCI6XHJcbiAgICAgIGNhc2UgXCJjb250ZXh0XCI6XHJcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIHBhcnQubGluZXMpIHtcclxuICAgICAgICAgIGNvbnN0IG9yaWdpbmFsTGluZSA9IGZpbGVMaW5lc1tjb250ZXh0SW5kZXhdXHJcbiAgICAgICAgICBpZiAoIWxpbmVzQXJlRXF1YWwob3JpZ2luYWxMaW5lLCBsaW5lKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgY29udGV4dEluZGV4KytcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChwYXJ0LnR5cGUgPT09IFwiZGVsZXRpb25cIikge1xyXG4gICAgICAgICAgcmVzdWx0LnB1c2goe1xyXG4gICAgICAgICAgICB0eXBlOiBcInNwbGljZVwiLFxyXG4gICAgICAgICAgICBpbmRleDogY29udGV4dEluZGV4IC0gcGFydC5saW5lcy5sZW5ndGgsXHJcbiAgICAgICAgICAgIG51bVRvRGVsZXRlOiBwYXJ0LmxpbmVzLmxlbmd0aCxcclxuICAgICAgICAgICAgbGluZXNUb0luc2VydDogW10sXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIGlmIChwYXJ0Lm5vTmV3bGluZUF0RW5kT2ZGaWxlKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHtcclxuICAgICAgICAgICAgICB0eXBlOiBcInB1c2hcIixcclxuICAgICAgICAgICAgICBsaW5lOiBcIlwiLFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlIFwiaW5zZXJ0aW9uXCI6XHJcbiAgICAgICAgcmVzdWx0LnB1c2goe1xyXG4gICAgICAgICAgdHlwZTogXCJzcGxpY2VcIixcclxuICAgICAgICAgIGluZGV4OiBjb250ZXh0SW5kZXgsXHJcbiAgICAgICAgICBudW1Ub0RlbGV0ZTogMCxcclxuICAgICAgICAgIGxpbmVzVG9JbnNlcnQ6IHBhcnQubGluZXMsXHJcbiAgICAgICAgfSlcclxuICAgICAgICBpZiAocGFydC5ub05ld2xpbmVBdEVuZE9mRmlsZSkge1xyXG4gICAgICAgICAgcmVzdWx0LnB1c2goeyB0eXBlOiBcInBvcFwiIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgYXNzZXJ0TmV2ZXIocGFydC50eXBlKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcbiJdfQ==
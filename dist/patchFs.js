"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGroupedPatches = exports.getPatchFiles = void 0;
const PackageDetails_1 = require("./PackageDetails");
const path_1 = require("./path");
const klaw_sync_1 = __importDefault(require("klaw-sync"));
const getPatchFiles = (patchesDir) => {
    try {
        return klaw_sync_1.default(patchesDir, { nodir: true })
            .map(({ path }) => path_1.relative(patchesDir, path))
            .filter((path) => path.endsWith(".patch"));
    }
    catch (e) {
        return [];
    }
};
exports.getPatchFiles = getPatchFiles;
const getGroupedPatches = (patchesDirectory) => {
    const files = exports.getPatchFiles(patchesDirectory);
    if (files.length === 0) {
        return {
            numPatchFiles: 0,
            pathSpecifierToPatchFiles: {},
            warnings: [],
        };
    }
    const warnings = [];
    const pathSpecifierToPatchFiles = {};
    for (const file of files) {
        const details = PackageDetails_1.getPackageDetailsFromPatchFilename(file);
        if (!details) {
            warnings.push(`Unrecognized patch file in patches directory ${file}`);
            continue;
        }
        if (!pathSpecifierToPatchFiles[details.pathSpecifier]) {
            pathSpecifierToPatchFiles[details.pathSpecifier] = [];
        }
        pathSpecifierToPatchFiles[details.pathSpecifier].push(details);
    }
    for (const arr of Object.values(pathSpecifierToPatchFiles)) {
        arr.sort((a, b) => {
            var _a, _b;
            return ((_a = a.sequenceNumber) !== null && _a !== void 0 ? _a : 0) - ((_b = b.sequenceNumber) !== null && _b !== void 0 ? _b : 0);
        });
    }
    return {
        numPatchFiles: files.length,
        pathSpecifierToPatchFiles,
        warnings,
    };
};
exports.getGroupedPatches = getGroupedPatches;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0Y2hGcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXRjaEZzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLHFEQUd5QjtBQUN6QixpQ0FBaUM7QUFDakMsMERBQWdDO0FBRXpCLE1BQU0sYUFBYSxHQUFHLENBQUMsVUFBa0IsRUFBRSxFQUFFO0lBQ2xELElBQUk7UUFDRixPQUFPLG1CQUFRLENBQUMsVUFBVSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDO2FBQ3pDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLGVBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7YUFDN0MsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7S0FDN0M7SUFBQyxPQUFPLENBQUMsRUFBRTtRQUNWLE9BQU8sRUFBRSxDQUFBO0tBQ1Y7QUFDSCxDQUFDLENBQUE7QUFSWSxRQUFBLGFBQWEsaUJBUXpCO0FBT00sTUFBTSxpQkFBaUIsR0FBRyxDQUFDLGdCQUF3QixFQUFrQixFQUFFO0lBQzVFLE1BQU0sS0FBSyxHQUFHLHFCQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtJQUU3QyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3RCLE9BQU87WUFDTCxhQUFhLEVBQUUsQ0FBQztZQUNoQix5QkFBeUIsRUFBRSxFQUFFO1lBQzdCLFFBQVEsRUFBRSxFQUFFO1NBQ2IsQ0FBQTtLQUNGO0lBRUQsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFBO0lBRTdCLE1BQU0seUJBQXlCLEdBQTRDLEVBQUUsQ0FBQTtJQUM3RSxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtRQUN4QixNQUFNLE9BQU8sR0FBRyxtREFBa0MsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN4RCxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ1osUUFBUSxDQUFDLElBQUksQ0FBQyxnREFBZ0QsSUFBSSxFQUFFLENBQUMsQ0FBQTtZQUNyRSxTQUFRO1NBQ1Q7UUFDRCxJQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxFQUFFO1lBQ3JELHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUE7U0FDdEQ7UUFDRCx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0tBQy9EO0lBQ0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLEVBQUU7UUFDMUQsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTs7WUFDaEIsT0FBTyxDQUFDLE1BQUEsQ0FBQyxDQUFDLGNBQWMsbUNBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFBLENBQUMsQ0FBQyxjQUFjLG1DQUFJLENBQUMsQ0FBQyxDQUFBO1FBQzFELENBQUMsQ0FBQyxDQUFBO0tBQ0g7SUFFRCxPQUFPO1FBQ0wsYUFBYSxFQUFFLEtBQUssQ0FBQyxNQUFNO1FBQzNCLHlCQUF5QjtRQUN6QixRQUFRO0tBQ1QsQ0FBQTtBQUNILENBQUMsQ0FBQTtBQXBDWSxRQUFBLGlCQUFpQixxQkFvQzdCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuICBQYXRjaGVkUGFja2FnZURldGFpbHMsXHJcbiAgZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZSxcclxufSBmcm9tIFwiLi9QYWNrYWdlRGV0YWlsc1wiXHJcbmltcG9ydCB7IHJlbGF0aXZlIH0gZnJvbSBcIi4vcGF0aFwiXHJcbmltcG9ydCBrbGF3U3luYyBmcm9tIFwia2xhdy1zeW5jXCJcclxuXHJcbmV4cG9ydCBjb25zdCBnZXRQYXRjaEZpbGVzID0gKHBhdGNoZXNEaXI6IHN0cmluZykgPT4ge1xyXG4gIHRyeSB7XHJcbiAgICByZXR1cm4ga2xhd1N5bmMocGF0Y2hlc0RpciwgeyBub2RpcjogdHJ1ZSB9KVxyXG4gICAgICAubWFwKCh7IHBhdGggfSkgPT4gcmVsYXRpdmUocGF0Y2hlc0RpciwgcGF0aCkpXHJcbiAgICAgIC5maWx0ZXIoKHBhdGgpID0+IHBhdGguZW5kc1dpdGgoXCIucGF0Y2hcIikpXHJcbiAgfSBjYXRjaCAoZSkge1xyXG4gICAgcmV0dXJuIFtdXHJcbiAgfVxyXG59XHJcblxyXG5pbnRlcmZhY2UgR3JvdXBlZFBhdGNoZXMge1xyXG4gIG51bVBhdGNoRmlsZXM6IG51bWJlclxyXG4gIHBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXM6IFJlY29yZDxzdHJpbmcsIFBhdGNoZWRQYWNrYWdlRGV0YWlsc1tdPlxyXG4gIHdhcm5pbmdzOiBzdHJpbmdbXVxyXG59XHJcbmV4cG9ydCBjb25zdCBnZXRHcm91cGVkUGF0Y2hlcyA9IChwYXRjaGVzRGlyZWN0b3J5OiBzdHJpbmcpOiBHcm91cGVkUGF0Y2hlcyA9PiB7XHJcbiAgY29uc3QgZmlsZXMgPSBnZXRQYXRjaEZpbGVzKHBhdGNoZXNEaXJlY3RvcnkpXHJcblxyXG4gIGlmIChmaWxlcy5sZW5ndGggPT09IDApIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIG51bVBhdGNoRmlsZXM6IDAsXHJcbiAgICAgIHBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXM6IHt9LFxyXG4gICAgICB3YXJuaW5nczogW10sXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbXVxyXG5cclxuICBjb25zdCBwYXRoU3BlY2lmaWVyVG9QYXRjaEZpbGVzOiBSZWNvcmQ8c3RyaW5nLCBQYXRjaGVkUGFja2FnZURldGFpbHNbXT4gPSB7fVxyXG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xyXG4gICAgY29uc3QgZGV0YWlscyA9IGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUoZmlsZSlcclxuICAgIGlmICghZGV0YWlscykge1xyXG4gICAgICB3YXJuaW5ncy5wdXNoKGBVbnJlY29nbml6ZWQgcGF0Y2ggZmlsZSBpbiBwYXRjaGVzIGRpcmVjdG9yeSAke2ZpbGV9YClcclxuICAgICAgY29udGludWVcclxuICAgIH1cclxuICAgIGlmICghcGF0aFNwZWNpZmllclRvUGF0Y2hGaWxlc1tkZXRhaWxzLnBhdGhTcGVjaWZpZXJdKSB7XHJcbiAgICAgIHBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXNbZGV0YWlscy5wYXRoU3BlY2lmaWVyXSA9IFtdXHJcbiAgICB9XHJcbiAgICBwYXRoU3BlY2lmaWVyVG9QYXRjaEZpbGVzW2RldGFpbHMucGF0aFNwZWNpZmllcl0ucHVzaChkZXRhaWxzKVxyXG4gIH1cclxuICBmb3IgKGNvbnN0IGFyciBvZiBPYmplY3QudmFsdWVzKHBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXMpKSB7XHJcbiAgICBhcnIuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICByZXR1cm4gKGEuc2VxdWVuY2VOdW1iZXIgPz8gMCkgLSAoYi5zZXF1ZW5jZU51bWJlciA/PyAwKVxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBudW1QYXRjaEZpbGVzOiBmaWxlcy5sZW5ndGgsXHJcbiAgICBwYXRoU3BlY2lmaWVyVG9QYXRjaEZpbGVzLFxyXG4gICAgd2FybmluZ3MsXHJcbiAgfVxyXG59XHJcbiJdfQ==
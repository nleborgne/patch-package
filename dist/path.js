"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.relative = exports.resolve = exports.dirname = exports.join = void 0;
const slash_1 = __importDefault(require("slash"));
const path_1 = __importDefault(require("path"));
const join = (...args) => slash_1.default(path_1.default.join(...args));
exports.join = join;
var path_2 = require("path");
Object.defineProperty(exports, "dirname", { enumerable: true, get: function () { return path_2.dirname; } });
const resolve = (...args) => slash_1.default(path_1.default.resolve(...args));
exports.resolve = resolve;
const relative = (...args) => slash_1.default(path_1.default.relative(...args));
exports.relative = relative;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGF0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9wYXRoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGtEQUF5QjtBQUN6QixnREFBdUI7QUFFaEIsTUFBTSxJQUFJLEdBQXFCLENBQUMsR0FBRyxJQUFJLEVBQUUsRUFBRSxDQUFDLGVBQUssQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQTtBQUEvRCxRQUFBLElBQUksUUFBMkQ7QUFFNUUsNkJBQThCO0FBQXJCLCtGQUFBLE9BQU8sT0FBQTtBQUVULE1BQU0sT0FBTyxHQUF3QixDQUFDLEdBQUcsSUFBSSxFQUFFLEVBQUUsQ0FDdEQsZUFBSyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBRGpCLFFBQUEsT0FBTyxXQUNVO0FBRXZCLE1BQU0sUUFBUSxHQUF5QixDQUFDLEdBQUcsSUFBSSxFQUFFLEVBQUUsQ0FDeEQsZUFBSyxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO0FBRGxCLFFBQUEsUUFBUSxZQUNVIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHNsYXNoIGZyb20gXCJzbGFzaFwiXHJcbmltcG9ydCBwYXRoIGZyb20gXCJwYXRoXCJcclxuXHJcbmV4cG9ydCBjb25zdCBqb2luOiB0eXBlb2YgcGF0aC5qb2luID0gKC4uLmFyZ3MpID0+IHNsYXNoKHBhdGguam9pbiguLi5hcmdzKSlcclxuXHJcbmV4cG9ydCB7IGRpcm5hbWUgfSBmcm9tIFwicGF0aFwiXHJcblxyXG5leHBvcnQgY29uc3QgcmVzb2x2ZTogdHlwZW9mIHBhdGgucmVzb2x2ZSA9ICguLi5hcmdzKSA9PlxyXG4gIHNsYXNoKHBhdGgucmVzb2x2ZSguLi5hcmdzKSlcclxuXHJcbmV4cG9ydCBjb25zdCByZWxhdGl2ZTogdHlwZW9mIHBhdGgucmVsYXRpdmUgPSAoLi4uYXJncykgPT5cclxuICBzbGFzaChwYXRoLnJlbGF0aXZlKC4uLmFyZ3MpKVxyXG4iXX0=
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.coerceSemVer = void 0;
const semver_1 = __importDefault(require("semver"));
function coerceSemVer(version) {
    var _a;
    return ((_a = semver_1.default.coerce(version)) === null || _a === void 0 ? void 0 : _a.version) || null;
}
exports.coerceSemVer = coerceSemVer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29lcmNlU2VtVmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NvZXJjZVNlbVZlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBMkI7QUFFM0IsU0FBZ0IsWUFBWSxDQUFDLE9BQWU7O0lBQzFDLE9BQU8sQ0FBQSxNQUFBLGdCQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQywwQ0FBRSxPQUFPLEtBQUksSUFBSSxDQUFBO0FBQ2hELENBQUM7QUFGRCxvQ0FFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzZW12ZXIgZnJvbSBcInNlbXZlclwiXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gY29lcmNlU2VtVmVyKHZlcnNpb246IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xyXG4gIHJldHVybiBzZW12ZXIuY29lcmNlKHZlcnNpb24pPy52ZXJzaW9uIHx8IG51bGxcclxufVxyXG4iXX0=
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRegExp = void 0;
const chalk_1 = __importDefault(require("chalk"));
const makeRegExp = (reString, name, defaultValue, caseSensitive) => {
    if (!reString) {
        return defaultValue;
    }
    else {
        try {
            return new RegExp(reString, caseSensitive ? "" : "i");
        }
        catch (_) {
            console.log(`${chalk_1.default.red.bold("***ERROR***")}
Invalid format for option --${name}

  Unable to convert the string ${JSON.stringify(reString)} to a regular expression.
`);
            process.exit(1);
            return /unreachable/;
        }
    }
};
exports.makeRegExp = makeRegExp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFrZVJlZ0V4cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tYWtlUmVnRXhwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGtEQUF5QjtBQUVsQixNQUFNLFVBQVUsR0FBRyxDQUN4QixRQUFnQixFQUNoQixJQUFZLEVBQ1osWUFBb0IsRUFDcEIsYUFBc0IsRUFDZCxFQUFFO0lBQ1YsSUFBSSxDQUFDLFFBQVEsRUFBRTtRQUNiLE9BQU8sWUFBWSxDQUFBO0tBQ3BCO1NBQU07UUFDTCxJQUFJO1lBQ0YsT0FBTyxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1NBQ3REO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsZUFBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDOzhCQUNwQixJQUFJOztpQ0FFRCxJQUFJLENBQUMsU0FBUyxDQUMzQyxRQUFRLENBQ1Q7Q0FDRixDQUFDLENBQUE7WUFFSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2YsT0FBTyxhQUFhLENBQUE7U0FDckI7S0FDRjtBQUNILENBQUMsQ0FBQTtBQXhCWSxRQUFBLFVBQVUsY0F3QnRCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gXCJjaGFsa1wiXHJcblxyXG5leHBvcnQgY29uc3QgbWFrZVJlZ0V4cCA9IChcclxuICByZVN0cmluZzogc3RyaW5nLFxyXG4gIG5hbWU6IHN0cmluZyxcclxuICBkZWZhdWx0VmFsdWU6IFJlZ0V4cCxcclxuICBjYXNlU2Vuc2l0aXZlOiBib29sZWFuLFxyXG4pOiBSZWdFeHAgPT4ge1xyXG4gIGlmICghcmVTdHJpbmcpIHtcclxuICAgIHJldHVybiBkZWZhdWx0VmFsdWVcclxuICB9IGVsc2Uge1xyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIG5ldyBSZWdFeHAocmVTdHJpbmcsIGNhc2VTZW5zaXRpdmUgPyBcIlwiIDogXCJpXCIpXHJcbiAgICB9IGNhdGNoIChfKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGAke2NoYWxrLnJlZC5ib2xkKFwiKioqRVJST1IqKipcIil9XHJcbkludmFsaWQgZm9ybWF0IGZvciBvcHRpb24gLS0ke25hbWV9XHJcblxyXG4gIFVuYWJsZSB0byBjb252ZXJ0IHRoZSBzdHJpbmcgJHtKU09OLnN0cmluZ2lmeShcclxuICAgIHJlU3RyaW5nLFxyXG4gICl9IHRvIGEgcmVndWxhciBleHByZXNzaW9uLlxyXG5gKVxyXG5cclxuICAgICAgcHJvY2Vzcy5leGl0KDEpXHJcbiAgICAgIHJldHVybiAvdW5yZWFjaGFibGUvXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==
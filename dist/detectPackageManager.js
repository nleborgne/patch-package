"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPackageManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = require("./path");
const chalk_1 = __importDefault(require("chalk"));
const process_1 = __importDefault(require("process"));
const find_yarn_workspace_root_1 = __importDefault(require("find-yarn-workspace-root"));
function printNoYarnLockfileError() {
    console.log(`
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`The --use-yarn option was specified but there is no yarn.lock file`)}
`);
}
function printNoLockfilesError() {
    console.log(`
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`No package-lock.json, npm-shrinkwrap.json, or yarn.lock file.

You must use either npm@>=5, yarn, or npm-shrinkwrap to manage this project's
dependencies.`)}
`);
}
function printSelectingDefaultMessage() {
    console.info(`${chalk_1.default.bold("patch-package")}: you have both yarn.lock and package-lock.json
Defaulting to using ${chalk_1.default.bold("npm")}
You can override this setting by passing --use-yarn or deleting
package-lock.json if you don't need it
`);
}
const detectPackageManager = (appRootPath, overridePackageManager) => {
    const packageLockExists = fs_extra_1.default.existsSync(path_1.join(appRootPath, "package-lock.json"));
    const shrinkWrapExists = fs_extra_1.default.existsSync(path_1.join(appRootPath, "npm-shrinkwrap.json"));
    const yarnLockExists = fs_extra_1.default.existsSync(path_1.join(appRootPath, "yarn.lock"));
    if ((packageLockExists || shrinkWrapExists) && yarnLockExists) {
        if (overridePackageManager) {
            return overridePackageManager;
        }
        else {
            printSelectingDefaultMessage();
            return shrinkWrapExists ? "npm-shrinkwrap" : "npm";
        }
    }
    else if (packageLockExists || shrinkWrapExists) {
        if (overridePackageManager === "yarn") {
            printNoYarnLockfileError();
            process_1.default.exit(1);
        }
        else {
            return shrinkWrapExists ? "npm-shrinkwrap" : "npm";
        }
    }
    else if (yarnLockExists || find_yarn_workspace_root_1.default()) {
        return "yarn";
    }
    else {
        printNoLockfilesError();
        process_1.default.exit(1);
    }
    throw Error();
};
exports.detectPackageManager = detectPackageManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0ZWN0UGFja2FnZU1hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZGV0ZWN0UGFja2FnZU1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0RBQXlCO0FBQ3pCLGlDQUE2QjtBQUM3QixrREFBeUI7QUFDekIsc0RBQTZCO0FBQzdCLHdGQUF3RDtBQUl4RCxTQUFTLHdCQUF3QjtJQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDO0VBQ1osZUFBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksZUFBSyxDQUFDLEdBQUcsQ0FDdEMsb0VBQW9FLENBQ3JFO0NBQ0YsQ0FBQyxDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMscUJBQXFCO0lBQzVCLE9BQU8sQ0FBQyxHQUFHLENBQUM7RUFDWixlQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxlQUFLLENBQUMsR0FBRyxDQUN0Qzs7O2NBR1UsQ0FDWDtDQUNGLENBQUMsQ0FBQTtBQUNGLENBQUM7QUFFRCxTQUFTLDRCQUE0QjtJQUNuQyxPQUFPLENBQUMsSUFBSSxDQUNWLEdBQUcsZUFBSyxDQUFDLElBQUksQ0FDWCxlQUFlLENBQ2hCO3NCQUNpQixlQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzs7O0NBR3RDLENBQ0UsQ0FBQTtBQUNILENBQUM7QUFFTSxNQUFNLG9CQUFvQixHQUFHLENBQ2xDLFdBQW1CLEVBQ25CLHNCQUE2QyxFQUM3QixFQUFFO0lBQ2xCLE1BQU0saUJBQWlCLEdBQUcsa0JBQUUsQ0FBQyxVQUFVLENBQ3JDLFdBQUksQ0FBQyxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FDdkMsQ0FBQTtJQUNELE1BQU0sZ0JBQWdCLEdBQUcsa0JBQUUsQ0FBQyxVQUFVLENBQ3BDLFdBQUksQ0FBQyxXQUFXLEVBQUUscUJBQXFCLENBQUMsQ0FDekMsQ0FBQTtJQUNELE1BQU0sY0FBYyxHQUFHLGtCQUFFLENBQUMsVUFBVSxDQUFDLFdBQUksQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUNwRSxJQUFJLENBQUMsaUJBQWlCLElBQUksZ0JBQWdCLENBQUMsSUFBSSxjQUFjLEVBQUU7UUFDN0QsSUFBSSxzQkFBc0IsRUFBRTtZQUMxQixPQUFPLHNCQUFzQixDQUFBO1NBQzlCO2FBQU07WUFDTCw0QkFBNEIsRUFBRSxDQUFBO1lBQzlCLE9BQU8sZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUE7U0FDbkQ7S0FDRjtTQUFNLElBQUksaUJBQWlCLElBQUksZ0JBQWdCLEVBQUU7UUFDaEQsSUFBSSxzQkFBc0IsS0FBSyxNQUFNLEVBQUU7WUFDckMsd0JBQXdCLEVBQUUsQ0FBQTtZQUMxQixpQkFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUNoQjthQUFNO1lBQ0wsT0FBTyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtTQUNuRDtLQUNGO1NBQU0sSUFBSSxjQUFjLElBQUksa0NBQWlCLEVBQUUsRUFBRTtRQUNoRCxPQUFPLE1BQU0sQ0FBQTtLQUNkO1NBQU07UUFDTCxxQkFBcUIsRUFBRSxDQUFBO1FBQ3ZCLGlCQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ2hCO0lBQ0QsTUFBTSxLQUFLLEVBQUUsQ0FBQTtBQUNmLENBQUMsQ0FBQTtBQWhDWSxRQUFBLG9CQUFvQix3QkFnQ2hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGZzIGZyb20gXCJmcy1leHRyYVwiXHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwiLi9wYXRoXCJcclxuaW1wb3J0IGNoYWxrIGZyb20gXCJjaGFsa1wiXHJcbmltcG9ydCBwcm9jZXNzIGZyb20gXCJwcm9jZXNzXCJcclxuaW1wb3J0IGZpbmRXb3Jrc3BhY2VSb290IGZyb20gXCJmaW5kLXlhcm4td29ya3NwYWNlLXJvb3RcIlxyXG5cclxuZXhwb3J0IHR5cGUgUGFja2FnZU1hbmFnZXIgPSBcInlhcm5cIiB8IFwibnBtXCIgfCBcIm5wbS1zaHJpbmt3cmFwXCJcclxuXHJcbmZ1bmN0aW9uIHByaW50Tm9ZYXJuTG9ja2ZpbGVFcnJvcigpIHtcclxuICBjb25zb2xlLmxvZyhgXHJcbiR7Y2hhbGsucmVkLmJvbGQoXCIqKkVSUk9SKipcIil9ICR7Y2hhbGsucmVkKFxyXG4gICAgYFRoZSAtLXVzZS15YXJuIG9wdGlvbiB3YXMgc3BlY2lmaWVkIGJ1dCB0aGVyZSBpcyBubyB5YXJuLmxvY2sgZmlsZWAsXHJcbiAgKX1cclxuYClcclxufVxyXG5cclxuZnVuY3Rpb24gcHJpbnROb0xvY2tmaWxlc0Vycm9yKCkge1xyXG4gIGNvbnNvbGUubG9nKGBcclxuJHtjaGFsay5yZWQuYm9sZChcIioqRVJST1IqKlwiKX0gJHtjaGFsay5yZWQoXHJcbiAgICBgTm8gcGFja2FnZS1sb2NrLmpzb24sIG5wbS1zaHJpbmt3cmFwLmpzb24sIG9yIHlhcm4ubG9jayBmaWxlLlxyXG5cclxuWW91IG11c3QgdXNlIGVpdGhlciBucG1APj01LCB5YXJuLCBvciBucG0tc2hyaW5rd3JhcCB0byBtYW5hZ2UgdGhpcyBwcm9qZWN0J3NcclxuZGVwZW5kZW5jaWVzLmAsXHJcbiAgKX1cclxuYClcclxufVxyXG5cclxuZnVuY3Rpb24gcHJpbnRTZWxlY3RpbmdEZWZhdWx0TWVzc2FnZSgpIHtcclxuICBjb25zb2xlLmluZm8oXHJcbiAgICBgJHtjaGFsay5ib2xkKFxyXG4gICAgICBcInBhdGNoLXBhY2thZ2VcIixcclxuICAgICl9OiB5b3UgaGF2ZSBib3RoIHlhcm4ubG9jayBhbmQgcGFja2FnZS1sb2NrLmpzb25cclxuRGVmYXVsdGluZyB0byB1c2luZyAke2NoYWxrLmJvbGQoXCJucG1cIil9XHJcbllvdSBjYW4gb3ZlcnJpZGUgdGhpcyBzZXR0aW5nIGJ5IHBhc3NpbmcgLS11c2UteWFybiBvciBkZWxldGluZ1xyXG5wYWNrYWdlLWxvY2suanNvbiBpZiB5b3UgZG9uJ3QgbmVlZCBpdFxyXG5gLFxyXG4gIClcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGRldGVjdFBhY2thZ2VNYW5hZ2VyID0gKFxyXG4gIGFwcFJvb3RQYXRoOiBzdHJpbmcsXHJcbiAgb3ZlcnJpZGVQYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXIgfCBudWxsLFxyXG4pOiBQYWNrYWdlTWFuYWdlciA9PiB7XHJcbiAgY29uc3QgcGFja2FnZUxvY2tFeGlzdHMgPSBmcy5leGlzdHNTeW5jKFxyXG4gICAgam9pbihhcHBSb290UGF0aCwgXCJwYWNrYWdlLWxvY2suanNvblwiKSxcclxuICApXHJcbiAgY29uc3Qgc2hyaW5rV3JhcEV4aXN0cyA9IGZzLmV4aXN0c1N5bmMoXHJcbiAgICBqb2luKGFwcFJvb3RQYXRoLCBcIm5wbS1zaHJpbmt3cmFwLmpzb25cIiksXHJcbiAgKVxyXG4gIGNvbnN0IHlhcm5Mb2NrRXhpc3RzID0gZnMuZXhpc3RzU3luYyhqb2luKGFwcFJvb3RQYXRoLCBcInlhcm4ubG9ja1wiKSlcclxuICBpZiAoKHBhY2thZ2VMb2NrRXhpc3RzIHx8IHNocmlua1dyYXBFeGlzdHMpICYmIHlhcm5Mb2NrRXhpc3RzKSB7XHJcbiAgICBpZiAob3ZlcnJpZGVQYWNrYWdlTWFuYWdlcikge1xyXG4gICAgICByZXR1cm4gb3ZlcnJpZGVQYWNrYWdlTWFuYWdlclxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcHJpbnRTZWxlY3RpbmdEZWZhdWx0TWVzc2FnZSgpXHJcbiAgICAgIHJldHVybiBzaHJpbmtXcmFwRXhpc3RzID8gXCJucG0tc2hyaW5rd3JhcFwiIDogXCJucG1cIlxyXG4gICAgfVxyXG4gIH0gZWxzZSBpZiAocGFja2FnZUxvY2tFeGlzdHMgfHwgc2hyaW5rV3JhcEV4aXN0cykge1xyXG4gICAgaWYgKG92ZXJyaWRlUGFja2FnZU1hbmFnZXIgPT09IFwieWFyblwiKSB7XHJcbiAgICAgIHByaW50Tm9ZYXJuTG9ja2ZpbGVFcnJvcigpXHJcbiAgICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIHNocmlua1dyYXBFeGlzdHMgPyBcIm5wbS1zaHJpbmt3cmFwXCIgOiBcIm5wbVwiXHJcbiAgICB9XHJcbiAgfSBlbHNlIGlmICh5YXJuTG9ja0V4aXN0cyB8fCBmaW5kV29ya3NwYWNlUm9vdCgpKSB7XHJcbiAgICByZXR1cm4gXCJ5YXJuXCJcclxuICB9IGVsc2Uge1xyXG4gICAgcHJpbnROb0xvY2tmaWxlc0Vycm9yKClcclxuICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gIH1cclxuICB0aHJvdyBFcnJvcigpXHJcbn1cclxuIl19
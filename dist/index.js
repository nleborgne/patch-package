"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const process_1 = __importDefault(require("process"));
const minimist_1 = __importDefault(require("minimist"));
const applyPatches_1 = require("./applyPatches");
const getAppRootPath_1 = require("./getAppRootPath");
const makePatch_1 = require("./makePatch");
const makeRegExp_1 = require("./makeRegExp");
const detectPackageManager_1 = require("./detectPackageManager");
const path_1 = require("./path");
const path_2 = require("path");
const slash = require("slash");
const ci_info_1 = require("ci-info");
const rebase_1 = require("./rebase");
const appPath = getAppRootPath_1.getAppRootPath();
const argv = minimist_1.default(process_1.default.argv.slice(2), {
    boolean: [
        "use-yarn",
        "case-sensitive-path-filtering",
        "reverse",
        "help",
        "version",
        "error-on-fail",
        "error-on-warn",
        "create-issue",
        "partial",
        "",
    ],
    string: ["patch-dir", "append", "rebase"],
});
const packageNames = argv._;
console.log(chalk_1.default.bold("patch-package"), 
// tslint:disable-next-line:no-var-requires
require(path_1.join(__dirname, "../package.json")).version);
if (argv.version || argv.v) {
    // noop
}
else if (argv.help || argv.h) {
    printHelp();
}
else {
    const patchDir = slash(path_2.normalize((argv["patch-dir"] || "patches") + path_2.sep));
    if (patchDir.startsWith("/")) {
        throw new Error("--patch-dir must be a relative path");
    }
    if ("rebase" in argv) {
        if (!argv.rebase) {
            console.log(chalk_1.default.red("You must specify a patch file name or number when rebasing patches"));
            process_1.default.exit(1);
        }
        if (packageNames.length !== 1) {
            console.log(chalk_1.default.red("You must specify exactly one package name when rebasing patches"));
            process_1.default.exit(1);
        }
        rebase_1.rebase({
            appPath,
            packagePathSpecifier: packageNames[0],
            patchDir,
            targetPatch: argv.rebase,
        });
    }
    else if (packageNames.length) {
        const includePaths = makeRegExp_1.makeRegExp(argv.include, "include", /.*/, argv["case-sensitive-path-filtering"]);
        const excludePaths = makeRegExp_1.makeRegExp(argv.exclude, "exclude", /^package\.json$/, argv["case-sensitive-path-filtering"]);
        const packageManager = detectPackageManager_1.detectPackageManager(appPath, argv["use-yarn"] ? "yarn" : null);
        const createIssue = argv["create-issue"];
        packageNames.forEach((packagePathSpecifier) => {
            makePatch_1.makePatch({
                packagePathSpecifier,
                appPath,
                packageManager,
                includePaths,
                excludePaths,
                patchDir,
                createIssue,
                mode: "append" in argv
                    ? { type: "append", name: argv.append || undefined }
                    : { type: "overwrite_last" },
            });
        });
    }
    else {
        console.log("Applying patches...");
        const reverse = !!argv["reverse"];
        // don't want to exit(1) on postinstall locally.
        // see https://github.com/ds300/patch-package/issues/86
        const shouldExitWithError = !!argv["error-on-fail"] ||
            (process_1.default.env.NODE_ENV === "production" && ci_info_1.isCI) ||
            (ci_info_1.isCI && !process_1.default.env.PATCH_PACKAGE_INTEGRATION_TEST) ||
            process_1.default.env.NODE_ENV === "test";
        const shouldExitWithWarning = !!argv["error-on-warn"];
        applyPatches_1.applyPatchesForApp({
            appPath,
            reverse,
            patchDir,
            shouldExitWithError,
            shouldExitWithWarning,
            bestEffort: argv.partial,
        });
    }
}
function printHelp() {
    console.log(`
Usage:

  1. Patching packages
  ====================

    ${chalk_1.default.bold("patch-package")}

  Without arguments, the ${chalk_1.default.bold("patch-package")} command will attempt to find and apply
  patch files to your project. It looks for files named like

     ./patches/<package-name>+<version>.patch

  Options:

    ${chalk_1.default.bold("--patch-dir <dirname>")}

      Specify the name for the directory in which the patch files are located.
      
    ${chalk_1.default.bold("--error-on-fail")}
    
      Forces patch-package to exit with code 1 after failing.
    
      When running locally patch-package always exits with 0 by default.
      This happens even after failing to apply patches because otherwise 
      yarn.lock and package.json might get out of sync with node_modules,
      which can be very confusing.
      
      --error-on-fail is ${chalk_1.default.bold("switched on")} by default on CI.
      
      See https://github.com/ds300/patch-package/issues/86 for background.
      
    ${chalk_1.default.bold("--error-on-warn")}
    
      Forces patch-package to exit with code 1 after warning.
      
      See https://github.com/ds300/patch-package/issues/314 for background.

    ${chalk_1.default.bold("--reverse")}
        
      Un-applies all patches.

      Note that this will fail if the patched files have changed since being
      patched. In that case, you'll probably need to re-install 'node_modules'.

      This option was added to help people using CircleCI avoid an issue around caching
      and patch file updates (https://github.com/ds300/patch-package/issues/37),
      but might be useful in other contexts too.
      

  2. Creating patch files
  =======================

    ${chalk_1.default.bold("patch-package")} <package-name>${chalk_1.default.italic("[ <package-name>]")}

  When given package names as arguments, patch-package will create patch files
  based on any changes you've made to the versions installed by yarn/npm.

  Options:
  
    ${chalk_1.default.bold("--create-issue")}
    
       For packages whose source is hosted on GitHub this option opens a web
       browser with a draft issue based on your diff.

    ${chalk_1.default.bold("--use-yarn")}

        By default, patch-package checks whether you use npm or yarn based on
        which lockfile you have. If you have both, it uses npm by default.
        Set this option to override that default and always use yarn.

    ${chalk_1.default.bold("--exclude <regexp>")}

        Ignore paths matching the regexp when creating patch files.
        Paths are relative to the root dir of the package to be patched.

        Default: 'package\\.json$'

    ${chalk_1.default.bold("--include <regexp>")}

        Only consider paths matching the regexp when creating patch files.
        Paths are relative to the root dir of the package to be patched.

        Default '.*'

    ${chalk_1.default.bold("--case-sensitive-path-filtering")}

        Make regexps used in --include or --exclude filters case-sensitive.
    
    ${chalk_1.default.bold("--patch-dir")}

        Specify the name for the directory in which to put the patch files.
`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxrREFBeUI7QUFDekIsc0RBQTZCO0FBQzdCLHdEQUErQjtBQUUvQixpREFBbUQ7QUFDbkQscURBQWlEO0FBQ2pELDJDQUF1QztBQUN2Qyw2Q0FBeUM7QUFDekMsaUVBQTZEO0FBQzdELGlDQUE2QjtBQUM3QiwrQkFBcUM7QUFDckMsK0JBQStCO0FBQy9CLHFDQUE4QjtBQUM5QixxQ0FBaUM7QUFFakMsTUFBTSxPQUFPLEdBQUcsK0JBQWMsRUFBRSxDQUFBO0FBQ2hDLE1BQU0sSUFBSSxHQUFHLGtCQUFRLENBQUMsaUJBQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO0lBQzNDLE9BQU8sRUFBRTtRQUNQLFVBQVU7UUFDViwrQkFBK0I7UUFDL0IsU0FBUztRQUNULE1BQU07UUFDTixTQUFTO1FBQ1QsZUFBZTtRQUNmLGVBQWU7UUFDZixjQUFjO1FBQ2QsU0FBUztRQUNULEVBQUU7S0FDSDtJQUNELE1BQU0sRUFBRSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsUUFBUSxDQUFDO0NBQzFDLENBQUMsQ0FBQTtBQUNGLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUE7QUFFM0IsT0FBTyxDQUFDLEdBQUcsQ0FDVCxlQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQztBQUMzQiwyQ0FBMkM7QUFDM0MsT0FBTyxDQUFDLFdBQUksQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FDcEQsQ0FBQTtBQUVELElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQzFCLE9BQU87Q0FDUjtLQUFNLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFO0lBQzlCLFNBQVMsRUFBRSxDQUFBO0NB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YWxrXCJcclxuaW1wb3J0IHByb2Nlc3MgZnJvbSBcInByb2Nlc3NcIlxyXG5pbXBvcnQgbWluaW1pc3QgZnJvbSBcIm1pbmltaXN0XCJcclxuXHJcbmltcG9ydCB7IGFwcGx5UGF0Y2hlc0ZvckFwcCB9IGZyb20gXCIuL2FwcGx5UGF0Y2hlc1wiXHJcbmltcG9ydCB7IGdldEFwcFJvb3RQYXRoIH0gZnJvbSBcIi4vZ2V0QXBwUm9vdFBhdGhcIlxyXG5pbXBvcnQgeyBtYWtlUGF0Y2ggfSBmcm9tIFwiLi9tYWtlUGF0Y2hcIlxyXG5pbXBvcnQgeyBtYWtlUmVnRXhwIH0gZnJvbSBcIi4vbWFrZVJlZ0V4cFwiXHJcbmltcG9ydCB7IGRldGVjdFBhY2thZ2VNYW5hZ2VyIH0gZnJvbSBcIi4vZGV0ZWN0UGFja2FnZU1hbmFnZXJcIlxyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIi4vcGF0aFwiXHJcbmltcG9ydCB7IG5vcm1hbGl6ZSwgc2VwIH0gZnJvbSBcInBhdGhcIlxyXG5pbXBvcnQgc2xhc2ggPSByZXF1aXJlKFwic2xhc2hcIilcclxuaW1wb3J0IHsgaXNDSSB9IGZyb20gXCJjaS1pbmZvXCJcclxuaW1wb3J0IHsgcmViYXNlIH0gZnJvbSBcIi4vcmViYXNlXCJcclxuXHJcbmNvbnN0IGFwcFBhdGggPSBnZXRBcHBSb290UGF0aCgpXHJcbmNvbnN0IGFyZ3YgPSBtaW5pbWlzdChwcm9jZXNzLmFyZ3Yuc2xpY2UoMiksIHtcclxuICBib29sZWFuOiBbXHJcbiAgICBcInVzZS15YXJuXCIsXHJcbiAgICBcImNhc2Utc2Vuc2l0aXZlLXBhdGgtZmlsdGVyaW5nXCIsXHJcbiAgICBcInJldmVyc2VcIixcclxuICAgIFwiaGVscFwiLFxyXG4gICAgXCJ2ZXJzaW9uXCIsXHJcbiAgICBcImVycm9yLW9uLWZhaWxcIixcclxuICAgIFwiZXJyb3Itb24td2FyblwiLFxyXG4gICAgXCJjcmVhdGUtaXNzdWVcIixcclxuICAgIFwicGFydGlhbFwiLFxyXG4gICAgXCJcIixcclxuICBdLFxyXG4gIHN0cmluZzogW1wicGF0Y2gtZGlyXCIsIFwiYXBwZW5kXCIsIFwicmViYXNlXCJdLFxyXG59KVxyXG5jb25zdCBwYWNrYWdlTmFtZXMgPSBhcmd2Ll9cclxuXHJcbmNvbnNvbGUubG9nKFxyXG4gIGNoYWxrLmJvbGQoXCJwYXRjaC1wYWNrYWdlXCIpLFxyXG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby12YXItcmVxdWlyZXNcclxuICByZXF1aXJlKGpvaW4oX19kaXJuYW1lLCBcIi4uL3BhY2thZ2UuanNvblwiKSkudmVyc2lvbixcclxuKVxyXG5cclxuaWYgKGFyZ3YudmVyc2lvbiB8fCBhcmd2LnYpIHtcclxuICAvLyBub29wXHJcbn0gZWxzZSBpZiAoYXJndi5oZWxwIHx8IGFyZ3YuaCkge1xyXG4gIHByaW50SGVscCgpXHJcbn0gZWxzZSB7XHJcbiAgY29uc3QgcGF0Y2hEaXIgPSBzbGFzaChub3JtYWxpemUoKGFyZ3ZbXCJwYXRjaC1kaXJcIl0gfHwgXCJwYXRjaGVzXCIpICsgc2VwKSlcclxuICBpZiAocGF0Y2hEaXIuc3RhcnRzV2l0aChcIi9cIikpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIi0tcGF0Y2gtZGlyIG11c3QgYmUgYSByZWxhdGl2ZSBwYXRoXCIpXHJcbiAgfVxyXG4gIGlmIChcInJlYmFzZVwiIGluIGFyZ3YpIHtcclxuICAgIGlmICghYXJndi5yZWJhc2UpIHtcclxuICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgY2hhbGsucmVkKFxyXG4gICAgICAgICAgXCJZb3UgbXVzdCBzcGVjaWZ5IGEgcGF0Y2ggZmlsZSBuYW1lIG9yIG51bWJlciB3aGVuIHJlYmFzaW5nIHBhdGNoZXNcIixcclxuICAgICAgICApLFxyXG4gICAgICApXHJcbiAgICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gICAgfVxyXG4gICAgaWYgKHBhY2thZ2VOYW1lcy5sZW5ndGggIT09IDEpIHtcclxuICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgY2hhbGsucmVkKFxyXG4gICAgICAgICAgXCJZb3UgbXVzdCBzcGVjaWZ5IGV4YWN0bHkgb25lIHBhY2thZ2UgbmFtZSB3aGVuIHJlYmFzaW5nIHBhdGNoZXNcIixcclxuICAgICAgICApLFxyXG4gICAgICApXHJcbiAgICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gICAgfVxyXG4gICAgcmViYXNlKHtcclxuICAgICAgYXBwUGF0aCxcclxuICAgICAgcGFja2FnZVBhdGhTcGVjaWZpZXI6IHBhY2thZ2VOYW1lc1swXSxcclxuICAgICAgcGF0Y2hEaXIsXHJcbiAgICAgIHRhcmdldFBhdGNoOiBhcmd2LnJlYmFzZSxcclxuICAgIH0pXHJcbiAgfSBlbHNlIGlmIChwYWNrYWdlTmFtZXMubGVuZ3RoKSB7XHJcbiAgICBjb25zdCBpbmNsdWRlUGF0aHMgPSBtYWtlUmVnRXhwKFxyXG4gICAgICBhcmd2LmluY2x1ZGUsXHJcbiAgICAgIFwiaW5jbHVkZVwiLFxyXG4gICAgICAvLiovLFxyXG4gICAgICBhcmd2W1wiY2FzZS1zZW5zaXRpdmUtcGF0aC1maWx0ZXJpbmdcIl0sXHJcbiAgICApXHJcbiAgICBjb25zdCBleGNsdWRlUGF0aHMgPSBtYWtlUmVnRXhwKFxyXG4gICAgICBhcmd2LmV4Y2x1ZGUsXHJcbiAgICAgIFwiZXhjbHVkZVwiLFxyXG4gICAgICAvXnBhY2thZ2VcXC5qc29uJC8sXHJcbiAgICAgIGFyZ3ZbXCJjYXNlLXNlbnNpdGl2ZS1wYXRoLWZpbHRlcmluZ1wiXSxcclxuICAgIClcclxuICAgIGNvbnN0IHBhY2thZ2VNYW5hZ2VyID0gZGV0ZWN0UGFja2FnZU1hbmFnZXIoXHJcbiAgICAgIGFwcFBhdGgsXHJcbiAgICAgIGFyZ3ZbXCJ1c2UteWFyblwiXSA/IFwieWFyblwiIDogbnVsbCxcclxuICAgIClcclxuICAgIGNvbnN0IGNyZWF0ZUlzc3VlID0gYXJndltcImNyZWF0ZS1pc3N1ZVwiXVxyXG4gICAgcGFja2FnZU5hbWVzLmZvckVhY2goKHBhY2thZ2VQYXRoU3BlY2lmaWVyOiBzdHJpbmcpID0+IHtcclxuICAgICAgbWFrZVBhdGNoKHtcclxuICAgICAgICBwYWNrYWdlUGF0aFNwZWNpZmllcixcclxuICAgICAgICBhcHBQYXRoLFxyXG4gICAgICAgIHBhY2thZ2VNYW5hZ2VyLFxyXG4gICAgICAgIGluY2x1ZGVQYXRocyxcclxuICAgICAgICBleGNsdWRlUGF0aHMsXHJcbiAgICAgICAgcGF0Y2hEaXIsXHJcbiAgICAgICAgY3JlYXRlSXNzdWUsXHJcbiAgICAgICAgbW9kZTpcclxuICAgICAgICAgIFwiYXBwZW5kXCIgaW4gYXJndlxyXG4gICAgICAgICAgICA/IHsgdHlwZTogXCJhcHBlbmRcIiwgbmFtZTogYXJndi5hcHBlbmQgfHwgdW5kZWZpbmVkIH1cclxuICAgICAgICAgICAgOiB7IHR5cGU6IFwib3ZlcndyaXRlX2xhc3RcIiB9LFxyXG4gICAgICB9KVxyXG4gICAgfSlcclxuICB9IGVsc2Uge1xyXG4gICAgY29uc29sZS5sb2coXCJBcHBseWluZyBwYXRjaGVzLi4uXCIpXHJcbiAgICBjb25zdCByZXZlcnNlID0gISFhcmd2W1wicmV2ZXJzZVwiXVxyXG4gICAgLy8gZG9uJ3Qgd2FudCB0byBleGl0KDEpIG9uIHBvc3RpbnN0YWxsIGxvY2FsbHkuXHJcbiAgICAvLyBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzLzg2XHJcbiAgICBjb25zdCBzaG91bGRFeGl0V2l0aEVycm9yID1cclxuICAgICAgISFhcmd2W1wiZXJyb3Itb24tZmFpbFwiXSB8fFxyXG4gICAgICAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09IFwicHJvZHVjdGlvblwiICYmIGlzQ0kpIHx8XHJcbiAgICAgIChpc0NJICYmICFwcm9jZXNzLmVudi5QQVRDSF9QQUNLQUdFX0lOVEVHUkFUSU9OX1RFU1QpIHx8XHJcbiAgICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSBcInRlc3RcIlxyXG5cclxuICAgIGNvbnN0IHNob3VsZEV4aXRXaXRoV2FybmluZyA9ICEhYXJndltcImVycm9yLW9uLXdhcm5cIl1cclxuXHJcbiAgICBhcHBseVBhdGNoZXNGb3JBcHAoe1xyXG4gICAgICBhcHBQYXRoLFxyXG4gICAgICByZXZlcnNlLFxyXG4gICAgICBwYXRjaERpcixcclxuICAgICAgc2hvdWxkRXhpdFdpdGhFcnJvcixcclxuICAgICAgc2hvdWxkRXhpdFdpdGhXYXJuaW5nLFxyXG4gICAgICBiZXN0RWZmb3J0OiBhcmd2LnBhcnRpYWwsXHJcbiAgICB9KVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcHJpbnRIZWxwKCkge1xyXG4gIGNvbnNvbGUubG9nKGBcclxuVXNhZ2U6XHJcblxyXG4gIDEuIFBhdGNoaW5nIHBhY2thZ2VzXHJcbiAgPT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgICAke2NoYWxrLmJvbGQoXCJwYXRjaC1wYWNrYWdlXCIpfVxyXG5cclxuICBXaXRob3V0IGFyZ3VtZW50cywgdGhlICR7Y2hhbGsuYm9sZChcclxuICAgIFwicGF0Y2gtcGFja2FnZVwiLFxyXG4gICl9IGNvbW1hbmQgd2lsbCBhdHRlbXB0IHRvIGZpbmQgYW5kIGFwcGx5XHJcbiAgcGF0Y2ggZmlsZXMgdG8geW91ciBwcm9qZWN0LiBJdCBsb29rcyBmb3IgZmlsZXMgbmFtZWQgbGlrZVxyXG5cclxuICAgICAuL3BhdGNoZXMvPHBhY2thZ2UtbmFtZT4rPHZlcnNpb24+LnBhdGNoXHJcblxyXG4gIE9wdGlvbnM6XHJcblxyXG4gICAgJHtjaGFsay5ib2xkKFwiLS1wYXRjaC1kaXIgPGRpcm5hbWU+XCIpfVxyXG5cclxuICAgICAgU3BlY2lmeSB0aGUgbmFtZSBmb3IgdGhlIGRpcmVjdG9yeSBpbiB3aGljaCB0aGUgcGF0Y2ggZmlsZXMgYXJlIGxvY2F0ZWQuXHJcbiAgICAgIFxyXG4gICAgJHtjaGFsay5ib2xkKFwiLS1lcnJvci1vbi1mYWlsXCIpfVxyXG4gICAgXHJcbiAgICAgIEZvcmNlcyBwYXRjaC1wYWNrYWdlIHRvIGV4aXQgd2l0aCBjb2RlIDEgYWZ0ZXIgZmFpbGluZy5cclxuICAgIFxyXG4gICAgICBXaGVuIHJ1bm5pbmcgbG9jYWxseSBwYXRjaC1wYWNrYWdlIGFsd2F5cyBleGl0cyB3aXRoIDAgYnkgZGVmYXVsdC5cclxuICAgICAgVGhpcyBoYXBwZW5zIGV2ZW4gYWZ0ZXIgZmFpbGluZyB0byBhcHBseSBwYXRjaGVzIGJlY2F1c2Ugb3RoZXJ3aXNlIFxyXG4gICAgICB5YXJuLmxvY2sgYW5kIHBhY2thZ2UuanNvbiBtaWdodCBnZXQgb3V0IG9mIHN5bmMgd2l0aCBub2RlX21vZHVsZXMsXHJcbiAgICAgIHdoaWNoIGNhbiBiZSB2ZXJ5IGNvbmZ1c2luZy5cclxuICAgICAgXHJcbiAgICAgIC0tZXJyb3Itb24tZmFpbCBpcyAke2NoYWxrLmJvbGQoXCJzd2l0Y2hlZCBvblwiKX0gYnkgZGVmYXVsdCBvbiBDSS5cclxuICAgICAgXHJcbiAgICAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZHMzMDAvcGF0Y2gtcGFja2FnZS9pc3N1ZXMvODYgZm9yIGJhY2tncm91bmQuXHJcbiAgICAgIFxyXG4gICAgJHtjaGFsay5ib2xkKFwiLS1lcnJvci1vbi13YXJuXCIpfVxyXG4gICAgXHJcbiAgICAgIEZvcmNlcyBwYXRjaC1wYWNrYWdlIHRvIGV4aXQgd2l0aCBjb2RlIDEgYWZ0ZXIgd2FybmluZy5cclxuICAgICAgXHJcbiAgICAgIFNlZSBodHRwczovL2dpdGh1Yi5jb20vZHMzMDAvcGF0Y2gtcGFja2FnZS9pc3N1ZXMvMzE0IGZvciBiYWNrZ3JvdW5kLlxyXG5cclxuICAgICR7Y2hhbGsuYm9sZChcIi0tcmV2ZXJzZVwiKX1cclxuICAgICAgICBcclxuICAgICAgVW4tYXBwbGllcyBhbGwgcGF0Y2hlcy5cclxuXHJcbiAgICAgIE5vdGUgdGhhdCB0aGlzIHdpbGwgZmFpbCBpZiB0aGUgcGF0Y2hlZCBmaWxlcyBoYXZlIGNoYW5nZWQgc2luY2UgYmVpbmdcclxuICAgICAgcGF0Y2hlZC4gSW4gdGhhdCBjYXNlLCB5b3UnbGwgcHJvYmFibHkgbmVlZCB0byByZS1pbnN0YWxsICdub2RlX21vZHVsZXMnLlxyXG5cclxuICAgICAgVGhpcyBvcHRpb24gd2FzIGFkZGVkIHRvIGhlbHAgcGVvcGxlIHVzaW5nIENpcmNsZUNJIGF2b2lkIGFuIGlzc3VlIGFyb3VuZCBjYWNoaW5nXHJcbiAgICAgIGFuZCBwYXRjaCBmaWxlIHVwZGF0ZXMgKGh0dHBzOi8vZ2l0aHViLmNvbS9kczMwMC9wYXRjaC1wYWNrYWdlL2lzc3Vlcy8zNyksXHJcbiAgICAgIGJ1dCBtaWdodCBiZSB1c2VmdWwgaW4gb3RoZXIgY29udGV4dHMgdG9vLlxyXG4gICAgICBcclxuXHJcbiAgMi4gQ3JlYXRpbmcgcGF0Y2ggZmlsZXNcclxuICA9PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICR7Y2hhbGsuYm9sZChcInBhdGNoLXBhY2thZ2VcIil9IDxwYWNrYWdlLW5hbWU+JHtjaGFsay5pdGFsaWMoXHJcbiAgICBcIlsgPHBhY2thZ2UtbmFtZT5dXCIsXHJcbiAgKX1cclxuXHJcbiAgV2hlbiBnaXZlbiBwYWNrYWdlIG5hbWVzIGFzIGFyZ3VtZW50cywgcGF0Y2gtcGFja2FnZSB3aWxsIGNyZWF0ZSBwYXRjaCBmaWxlc1xyXG4gIGJhc2VkIG9uIGFueSBjaGFuZ2VzIHlvdSd2ZSBtYWRlIHRvIHRoZSB2ZXJzaW9ucyBpbnN0YWxsZWQgYnkgeWFybi9ucG0uXHJcblxyXG4gIE9wdGlvbnM6XHJcbiAgXHJcbiAgICAke2NoYWxrLmJvbGQoXCItLWNyZWF0ZS1pc3N1ZVwiKX1cclxuICAgIFxyXG4gICAgICAgRm9yIHBhY2thZ2VzIHdob3NlIHNvdXJjZSBpcyBob3N0ZWQgb24gR2l0SHViIHRoaXMgb3B0aW9uIG9wZW5zIGEgd2ViXHJcbiAgICAgICBicm93c2VyIHdpdGggYSBkcmFmdCBpc3N1ZSBiYXNlZCBvbiB5b3VyIGRpZmYuXHJcblxyXG4gICAgJHtjaGFsay5ib2xkKFwiLS11c2UteWFyblwiKX1cclxuXHJcbiAgICAgICAgQnkgZGVmYXVsdCwgcGF0Y2gtcGFja2FnZSBjaGVja3Mgd2hldGhlciB5b3UgdXNlIG5wbSBvciB5YXJuIGJhc2VkIG9uXHJcbiAgICAgICAgd2hpY2ggbG9ja2ZpbGUgeW91IGhhdmUuIElmIHlvdSBoYXZlIGJvdGgsIGl0IHVzZXMgbnBtIGJ5IGRlZmF1bHQuXHJcbiAgICAgICAgU2V0IHRoaXMgb3B0aW9uIHRvIG92ZXJyaWRlIHRoYXQgZGVmYXVsdCBhbmQgYWx3YXlzIHVzZSB5YXJuLlxyXG5cclxuICAgICR7Y2hhbGsuYm9sZChcIi0tZXhjbHVkZSA8cmVnZXhwPlwiKX1cclxuXHJcbiAgICAgICAgSWdub3JlIHBhdGhzIG1hdGNoaW5nIHRoZSByZWdleHAgd2hlbiBjcmVhdGluZyBwYXRjaCBmaWxlcy5cclxuICAgICAgICBQYXRocyBhcmUgcmVsYXRpdmUgdG8gdGhlIHJvb3QgZGlyIG9mIHRoZSBwYWNrYWdlIHRvIGJlIHBhdGNoZWQuXHJcblxyXG4gICAgICAgIERlZmF1bHQ6ICdwYWNrYWdlXFxcXC5qc29uJCdcclxuXHJcbiAgICAke2NoYWxrLmJvbGQoXCItLWluY2x1ZGUgPHJlZ2V4cD5cIil9XHJcblxyXG4gICAgICAgIE9ubHkgY29uc2lkZXIgcGF0aHMgbWF0Y2hpbmcgdGhlIHJlZ2V4cCB3aGVuIGNyZWF0aW5nIHBhdGNoIGZpbGVzLlxyXG4gICAgICAgIFBhdGhzIGFyZSByZWxhdGl2ZSB0byB0aGUgcm9vdCBkaXIgb2YgdGhlIHBhY2thZ2UgdG8gYmUgcGF0Y2hlZC5cclxuXHJcbiAgICAgICAgRGVmYXVsdCAnLionXHJcblxyXG4gICAgJHtjaGFsay5ib2xkKFwiLS1jYXNlLXNlbnNpdGl2ZS1wYXRoLWZpbHRlcmluZ1wiKX1cclxuXHJcbiAgICAgICAgTWFrZSByZWdleHBzIHVzZWQgaW4gLS1pbmNsdWRlIG9yIC0tZXhjbHVkZSBmaWx0ZXJzIGNhc2Utc2Vuc2l0aXZlLlxyXG4gICAgXHJcbiAgICAke2NoYWxrLmJvbGQoXCItLXBhdGNoLWRpclwiKX1cclxuXHJcbiAgICAgICAgU3BlY2lmeSB0aGUgbmFtZSBmb3IgdGhlIGRpcmVjdG9yeSBpbiB3aGljaCB0byBwdXQgdGhlIHBhdGNoIGZpbGVzLlxyXG5gKVxyXG59XHJcbiJdfQ==
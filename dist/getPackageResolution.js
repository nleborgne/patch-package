"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPackageResolution = void 0;
const path_1 = require("./path");
const PackageDetails_1 = require("./PackageDetails");
const detectPackageManager_1 = require("./detectPackageManager");
const fs_extra_1 = require("fs-extra");
const lockfile_1 = require("@yarnpkg/lockfile");
const yaml_1 = __importDefault(require("yaml"));
const find_yarn_workspace_root_1 = __importDefault(require("find-yarn-workspace-root"));
const getPackageVersion_1 = require("./getPackageVersion");
const coerceSemVer_1 = require("./coerceSemVer");
function getPackageResolution({ packageDetails, packageManager, appPath, }) {
    if (packageManager === "yarn") {
        let lockFilePath = "yarn.lock";
        if (!fs_extra_1.existsSync(lockFilePath)) {
            const workspaceRoot = find_yarn_workspace_root_1.default();
            if (!workspaceRoot) {
                throw new Error("Can't find yarn.lock file");
            }
            lockFilePath = path_1.join(workspaceRoot, "yarn.lock");
        }
        if (!fs_extra_1.existsSync(lockFilePath)) {
            throw new Error("Can't find yarn.lock file");
        }
        const lockFileString = fs_extra_1.readFileSync(lockFilePath).toString();
        let appLockFile;
        if (lockFileString.includes("yarn lockfile v1")) {
            const parsedYarnLockFile = lockfile_1.parse(lockFileString);
            if (parsedYarnLockFile.type !== "success") {
                throw new Error("Could not parse yarn v1 lock file");
            }
            else {
                appLockFile = parsedYarnLockFile.object;
            }
        }
        else {
            try {
                appLockFile = yaml_1.default.parse(lockFileString);
            }
            catch (e) {
                console.log(e);
                throw new Error("Could not parse yarn v2 lock file");
            }
        }
        const installedVersion = getPackageVersion_1.getPackageVersion(path_1.join(path_1.resolve(appPath, packageDetails.path), "package.json"));
        const entries = Object.entries(appLockFile).filter(([k, v]) => k.startsWith(packageDetails.name + "@") &&
            // @ts-ignore
            coerceSemVer_1.coerceSemVer(v.version) === coerceSemVer_1.coerceSemVer(installedVersion));
        const resolutions = entries.map(([_, v]) => {
            // @ts-ignore
            return v.resolved;
        });
        if (resolutions.length === 0) {
            throw new Error(`\`${packageDetails.pathSpecifier}\`'s installed version is ${installedVersion} but a lockfile entry for it couldn't be found. Your lockfile is likely to be corrupt or you forgot to reinstall your packages.`);
        }
        if (new Set(resolutions).size !== 1) {
            console.log(`Ambigious lockfile entries for ${packageDetails.pathSpecifier}. Using version ${installedVersion}`);
            return installedVersion;
        }
        if (resolutions[0]) {
            return resolutions[0];
        }
        const resolution = entries[0][0].slice(packageDetails.name.length + 1);
        // resolve relative file path
        if (resolution.startsWith("file:.")) {
            return `file:${path_1.resolve(appPath, resolution.slice("file:".length))}`;
        }
        if (resolution.startsWith("npm:")) {
            return resolution.replace("npm:", "");
        }
        return resolution;
    }
    else {
        const lockfile = require(path_1.join(appPath, packageManager === "npm-shrinkwrap"
            ? "npm-shrinkwrap.json"
            : "package-lock.json"));
        const lockFileStack = [lockfile];
        for (const name of packageDetails.packageNames.slice(0, -1)) {
            const child = lockFileStack[0].dependencies;
            if (child && name in child) {
                lockFileStack.push(child[name]);
            }
        }
        lockFileStack.reverse();
        const relevantStackEntry = lockFileStack.find((entry) => {
            if (entry.dependencies) {
                return entry.dependencies && packageDetails.name in entry.dependencies;
            }
            else if (entry.packages) {
                return entry.packages && packageDetails.path in entry.packages;
            }
            throw new Error("Cannot find dependencies or packages in lockfile");
        });
        const pkg = relevantStackEntry.dependencies
            ? relevantStackEntry.dependencies[packageDetails.name]
            : relevantStackEntry.packages[packageDetails.path];
        return pkg.resolved || pkg.version || pkg.from;
    }
}
exports.getPackageResolution = getPackageResolution;
if (require.main === module) {
    const packageDetails = PackageDetails_1.getPatchDetailsFromCliString(process.argv[2]);
    if (!packageDetails) {
        console.log(`Can't find package ${process.argv[2]}`);
        process.exit(1);
    }
    console.log(getPackageResolution({
        appPath: process.cwd(),
        packageDetails,
        packageManager: detectPackageManager_1.detectPackageManager(process.cwd(), null),
    }));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0UGFja2FnZVJlc29sdXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0UGFja2FnZVJlc29sdXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUNBQXNDO0FBQ3RDLHFEQUErRTtBQUMvRSxpRUFBNkU7QUFDN0UsdUNBQW1EO0FBQ25ELGdEQUE4RDtBQUM5RCxnREFBdUI7QUFDdkIsd0ZBQXdEO0FBQ3hELDJEQUF1RDtBQUN2RCxpREFBNkM7QUFFN0MsU0FBZ0Isb0JBQW9CLENBQUMsRUFDbkMsY0FBYyxFQUNkLGNBQWMsRUFDZCxPQUFPLEdBS1I7SUFDQyxJQUFJLGNBQWMsS0FBSyxNQUFNLEVBQUU7UUFDN0IsSUFBSSxZQUFZLEdBQUcsV0FBVyxDQUFBO1FBQzlCLElBQUksQ0FBQyxxQkFBVSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQzdCLE1BQU0sYUFBYSxHQUFHLGtDQUFpQixFQUFFLENBQUE7WUFDekMsSUFBSSxDQUFDLGFBQWEsRUFBRTtnQkFDbEIsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO2FBQzdDO1lBQ0QsWUFBWSxHQUFHLFdBQUksQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUE7U0FDaEQ7UUFDRCxJQUFJLENBQUMscUJBQVUsQ0FBQyxZQUFZLENBQUMsRUFBRTtZQUM3QixNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUE7U0FDN0M7UUFDRCxNQUFNLGNBQWMsR0FBRyx1QkFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQzVELElBQUksV0FBVyxDQUFBO1FBQ2YsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUU7WUFDL0MsTUFBTSxrQkFBa0IsR0FBRyxnQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtZQUM1RCxJQUFJLGtCQUFrQixDQUFDLElBQUksS0FBSyxTQUFTLEVBQUU7Z0JB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SUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDcEUsSUFBSSxDQUFDLGNBQWMsRUFBRTtRQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNwRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ2hCO0lBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FDVCxvQkFBb0IsQ0FBQztRQUNuQixPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRTtRQUN0QixjQUFjO1FBQ2QsY0FBYyxFQUFFLDJDQUFvQixDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUM7S0FDMUQsQ0FBQyxDQUNILENBQUE7Q0FDRiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tIFwiLi9wYXRoXCJcclxuaW1wb3J0IHsgUGFja2FnZURldGFpbHMsIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcgfSBmcm9tIFwiLi9QYWNrYWdlRGV0YWlsc1wiXHJcbmltcG9ydCB7IFBhY2thZ2VNYW5hZ2VyLCBkZXRlY3RQYWNrYWdlTWFuYWdlciB9IGZyb20gXCIuL2RldGVjdFBhY2thZ2VNYW5hZ2VyXCJcclxuaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSBcImZzLWV4dHJhXCJcclxuaW1wb3J0IHsgcGFyc2UgYXMgcGFyc2VZYXJuTG9ja0ZpbGUgfSBmcm9tIFwiQHlhcm5wa2cvbG9ja2ZpbGVcIlxyXG5pbXBvcnQgeWFtbCBmcm9tIFwieWFtbFwiXHJcbmltcG9ydCBmaW5kV29ya3NwYWNlUm9vdCBmcm9tIFwiZmluZC15YXJuLXdvcmtzcGFjZS1yb290XCJcclxuaW1wb3J0IHsgZ2V0UGFja2FnZVZlcnNpb24gfSBmcm9tIFwiLi9nZXRQYWNrYWdlVmVyc2lvblwiXHJcbmltcG9ydCB7IGNvZXJjZVNlbVZlciB9IGZyb20gXCIuL2NvZXJjZVNlbVZlclwiXHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFja2FnZVJlc29sdXRpb24oe1xyXG4gIHBhY2thZ2VEZXRhaWxzLFxyXG4gIHBhY2thZ2VNYW5hZ2VyLFxyXG4gIGFwcFBhdGgsXHJcbn06IHtcclxuICBwYWNrYWdlRGV0YWlsczogUGFja2FnZURldGFpbHNcclxuICBwYWNrYWdlTWFuYWdlcjogUGFja2FnZU1hbmFnZXJcclxuICBhcHBQYXRoOiBzdHJpbmdcclxufSkge1xyXG4gIGlmIChwYWNrYWdlTWFuYWdlciA9PT0gXCJ5YXJuXCIpIHtcclxuICAgIGxldCBsb2NrRmlsZVBhdGggPSBcInlhcm4ubG9ja1wiXHJcbiAgICBpZiAoIWV4aXN0c1N5bmMobG9ja0ZpbGVQYXRoKSkge1xyXG4gICAgICBjb25zdCB3b3Jrc3BhY2VSb290ID0gZmluZFdvcmtzcGFjZVJvb3QoKVxyXG4gICAgICBpZiAoIXdvcmtzcGFjZVJvb3QpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBmaW5kIHlhcm4ubG9jayBmaWxlXCIpXHJcbiAgICAgIH1cclxuICAgICAgbG9ja0ZpbGVQYXRoID0gam9pbih3b3Jrc3BhY2VSb290LCBcInlhcm4ubG9ja1wiKVxyXG4gICAgfVxyXG4gICAgaWYgKCFleGlzdHNTeW5jKGxvY2tGaWxlUGF0aCkpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQ2FuJ3QgZmluZCB5YXJuLmxvY2sgZmlsZVwiKVxyXG4gICAgfVxyXG4gICAgY29uc3QgbG9ja0ZpbGVTdHJpbmcgPSByZWFkRmlsZVN5bmMobG9ja0ZpbGVQYXRoKS50b1N0cmluZygpXHJcbiAgICBsZXQgYXBwTG9ja0ZpbGVcclxuICAgIGlmIChsb2NrRmlsZVN0cmluZy5pbmNsdWRlcyhcInlhcm4gbG9ja2ZpbGUgdjFcIikpIHtcclxuICAgICAgY29uc3QgcGFyc2VkWWFybkxvY2tGaWxlID0gcGFyc2VZYXJuTG9ja0ZpbGUobG9ja0ZpbGVTdHJpbmcpXHJcbiAgICAgIGlmIChwYXJzZWRZYXJuTG9ja0ZpbGUudHlwZSAhPT0gXCJzdWNjZXNzXCIpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgcGFyc2UgeWFybiB2MSBsb2NrIGZpbGVcIilcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBhcHBMb2NrRmlsZSA9IHBhcnNlZFlhcm5Mb2NrRmlsZS5vYmplY3RcclxuICAgICAgfVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBhcHBMb2NrRmlsZSA9IHlhbWwucGFyc2UobG9ja0ZpbGVTdHJpbmcpXHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhlKVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBwYXJzZSB5YXJuIHYyIGxvY2sgZmlsZVwiKVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgaW5zdGFsbGVkVmVyc2lvbiA9IGdldFBhY2thZ2VWZXJzaW9uKFxyXG4gICAgICBqb2luKHJlc29sdmUoYXBwUGF0aCwgcGFja2FnZURldGFpbHMucGF0aCksIFwicGFja2FnZS5qc29uXCIpLFxyXG4gICAgKVxyXG5cclxuICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyhhcHBMb2NrRmlsZSkuZmlsdGVyKFxyXG4gICAgICAoW2ssIHZdKSA9PlxyXG4gICAgICAgIGsuc3RhcnRzV2l0aChwYWNrYWdlRGV0YWlscy5uYW1lICsgXCJAXCIpICYmXHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZVxyXG4gICAgICAgIGNvZXJjZVNlbVZlcih2LnZlcnNpb24pID09PSBjb2VyY2VTZW1WZXIoaW5zdGFsbGVkVmVyc2lvbiksXHJcbiAgICApXHJcblxyXG4gICAgY29uc3QgcmVzb2x1dGlvbnMgPSBlbnRyaWVzLm1hcCgoW18sIHZdKSA9PiB7XHJcbiAgICAgIC8vIEB0cy1pZ25vcmVcclxuICAgICAgcmV0dXJuIHYucmVzb2x2ZWRcclxuICAgIH0pXHJcblxyXG4gICAgaWYgKHJlc29sdXRpb25zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgYFxcYCR7cGFja2FnZURldGFpbHMucGF0aFNwZWNpZmllcn1cXGAncyBpbnN0YWxsZWQgdmVyc2lvbiBpcyAke2luc3RhbGxlZFZlcnNpb259IGJ1dCBhIGxvY2tmaWxlIGVudHJ5IGZvciBpdCBjb3VsZG4ndCBiZSBmb3VuZC4gWW91ciBsb2NrZmlsZSBpcyBsaWtlbHkgdG8gYmUgY29ycnVwdCBvciB5b3UgZm9yZ290IHRvIHJlaW5zdGFsbCB5b3VyIHBhY2thZ2VzLmAsXHJcbiAgICAgIClcclxuICAgIH1cclxuXHJcbiAgICBpZiAobmV3IFNldChyZXNvbHV0aW9ucykuc2l6ZSAhPT0gMSkge1xyXG4gICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICBgQW1iaWdpb3VzIGxvY2tmaWxlIGVudHJpZXMgZm9yICR7cGFja2FnZURldGFpbHMucGF0aFNwZWNpZmllcn0uIFVzaW5nIHZlcnNpb24gJHtpbnN0YWxsZWRWZXJzaW9ufWAsXHJcbiAgICAgIClcclxuICAgICAgcmV0dXJuIGluc3RhbGxlZFZlcnNpb25cclxuICAgIH1cclxuXHJcbiAgICBpZiAocmVzb2x1dGlvbnNbMF0pIHtcclxuICAgICAgcmV0dXJuIHJlc29sdXRpb25zWzBdXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzb2x1dGlvbiA9IGVudHJpZXNbMF1bMF0uc2xpY2UocGFja2FnZURldGFpbHMubmFtZS5sZW5ndGggKyAxKVxyXG5cclxuICAgIC8vIHJlc29sdmUgcmVsYXRpdmUgZmlsZSBwYXRoXHJcbiAgICBpZiAocmVzb2x1dGlvbi5zdGFydHNXaXRoKFwiZmlsZTouXCIpKSB7XHJcbiAgICAgIHJldHVybiBgZmlsZToke3Jlc29sdmUoYXBwUGF0aCwgcmVzb2x1dGlvbi5zbGljZShcImZpbGU6XCIubGVuZ3RoKSl9YFxyXG4gICAgfVxyXG5cclxuICAgIGlmIChyZXNvbHV0aW9uLnN0YXJ0c1dpdGgoXCJucG06XCIpKSB7XHJcbiAgICAgIHJldHVybiByZXNvbHV0aW9uLnJlcGxhY2UoXCJucG06XCIsIFwiXCIpXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc29sdXRpb25cclxuICB9IGVsc2Uge1xyXG4gICAgY29uc3QgbG9ja2ZpbGUgPSByZXF1aXJlKGpvaW4oXHJcbiAgICAgIGFwcFBhdGgsXHJcbiAgICAgIHBhY2thZ2VNYW5hZ2VyID09PSBcIm5wbS1zaHJpbmt3cmFwXCJcclxuICAgICAgICA/IFwibnBtLXNocmlua3dyYXAuanNvblwiXHJcbiAgICAgICAgOiBcInBhY2thZ2UtbG9jay5qc29uXCIsXHJcbiAgICApKVxyXG4gICAgY29uc3QgbG9ja0ZpbGVTdGFjayA9IFtsb2NrZmlsZV1cclxuICAgIGZvciAoY29uc3QgbmFtZSBvZiBwYWNrYWdlRGV0YWlscy5wYWNrYWdlTmFtZXMuc2xpY2UoMCwgLTEpKSB7XHJcbiAgICAgIGNvbnN0IGNoaWxkID0gbG9ja0ZpbGVTdGFja1swXS5kZXBlbmRlbmNpZXNcclxuICAgICAgaWYgKGNoaWxkICYmIG5hbWUgaW4gY2hpbGQpIHtcclxuICAgICAgICBsb2NrRmlsZVN0YWNrLnB1c2goY2hpbGRbbmFtZV0pXHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGxvY2tGaWxlU3RhY2sucmV2ZXJzZSgpXHJcbiAgICBjb25zdCByZWxldmFudFN0YWNrRW50cnkgPSBsb2NrRmlsZVN0YWNrLmZpbmQoKGVudHJ5KSA9PiB7XHJcbiAgICAgIGlmIChlbnRyeS5kZXBlbmRlbmNpZXMpIHtcclxuICAgICAgICByZXR1cm4gZW50cnkuZGVwZW5kZW5jaWVzICYmIHBhY2thZ2VEZXRhaWxzLm5hbWUgaW4gZW50cnkuZGVwZW5kZW5jaWVzXHJcbiAgICAgIH0gZWxzZSBpZiAoZW50cnkucGFja2FnZXMpIHtcclxuICAgICAgICByZXR1cm4gZW50cnkucGFja2FnZXMgJiYgcGFja2FnZURldGFpbHMucGF0aCBpbiBlbnRyeS5wYWNrYWdlc1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIGRlcGVuZGVuY2llcyBvciBwYWNrYWdlcyBpbiBsb2NrZmlsZVwiKVxyXG4gICAgfSlcclxuICAgIGNvbnN0IHBrZyA9IHJlbGV2YW50U3RhY2tFbnRyeS5kZXBlbmRlbmNpZXNcclxuICAgICAgPyByZWxldmFudFN0YWNrRW50cnkuZGVwZW5kZW5jaWVzW3BhY2thZ2VEZXRhaWxzLm5hbWVdXHJcbiAgICAgIDogcmVsZXZhbnRTdGFja0VudHJ5LnBhY2thZ2VzW3BhY2thZ2VEZXRhaWxzLnBhdGhdXHJcbiAgICByZXR1cm4gcGtnLnJlc29sdmVkIHx8IHBrZy52ZXJzaW9uIHx8IHBrZy5mcm9tXHJcbiAgfVxyXG59XHJcblxyXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcclxuICBjb25zdCBwYWNrYWdlRGV0YWlscyA9IGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcocHJvY2Vzcy5hcmd2WzJdKVxyXG4gIGlmICghcGFja2FnZURldGFpbHMpIHtcclxuICAgIGNvbnNvbGUubG9nKGBDYW4ndCBmaW5kIHBhY2thZ2UgJHtwcm9jZXNzLmFyZ3ZbMl19YClcclxuICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gIH1cclxuICBjb25zb2xlLmxvZyhcclxuICAgIGdldFBhY2thZ2VSZXNvbHV0aW9uKHtcclxuICAgICAgYXBwUGF0aDogcHJvY2Vzcy5jd2QoKSxcclxuICAgICAgcGFja2FnZURldGFpbHMsXHJcbiAgICAgIHBhY2thZ2VNYW5hZ2VyOiBkZXRlY3RQYWNrYWdlTWFuYWdlcihwcm9jZXNzLmN3ZCgpLCBudWxsKSxcclxuICAgIH0pLFxyXG4gIClcclxufVxyXG4iXX0=
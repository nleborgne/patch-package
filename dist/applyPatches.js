"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPatch = exports.applyPatchesForPackage = exports.applyPatchesForApp = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const semver_1 = __importDefault(require("semver"));
const hash_1 = require("./hash");
const makePatch_1 = require("./makePatch");
const packageIsDevDependency_1 = require("./packageIsDevDependency");
const apply_1 = require("./patch/apply");
const read_1 = require("./patch/read");
const reverse_1 = require("./patch/reverse");
const patchFs_1 = require("./patchFs");
const path_2 = require("./path");
const stateFile_1 = require("./stateFile");
class PatchApplicationError extends Error {
    constructor(msg) {
        super(msg);
    }
}
function getInstalledPackageVersion({ appPath, path, pathSpecifier, isDevOnly, patchFilename, }) {
    const packageDir = path_2.join(appPath, path);
    if (!fs_extra_1.existsSync(packageDir)) {
        if (process.env.NODE_ENV === "production" && isDevOnly) {
            return null;
        }
        let err = `${chalk_1.default.red("Error:")} Patch file found for package ${path_1.posix.basename(pathSpecifier)}` + ` which is not present at ${path_2.relative(".", packageDir)}`;
        if (!isDevOnly && process.env.NODE_ENV === "production") {
            err += `

  If this package is a dev dependency, rename the patch file to
  
    ${chalk_1.default.bold(patchFilename.replace(".patch", ".dev.patch"))}
`;
        }
        throw new PatchApplicationError(err);
    }
    const { version } = require(path_2.join(packageDir, "package.json"));
    // normalize version for `npm ci`
    const result = semver_1.default.valid(version);
    if (result === null) {
        throw new PatchApplicationError(`${chalk_1.default.red("Error:")} Version string '${version}' cannot be parsed from ${path_2.join(packageDir, "package.json")}`);
    }
    return result;
}
function logPatchApplication(patchDetails) {
    const sequenceString = patchDetails.sequenceNumber != null
        ? ` (${patchDetails.sequenceNumber}${patchDetails.sequenceName ? " " + patchDetails.sequenceName : ""})`
        : "";
    console.log(`${chalk_1.default.bold(patchDetails.pathSpecifier)}@${patchDetails.version}${sequenceString} ${chalk_1.default.green("✔")}`);
}
function applyPatchesForApp({ appPath, reverse, patchDir, shouldExitWithError, shouldExitWithWarning, bestEffort, }) {
    const patchesDirectory = path_2.join(appPath, patchDir);
    const groupedPatches = patchFs_1.getGroupedPatches(patchesDirectory);
    if (groupedPatches.numPatchFiles === 0) {
        console.log(chalk_1.default.blueBright("No patch files found"));
        return;
    }
    const errors = [];
    const warnings = [...groupedPatches.warnings];
    for (const patches of Object.values(groupedPatches.pathSpecifierToPatchFiles)) {
        applyPatchesForPackage({
            patches,
            appPath,
            patchDir,
            reverse,
            warnings,
            errors,
            bestEffort,
        });
    }
    for (const warning of warnings) {
        console.log(warning);
    }
    for (const error of errors) {
        console.log(error);
    }
    const problemsSummary = [];
    if (warnings.length) {
        problemsSummary.push(chalk_1.default.yellow(`${warnings.length} warning(s)`));
    }
    if (errors.length) {
        problemsSummary.push(chalk_1.default.red(`${errors.length} error(s)`));
    }
    if (problemsSummary.length) {
        console.log("---");
        console.log("patch-package finished with", problemsSummary.join(", ") + ".");
    }
    if (errors.length && shouldExitWithError) {
        process.exit(1);
    }
    if (warnings.length && shouldExitWithWarning) {
        process.exit(1);
    }
    process.exit(0);
}
exports.applyPatchesForApp = applyPatchesForApp;
function applyPatchesForPackage({ patches, appPath, patchDir, reverse, warnings, errors, bestEffort, }) {
    const pathSpecifier = patches[0].pathSpecifier;
    const state = patches.length > 1 ? stateFile_1.getPatchApplicationState(patches[0]) : null;
    const unappliedPatches = patches.slice(0);
    const appliedPatches = [];
    // if there are multiple patches to apply, we can't rely on the reverse-patch-dry-run behavior to make this operation
    // idempotent, so instead we need to check the state file to see whether we have already applied any of the patches
    // todo: once this is battle tested we might want to use the same approach for single patches as well, but it's not biggie since the dry run thing is fast
    if (unappliedPatches && state) {
        for (let i = 0; i < state.patches.length; i++) {
            const patchThatWasApplied = state.patches[i];
            if (!patchThatWasApplied.didApply) {
                break;
            }
            const patchToApply = unappliedPatches[0];
            const currentPatchHash = hash_1.hashFile(path_2.join(appPath, patchDir, patchToApply.patchFilename));
            if (patchThatWasApplied.patchContentHash === currentPatchHash) {
                // this patch was applied we can skip it
                appliedPatches.push(unappliedPatches.shift());
            }
            else {
                console.log(chalk_1.default.red("Error:"), `The patches for ${chalk_1.default.bold(pathSpecifier)} have changed.`, `You should reinstall your node_modules folder to make sure the package is up to date`);
                process.exit(1);
            }
        }
    }
    if (reverse && state) {
        // if we are reversing the patches we need to make the unappliedPatches array
        // be the reversed version of the appliedPatches array.
        // The applied patches array should then be empty because it is used differently
        // when outputting the state file.
        unappliedPatches.length = 0;
        unappliedPatches.push(...appliedPatches);
        unappliedPatches.reverse();
        appliedPatches.length = 0;
    }
    if (appliedPatches.length) {
        // some patches have already been applied
        appliedPatches.forEach(logPatchApplication);
    }
    if (!unappliedPatches.length) {
        return;
    }
    let failedPatch = null;
    packageLoop: for (const patchDetails of unappliedPatches) {
        try {
            const { name, version, path, isDevOnly, patchFilename } = patchDetails;
            const installedPackageVersion = getInstalledPackageVersion({
                appPath,
                path,
                pathSpecifier,
                isDevOnly: isDevOnly ||
                    // check for direct-dependents in prod
                    (process.env.NODE_ENV === "production" &&
                        packageIsDevDependency_1.packageIsDevDependency({
                            appPath,
                            patchDetails,
                        })),
                patchFilename,
            });
            if (!installedPackageVersion) {
                // it's ok we're in production mode and this is a dev only package
                console.log(`Skipping dev-only ${chalk_1.default.bold(pathSpecifier)}@${version} ${chalk_1.default.blue("✔")}`);
                continue;
            }
            if (applyPatch({
                patchFilePath: path_2.join(appPath, patchDir, patchFilename),
                reverse,
                patchDetails,
                patchDir,
                cwd: process.cwd(),
                bestEffort,
            })) {
                appliedPatches.push(patchDetails);
                // yay patch was applied successfully
                // print warning if version mismatch
                if (installedPackageVersion !== version) {
                    warnings.push(createVersionMismatchWarning({
                        packageName: name,
                        actualVersion: installedPackageVersion,
                        originalVersion: version,
                        pathSpecifier,
                        path,
                    }));
                }
                logPatchApplication(patchDetails);
            }
            else if (patches.length > 1) {
                makePatch_1.logPatchSequenceError({ patchDetails });
                // in case the package has multiple patches, we need to break out of this inner loop
                // because we don't want to apply more patches on top of the broken state
                failedPatch = patchDetails;
                break packageLoop;
            }
            else if (installedPackageVersion === version) {
                // completely failed to apply patch
                // TODO: propagate useful error messages from patch application
                errors.push(createBrokenPatchFileError({
                    packageName: name,
                    patchFilename,
                    pathSpecifier,
                    path,
                }));
                break packageLoop;
            }
            else {
                errors.push(createPatchApplicationFailureError({
                    packageName: name,
                    actualVersion: installedPackageVersion,
                    originalVersion: version,
                    patchFilename,
                    path,
                    pathSpecifier,
                }));
                // in case the package has multiple patches, we need to break out of this inner loop
                // because we don't want to apply more patches on top of the broken state
                break packageLoop;
            }
        }
        catch (error) {
            if (error instanceof PatchApplicationError) {
                errors.push(error.message);
            }
            else {
                errors.push(createUnexpectedError({
                    filename: patchDetails.patchFilename,
                    error: error,
                }));
            }
            // in case the package has multiple patches, we need to break out of this inner loop
            // because we don't want to apply more patches on top of the broken state
            break packageLoop;
        }
    }
    if (patches.length > 1) {
        if (reverse) {
            if (!state) {
                throw new Error("unexpected state: no state file found while reversing");
            }
            // if we removed all the patches that were previously applied we can delete the state file
            if (appliedPatches.length === patches.length) {
                stateFile_1.clearPatchApplicationState(patches[0]);
            }
            else {
                // We failed while reversing patches and some are still in the applied state.
                // We need to update the state file to reflect that.
                // appliedPatches is currently the patches that were successfully reversed, in the order they were reversed
                // So we need to find the index of the last reversed patch in the original patches array
                // and then remove all the patches after that. Sorry for the confusing code.
                const lastReversedPatchIndex = patches.indexOf(appliedPatches[appliedPatches.length - 1]);
                if (lastReversedPatchIndex === -1) {
                    throw new Error("unexpected state: failed to find last reversed patch in original patches array");
                }
                stateFile_1.savePatchApplicationState({
                    packageDetails: patches[0],
                    patches: patches.slice(0, lastReversedPatchIndex).map((patch) => ({
                        didApply: true,
                        patchContentHash: hash_1.hashFile(path_2.join(appPath, patchDir, patch.patchFilename)),
                        patchFilename: patch.patchFilename,
                    })),
                    isRebasing: false,
                });
            }
        }
        else {
            const nextState = appliedPatches.map((patch) => ({
                didApply: true,
                patchContentHash: hash_1.hashFile(path_2.join(appPath, patchDir, patch.patchFilename)),
                patchFilename: patch.patchFilename,
            }));
            if (failedPatch) {
                nextState.push({
                    didApply: false,
                    patchContentHash: hash_1.hashFile(path_2.join(appPath, patchDir, failedPatch.patchFilename)),
                    patchFilename: failedPatch.patchFilename,
                });
            }
            stateFile_1.savePatchApplicationState({
                packageDetails: patches[0],
                patches: nextState,
                isRebasing: !!failedPatch,
            });
        }
        if (failedPatch) {
            process.exit(1);
        }
    }
}
exports.applyPatchesForPackage = applyPatchesForPackage;
function applyPatch({ patchFilePath, reverse, patchDetails, patchDir, cwd, bestEffort, }) {
    const patch = read_1.readPatch({
        patchFilePath,
        patchDetails,
        patchDir,
    });
    const forward = reverse ? reverse_1.reversePatch(patch) : patch;
    try {
        if (!bestEffort) {
            apply_1.executeEffects(forward, { dryRun: true, cwd, bestEffort: false });
        }
        const errors = bestEffort ? [] : undefined;
        apply_1.executeEffects(forward, { dryRun: false, cwd, bestEffort, errors });
        if (errors === null || errors === void 0 ? void 0 : errors.length) {
            console.log("Saving errors to", chalk_1.default.cyan.bold("./patch-package-errors.log"));
            fs_1.writeFileSync("patch-package-errors.log", errors.join("\n\n"));
            process.exit(0);
        }
    }
    catch (e) {
        try {
            const backward = reverse ? patch : reverse_1.reversePatch(patch);
            apply_1.executeEffects(backward, {
                dryRun: true,
                cwd,
                bestEffort: false,
            });
        }
        catch (e) {
            return false;
        }
    }
    return true;
}
exports.applyPatch = applyPatch;
function createVersionMismatchWarning({ packageName, actualVersion, originalVersion, pathSpecifier, path, }) {
    return `
${chalk_1.default.yellow("Warning:")} patch-package detected a patch file version mismatch

  Don't worry! This is probably fine. The patch was still applied
  successfully. Here's the deets:

  Patch file created for

    ${packageName}@${chalk_1.default.bold(originalVersion)}

  applied to

    ${packageName}@${chalk_1.default.bold(actualVersion)}
  
  At path
  
    ${path}

  This warning is just to give you a heads-up. There is a small chance of
  breakage even though the patch was applied successfully. Make sure the package
  still behaves like you expect (you wrote tests, right?) and then run

    ${chalk_1.default.bold(`patch-package ${pathSpecifier}`)}

  to update the version in the patch file name and make this warning go away.
`;
}
function createBrokenPatchFileError({ packageName, patchFilename, path, pathSpecifier, }) {
    return `
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`Failed to apply patch for package ${chalk_1.default.bold(packageName)} at path`)}
  
    ${path}

  This error was caused because patch-package cannot apply the following patch file:

    patches/${patchFilename}

  Try removing node_modules and trying again. If that doesn't work, maybe there was
  an accidental change made to the patch file? Try recreating it by manually
  editing the appropriate files and running:
  
    patch-package ${pathSpecifier}
  
  If that doesn't work, then it's a bug in patch-package, so please submit a bug
  report. Thanks!

    https://github.com/ds300/patch-package/issues
    
`;
}
function createPatchApplicationFailureError({ packageName, actualVersion, originalVersion, patchFilename, path, pathSpecifier, }) {
    return `
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`Failed to apply patch for package ${chalk_1.default.bold(packageName)} at path`)}
  
    ${path}

  This error was caused because ${chalk_1.default.bold(packageName)} has changed since you
  made the patch file for it. This introduced conflicts with your patch,
  just like a merge conflict in Git when separate incompatible changes are
  made to the same piece of code.

  Maybe this means your patch file is no longer necessary, in which case
  hooray! Just delete it!

  Otherwise, you need to generate a new patch file.

  To generate a new one, just repeat the steps you made to generate the first
  one.

  i.e. manually make the appropriate file changes, then run 

    patch-package ${pathSpecifier}

  Info:
    Patch file: patches/${patchFilename}
    Patch was made for version: ${chalk_1.default.green.bold(originalVersion)}
    Installed version: ${chalk_1.default.red.bold(actualVersion)}
`;
}
function createUnexpectedError({ filename, error, }) {
    return `
${chalk_1.default.red.bold("**ERROR**")} ${chalk_1.default.red(`Failed to apply patch file ${chalk_1.default.bold(filename)}`)}
  
${error.stack}

  `;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlQYXRjaGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2FwcGx5UGF0Y2hlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrREFBeUI7QUFDekIsMkJBQWtDO0FBQ2xDLHVDQUFxQztBQUNyQywrQkFBNEI7QUFDNUIsb0RBQTJCO0FBQzNCLGlDQUFpQztBQUNqQywyQ0FBbUQ7QUFFbkQscUVBQWlFO0FBQ2pFLHlDQUE4QztBQUM5Qyx1Q0FBd0M7QUFDeEMsNkNBQThDO0FBQzlDLHVDQUE2QztBQUM3QyxpQ0FBdUM7QUFDdkMsMkNBS29CO0FBRXBCLE1BQU0scUJBQXNCLFNBQVEsS0FBSztJQUN2QyxZQUFZLEdBQVc7UUFDckIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ1osQ0FBQztDQUNGO0FBRUQsU0FBUywwQkFBMEIsQ0FBQyxFQUNsQyxPQUFPLEVBQ1AsSUFBSSxFQUNKLGFBQWEsRUFDYixTQUFTLEVBQ1QsYUFBYSxHQU9kO0lBQ0MsTUFBTSxVQUFVLEdBQUcsV0FBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUN0QyxJQUFJLENBQUMscUJBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtRQUMzQixJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLFlBQVksSUFBSSxTQUFTLEVBQUU7WUFDdEQsT0FBTyxJQUFJLENBQUE7U0FDWjtRQUVELElBQUksR0FBRyxHQUNMLEdBQUcsZUFBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUNBQWlDLFlBQUssQ0FBQyxRQUFRLENBQ25FLGFBQWEsQ0FDZCxFQUFFLEdBQUcsNEJBQTRCLGVBQVEsQ0FBQyxHQUFHLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQTtRQUUvRCxJQUFJLENBQUMsU0FBUyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLFlBQVksRUFBRTtZQUN2RCxHQUFHLElBQUk7Ozs7TUFJUCxlQUFLLENB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LFdBQVcsRUFDWCxhQUFhLEVBQ2IsZUFBZSxFQUNmLGFBQWEsRUFDYixJQUFJLEVBQ0osYUFBYSxHQVFkO0lBQ0MsT0FBTztFQUNQLGVBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLGVBQUssQ0FBQyxHQUFHLENBQ3RDLHFDQUFxQyxlQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQ3ZFOztNQUVHLElBQUk7O2tDQUV3QixlQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7O29CQWVyQyxhQUFhOzs7MEJBR1AsYUFBYTtrQ0FDTCxlQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7eUJBQzFDLGVBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztDQUNyRCxDQUFBO0FBQ0QsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsRUFDN0IsUUFBUSxFQUNSLEtBQUssR0FJTjtJQUNDLE9BQU87RUFDUCxlQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxlQUFLLENBQUMsR0FBRyxDQUN0Qyw4QkFBOEIsZUFBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUNyRDs7RUFFRCxLQUFLLENBQUMsS0FBSzs7R0FFVixDQUFBO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tIFwiY2hhbGtcIlxyXG5pbXBvcnQgeyB3cml0ZUZpbGVTeW5jIH0gZnJvbSBcImZzXCJcclxuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJmcy1leHRyYVwiXHJcbmltcG9ydCB7IHBvc2l4IH0gZnJvbSBcInBhdGhcIlxyXG5pbXBvcnQgc2VtdmVyIGZyb20gXCJzZW12ZXJcIlxyXG5pbXBvcnQgeyBoYXNoRmlsZSB9IGZyb20gXCIuL2hhc2hcIlxyXG5pbXBvcnQgeyBsb2dQYXRjaFNlcXVlbmNlRXJyb3IgfSBmcm9tIFwiLi9tYWtlUGF0Y2hcIlxyXG5pbXBvcnQgeyBQYWNrYWdlRGV0YWlscywgUGF0Y2hlZFBhY2thZ2VEZXRhaWxzIH0gZnJvbSBcIi4vUGFja2FnZURldGFpbHNcIlxyXG5pbXBvcnQgeyBwYWNrYWdlSXNEZXZEZXBlbmRlbmN5IH0gZnJvbSBcIi4vcGFja2FnZUlzRGV2RGVwZW5kZW5jeVwiXHJcbmltcG9ydCB7IGV4ZWN1dGVFZmZlY3RzIH0gZnJvbSBcIi4vcGF0Y2gvYXBwbHlcIlxyXG5pbXBvcnQgeyByZWFkUGF0Y2ggfSBmcm9tIFwiLi9wYXRjaC9yZWFkXCJcclxuaW1wb3J0IHsgcmV2ZXJzZVBhdGNoIH0gZnJvbSBcIi4vcGF0Y2gvcmV2ZXJzZVwiXHJcbmltcG9ydCB7IGdldEdyb3VwZWRQYXRjaGVzIH0gZnJvbSBcIi4vcGF0Y2hGc1wiXHJcbmltcG9ydCB7IGpvaW4sIHJlbGF0aXZlIH0gZnJvbSBcIi4vcGF0aFwiXHJcbmltcG9ydCB7XHJcbiAgY2xlYXJQYXRjaEFwcGxpY2F0aW9uU3RhdGUsXHJcbiAgZ2V0UGF0Y2hBcHBsaWNhdGlvblN0YXRlLFxyXG4gIFBhdGNoU3RhdGUsXHJcbiAgc2F2ZVBhdGNoQXBwbGljYXRpb25TdGF0ZSxcclxufSBmcm9tIFwiLi9zdGF0ZUZpbGVcIlxyXG5cclxuY2xhc3MgUGF0Y2hBcHBsaWNhdGlvbkVycm9yIGV4dGVuZHMgRXJyb3Ige1xyXG4gIGNvbnN0cnVjdG9yKG1zZzogc3RyaW5nKSB7XHJcbiAgICBzdXBlcihtc2cpXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRJbnN0YWxsZWRQYWNrYWdlVmVyc2lvbih7XHJcbiAgYXBwUGF0aCxcclxuICBwYXRoLFxyXG4gIHBhdGhTcGVjaWZpZXIsXHJcbiAgaXNEZXZPbmx5LFxyXG4gIHBhdGNoRmlsZW5hbWUsXHJcbn06IHtcclxuICBhcHBQYXRoOiBzdHJpbmdcclxuICBwYXRoOiBzdHJpbmdcclxuICBwYXRoU3BlY2lmaWVyOiBzdHJpbmdcclxuICBpc0Rldk9ubHk6IGJvb2xlYW5cclxuICBwYXRjaEZpbGVuYW1lOiBzdHJpbmdcclxufSk6IG51bGwgfCBzdHJpbmcge1xyXG4gIGNvbnN0IHBhY2thZ2VEaXIgPSBqb2luKGFwcFBhdGgsIHBhdGgpXHJcbiAgaWYgKCFleGlzdHNTeW5jKHBhY2thZ2VEaXIpKSB7XHJcbiAgICBpZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09IFwicHJvZHVjdGlvblwiICYmIGlzRGV2T25seSkge1xyXG4gICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG5cclxuICAgIGxldCBlcnIgPVxyXG4gICAgICBgJHtjaGFsay5yZWQoXCJFcnJvcjpcIil9IFBhdGNoIGZpbGUgZm91bmQgZm9yIHBhY2thZ2UgJHtwb3NpeC5iYXNlbmFtZShcclxuICAgICAgICBwYXRoU3BlY2lmaWVyLFxyXG4gICAgICApfWAgKyBgIHdoaWNoIGlzIG5vdCBwcmVzZW50IGF0ICR7cmVsYXRpdmUoXCIuXCIsIHBhY2thZ2VEaXIpfWBcclxuXHJcbiAgICBpZiAoIWlzRGV2T25seSAmJiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJwcm9kdWN0aW9uXCIpIHtcclxuICAgICAgZXJyICs9IGBcclxuXHJcbiAgSWYgdGhpcyBwYWNrYWdlIGlzIGEgZGV2IGRlcGVuZGVuY3ksIHJlbmFtZSB0aGUgcGF0Y2ggZmlsZSB0b1xyXG4gIFxyXG4gICAgJHtjaGFsay5ib2xkKHBhdGNoRmlsZW5hbWUucmVwbGFjZShcIi5wYXRjaFwiLCBcIi5kZXYucGF0Y2hcIikpfVxyXG5gXHJcbiAgICB9XHJcbiAgICB0aHJvdyBuZXcgUGF0Y2hBcHBsaWNhdGlvbkVycm9yKGVycilcclxuICB9XHJcblxyXG4gIGNvbnN0IHsgdmVyc2lvbiB9ID0gcmVxdWlyZShqb2luKHBhY2thZ2VEaXIsIFwicGFja2FnZS5qc29uXCIpKVxyXG4gIC8vIG5vcm1hbGl6ZSB2ZXJzaW9uIGZvciBgbnBtIGNpYFxyXG4gIGNvbnN0IHJlc3VsdCA9IHNlbXZlci52YWxpZCh2ZXJzaW9uKVxyXG4gIGlmIChyZXN1bHQgPT09IG51bGwpIHtcclxuICAgIHRocm93IG5ldyBQYXRjaEFwcGxpY2F0aW9uRXJyb3IoXHJcbiAgICAgIGAke2NoYWxrLnJlZChcclxuICAgICAgICBcIkVycm9yOlwiLFxyXG4gICAgICApfSBWZXJzaW9uIHN0cmluZyAnJHt2ZXJzaW9ufScgY2Fubm90IGJlIHBhcnNlZCBmcm9tICR7am9pbihcclxuICAgICAgICBwYWNrYWdlRGlyLFxyXG4gICAgICAgIFwicGFja2FnZS5qc29uXCIsXHJcbiAgICAgICl9YCxcclxuICAgIClcclxuICB9XHJcblxyXG4gIHJldHVybiByZXN1bHQgYXMgc3RyaW5nXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGxvZ1BhdGNoQXBwbGljYXRpb24ocGF0Y2hEZXRhaWxzOiBQYXRjaGVkUGFja2FnZURldGFpbHMpIHtcclxuICBjb25zdCBzZXF1ZW5jZVN0cmluZyA9XHJcbiAgICBwYXRjaERldGFpbHMuc2VxdWVuY2VOdW1iZXIgIT0gbnVsbFxyXG4gICAgICA/IGAgKCR7cGF0Y2hEZXRhaWxzLnNlcXVlbmNlTnVtYmVyfSR7XHJcbiAgICAgICAgICBwYXRjaERldGFpbHMuc2VxdWVuY2VOYW1lID8gXCIgXCIgKyBwYXRjaERldGFpbHMuc2VxdWVuY2VOYW1lIDogXCJcIlxyXG4gICAgICAgIH0pYFxyXG4gICAgICA6IFwiXCJcclxuICBjb25zb2xlLmxvZyhcclxuICAgIGAke2NoYWxrLmJvbGQocGF0Y2hEZXRhaWxzLnBhdGhTcGVjaWZpZXIpfUAke1xyXG4gICAgICBwYXRjaERldGFpbHMudmVyc2lvblxyXG4gICAgfSR7c2VxdWVuY2VTdHJpbmd9ICR7Y2hhbGsuZ3JlZW4oXCLinJRcIil9YCxcclxuICApXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBhcHBseVBhdGNoZXNGb3JBcHAoe1xyXG4gIGFwcFBhdGgsXHJcbiAgcmV2ZXJzZSxcclxuICBwYXRjaERpcixcclxuICBzaG91bGRFeGl0V2l0aEVycm9yLFxyXG4gIHNob3VsZEV4aXRXaXRoV2FybmluZyxcclxuICBiZXN0RWZmb3J0LFxyXG59OiB7XHJcbiAgYXBwUGF0aDogc3RyaW5nXHJcbiAgcmV2ZXJzZTogYm9vbGVhblxyXG4gIHBhdGNoRGlyOiBzdHJpbmdcclxuICBzaG91bGRFeGl0V2l0aEVycm9yOiBib29sZWFuXHJcbiAgc2hvdWxkRXhpdFdpdGhXYXJuaW5nOiBib29sZWFuXHJcbiAgYmVzdEVmZm9ydDogYm9vbGVhblxyXG59KTogdm9pZCB7XHJcbiAgY29uc3QgcGF0Y2hlc0RpcmVjdG9yeSA9IGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIpXHJcbiAgY29uc3QgZ3JvdXBlZFBhdGNoZXMgPSBnZXRHcm91cGVkUGF0Y2hlcyhwYXRjaGVzRGlyZWN0b3J5KVxyXG5cclxuICBpZiAoZ3JvdXBlZFBhdGNoZXMubnVtUGF0Y2hGaWxlcyA9PT0gMCkge1xyXG4gICAgY29uc29sZS5sb2coY2hhbGsuYmx1ZUJyaWdodChcIk5vIHBhdGNoIGZpbGVzIGZvdW5kXCIpKVxyXG4gICAgcmV0dXJuXHJcbiAgfVxyXG5cclxuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW11cclxuICBjb25zdCB3YXJuaW5nczogc3RyaW5nW10gPSBbLi4uZ3JvdXBlZFBhdGNoZXMud2FybmluZ3NdXHJcblxyXG4gIGZvciAoY29uc3QgcGF0Y2hlcyBvZiBPYmplY3QudmFsdWVzKFxyXG4gICAgZ3JvdXBlZFBhdGNoZXMucGF0aFNwZWNpZmllclRvUGF0Y2hGaWxlcyxcclxuICApKSB7XHJcbiAgICBhcHBseVBhdGNoZXNGb3JQYWNrYWdlKHtcclxuICAgICAgcGF0Y2hlcyxcclxuICAgICAgYXBwUGF0aCxcclxuICAgICAgcGF0Y2hEaXIsXHJcbiAgICAgIHJldmVyc2UsXHJcbiAgICAgIHdhcm5pbmdzLFxyXG4gICAgICBlcnJvcnMsXHJcbiAgICAgIGJlc3RFZmZvcnQsXHJcbiAgICB9KVxyXG4gIH1cclxuXHJcbiAgZm9yIChjb25zdCB3YXJuaW5nIG9mIHdhcm5pbmdzKSB7XHJcbiAgICBjb25zb2xlLmxvZyh3YXJuaW5nKVxyXG4gIH1cclxuICBmb3IgKGNvbnN0IGVycm9yIG9mIGVycm9ycykge1xyXG4gICAgY29uc29sZS5sb2coZXJyb3IpXHJcbiAgfVxyXG5cclxuICBjb25zdCBwcm9ibGVtc1N1bW1hcnkgPSBbXVxyXG4gIGlmICh3YXJuaW5ncy5sZW5ndGgpIHtcclxuICAgIHByb2JsZW1zU3VtbWFyeS5wdXNoKGNoYWxrLnllbGxvdyhgJHt3YXJuaW5ncy5sZW5ndGh9IHdhcm5pbmcocylgKSlcclxuICB9XHJcbiAgaWYgKGVycm9ycy5sZW5ndGgpIHtcclxuICAgIHByb2JsZW1zU3VtbWFyeS5wdXNoKGNoYWxrLnJlZChgJHtlcnJvcnMubGVuZ3RofSBlcnJvcihzKWApKVxyXG4gIH1cclxuXHJcbiAgaWYgKHByb2JsZW1zU3VtbWFyeS5sZW5ndGgpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiLS0tXCIpXHJcbiAgICBjb25zb2xlLmxvZyhcInBhdGNoLXBhY2thZ2UgZmluaXNoZWQgd2l0aFwiLCBwcm9ibGVtc1N1bW1hcnkuam9pbihcIiwgXCIpICsgXCIuXCIpXHJcbiAgfVxyXG5cclxuICBpZiAoZXJyb3JzLmxlbmd0aCAmJiBzaG91bGRFeGl0V2l0aEVycm9yKSB7XHJcbiAgICBwcm9jZXNzLmV4aXQoMSlcclxuICB9XHJcblxyXG4gIGlmICh3YXJuaW5ncy5sZW5ndGggJiYgc2hvdWxkRXhpdFdpdGhXYXJuaW5nKSB7XHJcbiAgICBwcm9jZXNzLmV4aXQoMSlcclxuICB9XHJcblxyXG4gIHByb2Nlc3MuZXhpdCgwKVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlQYXRjaGVzRm9yUGFja2FnZSh7XHJcbiAgcGF0Y2hlcyxcclxuICBhcHBQYXRoLFxyXG4gIHBhdGNoRGlyLFxyXG4gIHJldmVyc2UsXHJcbiAgd2FybmluZ3MsXHJcbiAgZXJyb3JzLFxyXG4gIGJlc3RFZmZvcnQsXHJcbn06IHtcclxuICBwYXRjaGVzOiBQYXRjaGVkUGFja2FnZURldGFpbHNbXVxyXG4gIGFwcFBhdGg6IHN0cmluZ1xyXG4gIHBhdGNoRGlyOiBzdHJpbmdcclxuICByZXZlcnNlOiBib29sZWFuXHJcbiAgd2FybmluZ3M6IHN0cmluZ1tdXHJcbiAgZXJyb3JzOiBzdHJpbmdbXVxyXG4gIGJlc3RFZmZvcnQ6IGJvb2xlYW5cclxufSkge1xyXG4gIGNvbnN0IHBhdGhTcGVjaWZpZXIgPSBwYXRjaGVzWzBdLnBhdGhTcGVjaWZpZXJcclxuICBjb25zdCBzdGF0ZSA9IHBhdGNoZXMubGVuZ3RoID4gMSA/IGdldFBhdGNoQXBwbGljYXRpb25TdGF0ZShwYXRjaGVzWzBdKSA6IG51bGxcclxuICBjb25zdCB1bmFwcGxpZWRQYXRjaGVzID0gcGF0Y2hlcy5zbGljZSgwKVxyXG4gIGNvbnN0IGFwcGxpZWRQYXRjaGVzOiBQYXRjaGVkUGFja2FnZURldGFpbHNbXSA9IFtdXHJcbiAgLy8gaWYgdGhlcmUgYXJlIG11bHRpcGxlIHBhdGNoZXMgdG8gYXBwbHksIHdlIGNhbid0IHJlbHkgb24gdGhlIHJldmVyc2UtcGF0Y2gtZHJ5LXJ1biBiZWhhdmlvciB0byBtYWtlIHRoaXMgb3BlcmF0aW9uXHJcbiAgLy8gaWRlbXBvdGVudCwgc28gaW5zdGVhZCB3ZSBuZWVkIHRvIGNoZWNrIHRoZSBzdGF0ZSBmaWxlIHRvIHNlZSB3aGV0aGVyIHdlIGhhdmUgYWxyZWFkeSBhcHBsaWVkIGFueSBvZiB0aGUgcGF0Y2hlc1xyXG4gIC8vIHRvZG86IG9uY2UgdGhpcyBpcyBiYXR0bGUgdGVzdGVkIHdlIG1pZ2h0IHdhbnQgdG8gdXNlIHRoZSBzYW1lIGFwcHJvYWNoIGZvciBzaW5nbGUgcGF0Y2hlcyBhcyB3ZWxsLCBidXQgaXQncyBub3QgYmlnZ2llIHNpbmNlIHRoZSBkcnkgcnVuIHRoaW5nIGlzIGZhc3RcclxuICBpZiAodW5hcHBsaWVkUGF0Y2hlcyAmJiBzdGF0ZSkge1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdGF0ZS5wYXRjaGVzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIGNvbnN0IHBhdGNoVGhhdFdhc0FwcGxpZWQgPSBzdGF0ZS5wYXRjaGVzW2ldXHJcbiAgICAgIGlmICghcGF0Y2hUaGF0V2FzQXBwbGllZC5kaWRBcHBseSkge1xyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIH1cclxuICAgICAgY29uc3QgcGF0Y2hUb0FwcGx5ID0gdW5hcHBsaWVkUGF0Y2hlc1swXVxyXG4gICAgICBjb25zdCBjdXJyZW50UGF0Y2hIYXNoID0gaGFzaEZpbGUoXHJcbiAgICAgICAgam9pbihhcHBQYXRoLCBwYXRjaERpciwgcGF0Y2hUb0FwcGx5LnBhdGNoRmlsZW5hbWUpLFxyXG4gICAgICApXHJcbiAgICAgIGlmIChwYXRjaFRoYXRXYXNBcHBsaWVkLnBhdGNoQ29udGVudEhhc2ggPT09IGN1cnJlbnRQYXRjaEhhc2gpIHtcclxuICAgICAgICAvLyB0aGlzIHBhdGNoIHdhcyBhcHBsaWVkIHdlIGNhbiBza2lwIGl0XHJcbiAgICAgICAgYXBwbGllZFBhdGNoZXMucHVzaCh1bmFwcGxpZWRQYXRjaGVzLnNoaWZ0KCkhKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgY2hhbGsucmVkKFwiRXJyb3I6XCIpLFxyXG4gICAgICAgICAgYFRoZSBwYXRjaGVzIGZvciAke2NoYWxrLmJvbGQocGF0aFNwZWNpZmllcil9IGhhdmUgY2hhbmdlZC5gLFxyXG4gICAgICAgICAgYFlvdSBzaG91bGQgcmVpbnN0YWxsIHlvdXIgbm9kZV9tb2R1bGVzIGZvbGRlciB0byBtYWtlIHN1cmUgdGhlIHBhY2thZ2UgaXMgdXAgdG8gZGF0ZWAsXHJcbiAgICAgICAgKVxyXG4gICAgICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBpZiAocmV2ZXJzZSAmJiBzdGF0ZSkge1xyXG4gICAgLy8gaWYgd2UgYXJlIHJldmVyc2luZyB0aGUgcGF0Y2hlcyB3ZSBuZWVkIHRvIG1ha2UgdGhlIHVuYXBwbGllZFBhdGNoZXMgYXJyYXlcclxuICAgIC8vIGJlIHRoZSByZXZlcnNlZCB2ZXJzaW9uIG9mIHRoZSBhcHBsaWVkUGF0Y2hlcyBhcnJheS5cclxuICAgIC8vIFRoZSBhcHBsaWVkIHBhdGNoZXMgYXJyYXkgc2hvdWxkIHRoZW4gYmUgZW1wdHkgYmVjYXVzZSBpdCBpcyB1c2VkIGRpZmZlcmVudGx5XHJcbiAgICAvLyB3aGVuIG91dHB1dHRpbmcgdGhlIHN0YXRlIGZpbGUuXHJcbiAgICB1bmFwcGxpZWRQYXRjaGVzLmxlbmd0aCA9IDBcclxuICAgIHVuYXBwbGllZFBhdGNoZXMucHVzaCguLi5hcHBsaWVkUGF0Y2hlcylcclxuICAgIHVuYXBwbGllZFBhdGNoZXMucmV2ZXJzZSgpXHJcbiAgICBhcHBsaWVkUGF0Y2hlcy5sZW5ndGggPSAwXHJcbiAgfVxyXG4gIGlmIChhcHBsaWVkUGF0Y2hlcy5sZW5ndGgpIHtcclxuICAgIC8vIHNvbWUgcGF0Y2hlcyBoYXZlIGFscmVhZHkgYmVlbiBhcHBsaWVkXHJcbiAgICBhcHBsaWVkUGF0Y2hlcy5mb3JFYWNoKGxvZ1BhdGNoQXBwbGljYXRpb24pXHJcbiAgfVxyXG4gIGlmICghdW5hcHBsaWVkUGF0Y2hlcy5sZW5ndGgpIHtcclxuICAgIHJldHVyblxyXG4gIH1cclxuICBsZXQgZmFpbGVkUGF0Y2g6IFBhdGNoZWRQYWNrYWdlRGV0YWlscyB8IG51bGwgPSBudWxsXHJcbiAgcGFja2FnZUxvb3A6IGZvciAoY29uc3QgcGF0Y2hEZXRhaWxzIG9mIHVuYXBwbGllZFBhdGNoZXMpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHsgbmFtZSwgdmVyc2lvbiwgcGF0aCwgaXNEZXZPbmx5LCBwYXRjaEZpbGVuYW1lIH0gPSBwYXRjaERldGFpbHNcclxuXHJcbiAgICAgIGNvbnN0IGluc3RhbGxlZFBhY2thZ2VWZXJzaW9uID0gZ2V0SW5zdGFsbGVkUGFja2FnZVZlcnNpb24oe1xyXG4gICAgICAgIGFwcFBhdGgsXHJcbiAgICAgICAgcGF0aCxcclxuICAgICAgICBwYXRoU3BlY2lmaWVyLFxyXG4gICAgICAgIGlzRGV2T25seTpcclxuICAgICAgICAgIGlzRGV2T25seSB8fFxyXG4gICAgICAgICAgLy8gY2hlY2sgZm9yIGRpcmVjdC1kZXBlbmRlbnRzIGluIHByb2RcclxuICAgICAgICAgIChwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJwcm9kdWN0aW9uXCIgJiZcclxuICAgICAgICAgICAgcGFja2FnZUlzRGV2RGVwZW5kZW5jeSh7XHJcbiAgICAgICAgICAgICAgYXBwUGF0aCxcclxuICAgICAgICAgICAgICBwYXRjaERldGFpbHMsXHJcbiAgICAgICAgICAgIH0pKSxcclxuICAgICAgICBwYXRjaEZpbGVuYW1lLFxyXG4gICAgICB9KVxyXG4gICAgICBpZiAoIWluc3RhbGxlZFBhY2thZ2VWZXJzaW9uKSB7XHJcbiAgICAgICAgLy8gaXQncyBvayB3ZSdyZSBpbiBwcm9kdWN0aW9uIG1vZGUgYW5kIHRoaXMgaXMgYSBkZXYgb25seSBwYWNrYWdlXHJcbiAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICBgU2tpcHBpbmcgZGV2LW9ubHkgJHtjaGFsay5ib2xkKFxyXG4gICAgICAgICAgICBwYXRoU3BlY2lmaWVyLFxyXG4gICAgICAgICAgKX1AJHt2ZXJzaW9ufSAke2NoYWxrLmJsdWUoXCLinJRcIil9YCxcclxuICAgICAgICApXHJcbiAgICAgICAgY29udGludWVcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKFxyXG4gICAgICAgIGFwcGx5UGF0Y2goe1xyXG4gICAgICAgICAgcGF0Y2hGaWxlUGF0aDogam9pbihhcHBQYXRoLCBwYXRjaERpciwgcGF0Y2hGaWxlbmFtZSkgYXMgc3RyaW5nLFxyXG4gICAgICAgICAgcmV2ZXJzZSxcclxuICAgICAgICAgIHBhdGNoRGV0YWlscyxcclxuICAgICAgICAgIHBhdGNoRGlyLFxyXG4gICAgICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgYmVzdEVmZm9ydCxcclxuICAgICAgICB9KVxyXG4gICAgICApIHtcclxuICAgICAgICBhcHBsaWVkUGF0Y2hlcy5wdXNoKHBhdGNoRGV0YWlscylcclxuICAgICAgICAvLyB5YXkgcGF0Y2ggd2FzIGFwcGxpZWQgc3VjY2Vzc2Z1bGx5XHJcbiAgICAgICAgLy8gcHJpbnQgd2FybmluZyBpZiB2ZXJzaW9uIG1pc21hdGNoXHJcbiAgICAgICAgaWYgKGluc3RhbGxlZFBhY2thZ2VWZXJzaW9uICE9PSB2ZXJzaW9uKSB7XHJcbiAgICAgICAgICB3YXJuaW5ncy5wdXNoKFxyXG4gICAgICAgICAgICBjcmVhdGVWZXJzaW9uTWlzbWF0Y2hXYXJuaW5nKHtcclxuICAgICAgICAgICAgICBwYWNrYWdlTmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICBhY3R1YWxWZXJzaW9uOiBpbnN0YWxsZWRQYWNrYWdlVmVyc2lvbixcclxuICAgICAgICAgICAgICBvcmlnaW5hbFZlcnNpb246IHZlcnNpb24sXHJcbiAgICAgICAgICAgICAgcGF0aFNwZWNpZmllcixcclxuICAgICAgICAgICAgICBwYXRoLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgIClcclxuICAgICAgICB9XHJcbiAgICAgICAgbG9nUGF0Y2hBcHBsaWNhdGlvbihwYXRjaERldGFpbHMpXHJcbiAgICAgIH0gZWxzZSBpZiAocGF0Y2hlcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgbG9nUGF0Y2hTZXF1ZW5jZUVycm9yKHsgcGF0Y2hEZXRhaWxzIH0pXHJcbiAgICAgICAgLy8gaW4gY2FzZSB0aGUgcGFja2FnZSBoYXMgbXVsdGlwbGUgcGF0Y2hlcywgd2UgbmVlZCB0byBicmVhayBvdXQgb2YgdGhpcyBpbm5lciBsb29wXHJcbiAgICAgICAgLy8gYmVjYXVzZSB3ZSBkb24ndCB3YW50IHRvIGFwcGx5IG1vcmUgcGF0Y2hlcyBvbiB0b3Agb2YgdGhlIGJyb2tlbiBzdGF0ZVxyXG4gICAgICAgIGZhaWxlZFBhdGNoID0gcGF0Y2hEZXRhaWxzXHJcbiAgICAgICAgYnJlYWsgcGFja2FnZUxvb3BcclxuICAgICAgfSBlbHNlIGlmIChpbnN0YWxsZWRQYWNrYWdlVmVyc2lvbiA9PT0gdmVyc2lvbikge1xyXG4gICAgICAgIC8vIGNvbXBsZXRlbHkgZmFpbGVkIHRvIGFwcGx5IHBhdGNoXHJcbiAgICAgICAgLy8gVE9ETzogcHJvcGFnYXRlIHVzZWZ1bCBlcnJvciBtZXNzYWdlcyBmcm9tIHBhdGNoIGFwcGxpY2F0aW9uXHJcbiAgICAgICAgZXJyb3JzLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVCcm9rZW5QYXRjaEZpbGVFcnJvcih7XHJcbiAgICAgICAgICAgIHBhY2thZ2VOYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICBwYXRjaEZpbGVuYW1lLFxyXG4gICAgICAgICAgICBwYXRoU3BlY2lmaWVyLFxyXG4gICAgICAgICAgICBwYXRoLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgKVxyXG4gICAgICAgIGJyZWFrIHBhY2thZ2VMb29wXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZXJyb3JzLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVQYXRjaEFwcGxpY2F0aW9uRmFpbHVyZUVycm9yKHtcclxuICAgICAgICAgICAgcGFja2FnZU5hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgIGFjdHVhbFZlcnNpb246IGluc3RhbGxlZFBhY2thZ2VWZXJzaW9uLFxyXG4gICAgICAgICAgICBvcmlnaW5hbFZlcnNpb246IHZlcnNpb24sXHJcbiAgICAgICAgICAgIHBhdGNoRmlsZW5hbWUsXHJcbiAgICAgICAgICAgIHBhdGgsXHJcbiAgICAgICAgICAgIHBhdGhTcGVjaWZpZXIsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICApXHJcbiAgICAgICAgLy8gaW4gY2FzZSB0aGUgcGFja2FnZSBoYXMgbXVsdGlwbGUgcGF0Y2hlcywgd2UgbmVlZCB0byBicmVhayBvdXQgb2YgdGhpcyBpbm5lciBsb29wXHJcbiAgICAgICAgLy8gYmVjYXVzZSB3ZSBkb24ndCB3YW50IHRvIGFwcGx5IG1vcmUgcGF0Y2hlcyBvbiB0b3Agb2YgdGhlIGJyb2tlbiBzdGF0ZVxyXG4gICAgICAgIGJyZWFrIHBhY2thZ2VMb29wXHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIFBhdGNoQXBwbGljYXRpb25FcnJvcikge1xyXG4gICAgICAgIGVycm9ycy5wdXNoKGVycm9yLm1lc3NhZ2UpXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZXJyb3JzLnB1c2goXHJcbiAgICAgICAgICBjcmVhdGVVbmV4cGVjdGVkRXJyb3Ioe1xyXG4gICAgICAgICAgICBmaWxlbmFtZTogcGF0Y2hEZXRhaWxzLnBhdGNoRmlsZW5hbWUsXHJcbiAgICAgICAgICAgIGVycm9yOiBlcnJvciBhcyBFcnJvcixcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIClcclxuICAgICAgfVxyXG4gICAgICAvLyBpbiBjYXNlIHRoZSBwYWNrYWdlIGhhcyBtdWx0aXBsZSBwYXRjaGVzLCB3ZSBuZWVkIHRvIGJyZWFrIG91dCBvZiB0aGlzIGlubmVyIGxvb3BcclxuICAgICAgLy8gYmVjYXVzZSB3ZSBkb24ndCB3YW50IHRvIGFwcGx5IG1vcmUgcGF0Y2hlcyBvbiB0b3Agb2YgdGhlIGJyb2tlbiBzdGF0ZVxyXG4gICAgICBicmVhayBwYWNrYWdlTG9vcFxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgaWYgKHBhdGNoZXMubGVuZ3RoID4gMSkge1xyXG4gICAgaWYgKHJldmVyc2UpIHtcclxuICAgICAgaWYgKCFzdGF0ZSkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcInVuZXhwZWN0ZWQgc3RhdGU6IG5vIHN0YXRlIGZpbGUgZm91bmQgd2hpbGUgcmV2ZXJzaW5nXCIpXHJcbiAgICAgIH1cclxuICAgICAgLy8gaWYgd2UgcmVtb3ZlZCBhbGwgdGhlIHBhdGNoZXMgdGhhdCB3ZXJlIHByZXZpb3VzbHkgYXBwbGllZCB3ZSBjYW4gZGVsZXRlIHRoZSBzdGF0ZSBmaWxlXHJcbiAgICAgIGlmIChhcHBsaWVkUGF0Y2hlcy5sZW5ndGggPT09IHBhdGNoZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgY2xlYXJQYXRjaEFwcGxpY2F0aW9uU3RhdGUocGF0Y2hlc1swXSlcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBXZSBmYWlsZWQgd2hpbGUgcmV2ZXJzaW5nIHBhdGNoZXMgYW5kIHNvbWUgYXJlIHN0aWxsIGluIHRoZSBhcHBsaWVkIHN0YXRlLlxyXG4gICAgICAgIC8vIFdlIG5lZWQgdG8gdXBkYXRlIHRoZSBzdGF0ZSBmaWxlIHRvIHJlZmxlY3QgdGhhdC5cclxuICAgICAgICAvLyBhcHBsaWVkUGF0Y2hlcyBpcyBjdXJyZW50bHkgdGhlIHBhdGNoZXMgdGhhdCB3ZXJlIHN1Y2Nlc3NmdWxseSByZXZlcnNlZCwgaW4gdGhlIG9yZGVyIHRoZXkgd2VyZSByZXZlcnNlZFxyXG4gICAgICAgIC8vIFNvIHdlIG5lZWQgdG8gZmluZCB0aGUgaW5kZXggb2YgdGhlIGxhc3QgcmV2ZXJzZWQgcGF0Y2ggaW4gdGhlIG9yaWdpbmFsIHBhdGNoZXMgYXJyYXlcclxuICAgICAgICAvLyBhbmQgdGhlbiByZW1vdmUgYWxsIHRoZSBwYXRjaGVzIGFmdGVyIHRoYXQuIFNvcnJ5IGZvciB0aGUgY29uZnVzaW5nIGNvZGUuXHJcbiAgICAgICAgY29uc3QgbGFzdFJldmVyc2VkUGF0Y2hJbmRleCA9IHBhdGNoZXMuaW5kZXhPZihcclxuICAgICAgICAgIGFwcGxpZWRQYXRjaGVzW2FwcGxpZWRQYXRjaGVzLmxlbmd0aCAtIDFdLFxyXG4gICAgICAgIClcclxuICAgICAgICBpZiAobGFzdFJldmVyc2VkUGF0Y2hJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgXCJ1bmV4cGVjdGVkIHN0YXRlOiBmYWlsZWQgdG8gZmluZCBsYXN0IHJldmVyc2VkIHBhdGNoIGluIG9yaWdpbmFsIHBhdGNoZXMgYXJyYXlcIixcclxuICAgICAgICAgIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNhdmVQYXRjaEFwcGxpY2F0aW9uU3RhdGUoe1xyXG4gICAgICAgICAgcGFja2FnZURldGFpbHM6IHBhdGNoZXNbMF0sXHJcbiAgICAgICAgICBwYXRjaGVzOiBwYXRjaGVzLnNsaWNlKDAsIGxhc3RSZXZlcnNlZFBhdGNoSW5kZXgpLm1hcCgocGF0Y2gpID0+ICh7XHJcbiAgICAgICAgICAgIGRpZEFwcGx5OiB0cnVlLFxyXG4gICAgICAgICAgICBwYXRjaENvbnRlbnRIYXNoOiBoYXNoRmlsZShcclxuICAgICAgICAgICAgICBqb2luKGFwcFBhdGgsIHBhdGNoRGlyLCBwYXRjaC5wYXRjaEZpbGVuYW1lKSxcclxuICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgcGF0Y2hGaWxlbmFtZTogcGF0Y2gucGF0Y2hGaWxlbmFtZSxcclxuICAgICAgICAgIH0pKSxcclxuICAgICAgICAgIGlzUmViYXNpbmc6IGZhbHNlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnN0IG5leHRTdGF0ZSA9IGFwcGxpZWRQYXRjaGVzLm1hcChcclxuICAgICAgICAocGF0Y2gpOiBQYXRjaFN0YXRlID0+ICh7XHJcbiAgICAgICAgICBkaWRBcHBseTogdHJ1ZSxcclxuICAgICAgICAgIHBhdGNoQ29udGVudEhhc2g6IGhhc2hGaWxlKFxyXG4gICAgICAgICAgICBqb2luKGFwcFBhdGgsIHBhdGNoRGlyLCBwYXRjaC5wYXRjaEZpbGVuYW1lKSxcclxuICAgICAgICAgICksXHJcbiAgICAgICAgICBwYXRjaEZpbGVuYW1lOiBwYXRjaC5wYXRjaEZpbGVuYW1lLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICApXHJcblxyXG4gICAgICBpZiAoZmFpbGVkUGF0Y2gpIHtcclxuICAgICAgICBuZXh0U3RhdGUucHVzaCh7XHJcbiAgICAgICAgICBkaWRBcHBseTogZmFsc2UsXHJcbiAgICAgICAgICBwYXRjaENvbnRlbnRIYXNoOiBoYXNoRmlsZShcclxuICAgICAgICAgICAgam9pbihhcHBQYXRoLCBwYXRjaERpciwgZmFpbGVkUGF0Y2gucGF0Y2hGaWxlbmFtZSksXHJcbiAgICAgICAgICApLFxyXG4gICAgICAgICAgcGF0Y2hGaWxlbmFtZTogZmFpbGVkUGF0Y2gucGF0Y2hGaWxlbmFtZSxcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICAgIHNhdmVQYXRjaEFwcGxpY2F0aW9uU3RhdGUoe1xyXG4gICAgICAgIHBhY2thZ2VEZXRhaWxzOiBwYXRjaGVzWzBdLFxyXG4gICAgICAgIHBhdGNoZXM6IG5leHRTdGF0ZSxcclxuICAgICAgICBpc1JlYmFzaW5nOiAhIWZhaWxlZFBhdGNoLFxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgaWYgKGZhaWxlZFBhdGNoKSB7XHJcbiAgICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5UGF0Y2goe1xyXG4gIHBhdGNoRmlsZVBhdGgsXHJcbiAgcmV2ZXJzZSxcclxuICBwYXRjaERldGFpbHMsXHJcbiAgcGF0Y2hEaXIsXHJcbiAgY3dkLFxyXG4gIGJlc3RFZmZvcnQsXHJcbn06IHtcclxuICBwYXRjaEZpbGVQYXRoOiBzdHJpbmdcclxuICByZXZlcnNlOiBib29sZWFuXHJcbiAgcGF0Y2hEZXRhaWxzOiBQYWNrYWdlRGV0YWlsc1xyXG4gIHBhdGNoRGlyOiBzdHJpbmdcclxuICBjd2Q6IHN0cmluZ1xyXG4gIGJlc3RFZmZvcnQ6IGJvb2xlYW5cclxufSk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IHBhdGNoID0gcmVhZFBhdGNoKHtcclxuICAgIHBhdGNoRmlsZVBhdGgsXHJcbiAgICBwYXRjaERldGFpbHMsXHJcbiAgICBwYXRjaERpcixcclxuICB9KVxyXG5cclxuICBjb25zdCBmb3J3YXJkID0gcmV2ZXJzZSA/IHJldmVyc2VQYXRjaChwYXRjaCkgOiBwYXRjaFxyXG4gIHRyeSB7XHJcbiAgICBpZiAoIWJlc3RFZmZvcnQpIHtcclxuICAgICAgZXhlY3V0ZUVmZmVjdHMoZm9yd2FyZCwgeyBkcnlSdW46IHRydWUsIGN3ZCwgYmVzdEVmZm9ydDogZmFsc2UgfSlcclxuICAgIH1cclxuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gfCB1bmRlZmluZWQgPSBiZXN0RWZmb3J0ID8gW10gOiB1bmRlZmluZWRcclxuICAgIGV4ZWN1dGVFZmZlY3RzKGZvcndhcmQsIHsgZHJ5UnVuOiBmYWxzZSwgY3dkLCBiZXN0RWZmb3J0LCBlcnJvcnMgfSlcclxuICAgIGlmIChlcnJvcnM/Lmxlbmd0aCkge1xyXG4gICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICBcIlNhdmluZyBlcnJvcnMgdG9cIixcclxuICAgICAgICBjaGFsay5jeWFuLmJvbGQoXCIuL3BhdGNoLXBhY2thZ2UtZXJyb3JzLmxvZ1wiKSxcclxuICAgICAgKVxyXG4gICAgICB3cml0ZUZpbGVTeW5jKFwicGF0Y2gtcGFja2FnZS1lcnJvcnMubG9nXCIsIGVycm9ycy5qb2luKFwiXFxuXFxuXCIpKVxyXG4gICAgICBwcm9jZXNzLmV4aXQoMClcclxuICAgIH1cclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBiYWNrd2FyZCA9IHJldmVyc2UgPyBwYXRjaCA6IHJldmVyc2VQYXRjaChwYXRjaClcclxuICAgICAgZXhlY3V0ZUVmZmVjdHMoYmFja3dhcmQsIHtcclxuICAgICAgICBkcnlSdW46IHRydWUsXHJcbiAgICAgICAgY3dkLFxyXG4gICAgICAgIGJlc3RFZmZvcnQ6IGZhbHNlLFxyXG4gICAgICB9KVxyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICByZXR1cm4gZmFsc2VcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB0cnVlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVZlcnNpb25NaXNtYXRjaFdhcm5pbmcoe1xyXG4gIHBhY2thZ2VOYW1lLFxyXG4gIGFjdHVhbFZlcnNpb24sXHJcbiAgb3JpZ2luYWxWZXJzaW9uLFxyXG4gIHBhdGhTcGVjaWZpZXIsXHJcbiAgcGF0aCxcclxufToge1xyXG4gIHBhY2thZ2VOYW1lOiBzdHJpbmdcclxuICBhY3R1YWxWZXJzaW9uOiBzdHJpbmdcclxuICBvcmlnaW5hbFZlcnNpb246IHN0cmluZ1xyXG4gIHBhdGhTcGVjaWZpZXI6IHN0cmluZ1xyXG4gIHBhdGg6IHN0cmluZ1xyXG59KSB7XHJcbiAgcmV0dXJuIGBcclxuJHtjaGFsay55ZWxsb3coXCJXYXJuaW5nOlwiKX0gcGF0Y2gtcGFja2FnZSBkZXRlY3RlZCBhIHBhdGNoIGZpbGUgdmVyc2lvbiBtaXNtYXRjaFxyXG5cclxuICBEb24ndCB3b3JyeSEgVGhpcyBpcyBwcm9iYWJseSBmaW5lLiBUaGUgcGF0Y2ggd2FzIHN0aWxsIGFwcGxpZWRcclxuICBzdWNjZXNzZnVsbHkuIEhlcmUncyB0aGUgZGVldHM6XHJcblxyXG4gIFBhdGNoIGZpbGUgY3JlYXRlZCBmb3JcclxuXHJcbiAgICAke3BhY2thZ2VOYW1lfUAke2NoYWxrLmJvbGQob3JpZ2luYWxWZXJzaW9uKX1cclxuXHJcbiAgYXBwbGllZCB0b1xyXG5cclxuICAgICR7cGFja2FnZU5hbWV9QCR7Y2hhbGsuYm9sZChhY3R1YWxWZXJzaW9uKX1cclxuICBcclxuICBBdCBwYXRoXHJcbiAgXHJcbiAgICAke3BhdGh9XHJcblxyXG4gIFRoaXMgd2FybmluZyBpcyBqdXN0IHRvIGdpdmUgeW91IGEgaGVhZHMtdXAuIFRoZXJlIGlzIGEgc21hbGwgY2hhbmNlIG9mXHJcbiAgYnJlYWthZ2UgZXZlbiB0aG91Z2ggdGhlIHBhdGNoIHdhcyBhcHBsaWVkIHN1Y2Nlc3NmdWxseS4gTWFrZSBzdXJlIHRoZSBwYWNrYWdlXHJcbiAgc3RpbGwgYmVoYXZlcyBsaWtlIHlvdSBleHBlY3QgKHlvdSB3cm90ZSB0ZXN0cywgcmlnaHQ/KSBhbmQgdGhlbiBydW5cclxuXHJcbiAgICAke2NoYWxrLmJvbGQoYHBhdGNoLXBhY2thZ2UgJHtwYXRoU3BlY2lmaWVyfWApfVxyXG5cclxuICB0byB1cGRhdGUgdGhlIHZlcnNpb24gaW4gdGhlIHBhdGNoIGZpbGUgbmFtZSBhbmQgbWFrZSB0aGlzIHdhcm5pbmcgZ28gYXdheS5cclxuYFxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVCcm9rZW5QYXRjaEZpbGVFcnJvcih7XHJcbiAgcGFja2FnZU5hbWUsXHJcbiAgcGF0Y2hGaWxlbmFtZSxcclxuICBwYXRoLFxyXG4gIHBhdGhTcGVjaWZpZXIsXHJcbn06IHtcclxuICBwYWNrYWdlTmFtZTogc3RyaW5nXHJcbiAgcGF0Y2hGaWxlbmFtZTogc3RyaW5nXHJcbiAgcGF0aDogc3RyaW5nXHJcbiAgcGF0aFNwZWNpZmllcjogc3RyaW5nXHJcbn0pIHtcclxuICByZXR1cm4gYFxyXG4ke2NoYWxrLnJlZC5ib2xkKFwiKipFUlJPUioqXCIpfSAke2NoYWxrLnJlZChcclxuICAgIGBGYWlsZWQgdG8gYXBwbHkgcGF0Y2ggZm9yIHBhY2thZ2UgJHtjaGFsay5ib2xkKHBhY2thZ2VOYW1lKX0gYXQgcGF0aGAsXHJcbiAgKX1cclxuICBcclxuICAgICR7cGF0aH1cclxuXHJcbiAgVGhpcyBlcnJvciB3YXMgY2F1c2VkIGJlY2F1c2UgcGF0Y2gtcGFja2FnZSBjYW5ub3QgYXBwbHkgdGhlIGZvbGxvd2luZyBwYXRjaCBmaWxlOlxyXG5cclxuICAgIHBhdGNoZXMvJHtwYXRjaEZpbGVuYW1lfVxyXG5cclxuICBUcnkgcmVtb3Zpbmcgbm9kZV9tb2R1bGVzIGFuZCB0cnlpbmcgYWdhaW4uIElmIHRoYXQgZG9lc24ndCB3b3JrLCBtYXliZSB0aGVyZSB3YXNcclxuICBhbiBhY2NpZGVudGFsIGNoYW5nZSBtYWRlIHRvIHRoZSBwYXRjaCBmaWxlPyBUcnkgcmVjcmVhdGluZyBpdCBieSBtYW51YWxseVxyXG4gIGVkaXRpbmcgdGhlIGFwcHJvcHJpYXRlIGZpbGVzIGFuZCBydW5uaW5nOlxyXG4gIFxyXG4gICAgcGF0Y2gtcGFja2FnZSAke3BhdGhTcGVjaWZpZXJ9XHJcbiAgXHJcbiAgSWYgdGhhdCBkb2Vzbid0IHdvcmssIHRoZW4gaXQncyBhIGJ1ZyBpbiBwYXRjaC1wYWNrYWdlLCBzbyBwbGVhc2Ugc3VibWl0IGEgYnVnXHJcbiAgcmVwb3J0LiBUaGFua3MhXHJcblxyXG4gICAgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzXHJcbiAgICBcclxuYFxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVQYXRjaEFwcGxpY2F0aW9uRmFpbHVyZUVycm9yKHtcclxuICBwYWNrYWdlTmFtZSxcclxuICBhY3R1YWxWZXJzaW9uLFxyXG4gIG9yaWdpbmFsVmVyc2lvbixcclxuICBwYXRjaEZpbGVuYW1lLFxyXG4gIHBhdGgsXHJcbiAgcGF0aFNwZWNpZmllcixcclxufToge1xyXG4gIHBhY2thZ2VOYW1lOiBzdHJpbmdcclxuICBhY3R1YWxWZXJzaW9uOiBzdHJpbmdcclxuICBvcmlnaW5hbFZlcnNpb246IHN0cmluZ1xyXG4gIHBhdGNoRmlsZW5hbWU6IHN0cmluZ1xyXG4gIHBhdGg6IHN0cmluZ1xyXG4gIHBhdGhTcGVjaWZpZXI6IHN0cmluZ1xyXG59KSB7XHJcbiAgcmV0dXJuIGBcclxuJHtjaGFsay5yZWQuYm9sZChcIioqRVJST1IqKlwiKX0gJHtjaGFsay5yZWQoXHJcbiAgICBgRmFpbGVkIHRvIGFwcGx5IHBhdGNoIGZvciBwYWNrYWdlICR7Y2hhbGsuYm9sZChwYWNrYWdlTmFtZSl9IGF0IHBhdGhgLFxyXG4gICl9XHJcbiAgXHJcbiAgICAke3BhdGh9XHJcblxyXG4gIFRoaXMgZXJyb3Igd2FzIGNhdXNlZCBiZWNhdXNlICR7Y2hhbGsuYm9sZChwYWNrYWdlTmFtZSl9IGhhcyBjaGFuZ2VkIHNpbmNlIHlvdVxyXG4gIG1hZGUgdGhlIHBhdGNoIGZpbGUgZm9yIGl0LiBUaGlzIGludHJvZHVjZWQgY29uZmxpY3RzIHdpdGggeW91ciBwYXRjaCxcclxuICBqdXN0IGxpa2UgYSBtZXJnZSBjb25mbGljdCBpbiBHaXQgd2hlbiBzZXBhcmF0ZSBpbmNvbXBhdGlibGUgY2hhbmdlcyBhcmVcclxuICBtYWRlIHRvIHRoZSBzYW1lIHBpZWNlIG9mIGNvZGUuXHJcblxyXG4gIE1heWJlIHRoaXMgbWVhbnMgeW91ciBwYXRjaCBmaWxlIGlzIG5vIGxvbmdlciBuZWNlc3NhcnksIGluIHdoaWNoIGNhc2VcclxuICBob29yYXkhIEp1c3QgZGVsZXRlIGl0IVxyXG5cclxuICBPdGhlcndpc2UsIHlvdSBuZWVkIHRvIGdlbmVyYXRlIGEgbmV3IHBhdGNoIGZpbGUuXHJcblxyXG4gIFRvIGdlbmVyYXRlIGEgbmV3IG9uZSwganVzdCByZXBlYXQgdGhlIHN0ZXBzIHlvdSBtYWRlIHRvIGdlbmVyYXRlIHRoZSBmaXJzdFxyXG4gIG9uZS5cclxuXHJcbiAgaS5lLiBtYW51YWxseSBtYWtlIHRoZSBhcHByb3ByaWF0ZSBmaWxlIGNoYW5nZXMsIHRoZW4gcnVuIFxyXG5cclxuICAgIHBhdGNoLXBhY2thZ2UgJHtwYXRoU3BlY2lmaWVyfVxyXG5cclxuICBJbmZvOlxyXG4gICAgUGF0Y2ggZmlsZTogcGF0Y2hlcy8ke3BhdGNoRmlsZW5hbWV9XHJcbiAgICBQYXRjaCB3YXMgbWFkZSBmb3IgdmVyc2lvbjogJHtjaGFsay5ncmVlbi5ib2xkKG9yaWdpbmFsVmVyc2lvbil9XHJcbiAgICBJbnN0YWxsZWQgdmVyc2lvbjogJHtjaGFsay5yZWQuYm9sZChhY3R1YWxWZXJzaW9uKX1cclxuYFxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVVbmV4cGVjdGVkRXJyb3Ioe1xyXG4gIGZpbGVuYW1lLFxyXG4gIGVycm9yLFxyXG59OiB7XHJcbiAgZmlsZW5hbWU6IHN0cmluZ1xyXG4gIGVycm9yOiBFcnJvclxyXG59KSB7XHJcbiAgcmV0dXJuIGBcclxuJHtjaGFsay5yZWQuYm9sZChcIioqRVJST1IqKlwiKX0gJHtjaGFsay5yZWQoXHJcbiAgICBgRmFpbGVkIHRvIGFwcGx5IHBhdGNoIGZpbGUgJHtjaGFsay5ib2xkKGZpbGVuYW1lKX1gLFxyXG4gICl9XHJcbiAgXHJcbiR7ZXJyb3Iuc3RhY2t9XHJcblxyXG4gIGBcclxufVxyXG4iXX0=
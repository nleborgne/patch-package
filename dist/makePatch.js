"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logPatchSequenceError = exports.makePatch = void 0;
const chalk_1 = __importDefault(require("chalk"));
const console_1 = __importDefault(require("console"));
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const tmp_1 = require("tmp");
const zlib_1 = require("zlib");
const applyPatches_1 = require("./applyPatches");
const createIssue_1 = require("./createIssue");
const filterFiles_1 = require("./filterFiles");
const getPackageResolution_1 = require("./getPackageResolution");
const getPackageVersion_1 = require("./getPackageVersion");
const hash_1 = require("./hash");
const PackageDetails_1 = require("./PackageDetails");
const parse_1 = require("./patch/parse");
const patchFs_1 = require("./patchFs");
const path_1 = require("./path");
const resolveRelativeFileDependencies_1 = require("./resolveRelativeFileDependencies");
const spawnSafe_1 = require("./spawnSafe");
const stateFile_1 = require("./stateFile");
function printNoPackageFoundError(packageName, packageJsonPath) {
    console_1.default.log(`No such package ${packageName}

  File not found: ${packageJsonPath}`);
}
function makePatch({ packagePathSpecifier, appPath, packageManager, includePaths, excludePaths, patchDir, createIssue, mode, }) {
    var _a, _b, _c, _d, _e;
    const packageDetails = PackageDetails_1.getPatchDetailsFromCliString(packagePathSpecifier);
    if (!packageDetails) {
        console_1.default.log("No such package", packagePathSpecifier);
        return;
    }
    const state = stateFile_1.getPatchApplicationState(packageDetails);
    const isRebasing = (_a = state === null || state === void 0 ? void 0 : state.isRebasing) !== null && _a !== void 0 ? _a : false;
    // If we are rebasing and no patches have been applied, --append is the only valid option because
    // there are no previous patches to overwrite/update
    if (isRebasing &&
        (state === null || state === void 0 ? void 0 : state.patches.filter((p) => p.didApply).length) === 0 &&
        mode.type === "overwrite_last") {
        mode = { type: "append", name: "initial" };
    }
    if (isRebasing && state) {
        stateFile_1.verifyAppliedPatches({ appPath, patchDir, state });
    }
    if (mode.type === "overwrite_last" &&
        isRebasing &&
        (state === null || state === void 0 ? void 0 : state.patches.length) === 0) {
        mode = { type: "append", name: "initial" };
    }
    const existingPatches = patchFs_1.getGroupedPatches(patchDir).pathSpecifierToPatchFiles[packageDetails.pathSpecifier] || [];
    // apply all existing patches if appending
    // otherwise apply all but the last
    const previouslyAppliedPatches = state === null || state === void 0 ? void 0 : state.patches.filter((p) => p.didApply);
    const patchesToApplyBeforeDiffing = isRebasing
        ? mode.type === "append"
            ? existingPatches.slice(0, previouslyAppliedPatches.length)
            : state.patches[state.patches.length - 1].didApply
                ? existingPatches.slice(0, previouslyAppliedPatches.length - 1)
                : existingPatches.slice(0, previouslyAppliedPatches.length)
        : mode.type === "append"
            ? existingPatches
            : existingPatches.slice(0, -1);
    if (createIssue && mode.type === "append") {
        console_1.default.log("--create-issue is not compatible with --append.");
        process.exit(1);
    }
    if (createIssue && isRebasing) {
        console_1.default.log("--create-issue is not compatible with rebasing.");
        process.exit(1);
    }
    const numPatchesAfterCreate = mode.type === "append" || existingPatches.length === 0
        ? existingPatches.length + 1
        : existingPatches.length;
    const vcs = createIssue_1.getPackageVCSDetails(packageDetails);
    const canCreateIssue = !isRebasing &&
        createIssue_1.shouldRecommendIssue(vcs) &&
        numPatchesAfterCreate === 1 &&
        mode.type !== "append";
    const appPackageJson = require(path_1.join(appPath, "package.json"));
    const packagePath = path_1.join(appPath, packageDetails.path);
    const packageJsonPath = path_1.join(packagePath, "package.json");
    if (!fs_extra_1.existsSync(packageJsonPath)) {
        printNoPackageFoundError(packagePathSpecifier, packageJsonPath);
        process.exit(1);
    }
    const tmpRepo = tmp_1.dirSync({ unsafeCleanup: true });
    const tmpRepoPackagePath = path_1.join(tmpRepo.name, packageDetails.path);
    const tmpRepoNpmRoot = tmpRepoPackagePath.slice(0, -`/node_modules/${packageDetails.name}`.length);
    const tmpRepoPackageJsonPath = path_1.join(tmpRepoNpmRoot, "package.json");
    try {
        const patchesDir = path_1.resolve(path_1.join(appPath, patchDir));
        console_1.default.info(chalk_1.default.grey("•"), "Creating temporary folder");
        // make a blank package.json
        fs_extra_1.mkdirpSync(tmpRepoNpmRoot);
        fs_extra_1.writeFileSync(tmpRepoPackageJsonPath, JSON.stringify({
            dependencies: {
                [packageDetails.name]: getPackageResolution_1.getPackageResolution({
                    packageDetails,
                    packageManager,
                    appPath,
                }),
            },
            resolutions: resolveRelativeFileDependencies_1.resolveRelativeFileDependencies(appPath, appPackageJson.resolutions || {}),
        }));
        const packageVersion = getPackageVersion_1.getPackageVersion(path_1.join(path_1.resolve(packageDetails.path), "package.json"));
        [".npmrc", ".yarnrc", ".yarn"].forEach((rcFile) => {
            const rcPath = path_1.join(appPath, rcFile);
            if (fs_extra_1.existsSync(rcPath)) {
                fs_extra_1.copySync(rcPath, path_1.join(tmpRepo.name, rcFile), { dereference: true });
            }
        });
        if (packageManager === "yarn") {
            console_1.default.info(chalk_1.default.grey("•"), `Installing ${packageDetails.name}@${packageVersion} with yarn`);
            try {
                // try first without ignoring scripts in case they are required
                // this works in 99.99% of cases
                spawnSafe_1.spawnSafeSync(`yarn`, ["install", "--ignore-engines"], {
                    cwd: tmpRepoNpmRoot,
                    logStdErrOnError: false,
                });
            }
            catch (e) {
                // try again while ignoring scripts in case the script depends on
                // an implicit context which we haven't reproduced
                spawnSafe_1.spawnSafeSync(`yarn`, ["install", "--ignore-engines", "--ignore-scripts"], {
                    cwd: tmpRepoNpmRoot,
                });
            }
        }
        else {
            console_1.default.info(chalk_1.default.grey("•"), `Installing ${packageDetails.name}@${packageVersion} with npm`);
            try {
                // try first without ignoring scripts in case they are required
                // this works in 99.99% of cases
                spawnSafe_1.spawnSafeSync(`npm`, ["i", "--force"], {
                    cwd: tmpRepoNpmRoot,
                    logStdErrOnError: false,
                    stdio: "ignore",
                });
            }
            catch (e) {
                // try again while ignoring scripts in case the script depends on
                // an implicit context which we haven't reproduced
                spawnSafe_1.spawnSafeSync(`npm`, ["i", "--ignore-scripts", "--force"], {
                    cwd: tmpRepoNpmRoot,
                    stdio: "ignore",
                });
            }
        }
        const git = (...args) => spawnSafe_1.spawnSafeSync("git", args, {
            cwd: tmpRepo.name,
            env: Object.assign(Object.assign({}, process.env), { HOME: tmpRepo.name }),
            maxBuffer: 1024 * 1024 * 100,
        });
        // remove nested node_modules just to be safe
        fs_extra_1.removeSync(path_1.join(tmpRepoPackagePath, "node_modules"));
        // remove .git just to be safe
        fs_extra_1.removeSync(path_1.join(tmpRepoPackagePath, ".git"));
        // remove patch-package state file
        fs_extra_1.removeSync(path_1.join(tmpRepoPackagePath, stateFile_1.STATE_FILE_NAME));
        // commit the package
        console_1.default.info(chalk_1.default.grey("•"), "Diffing your files with clean files");
        fs_extra_1.writeFileSync(path_1.join(tmpRepo.name, ".gitignore"), "!/node_modules\n\n");
        git("init");
        git("config", "--local", "user.name", "patch-package");
        git("config", "--local", "user.email", "patch@pack.age");
        // remove ignored files first
        filterFiles_1.removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths);
        for (const patchDetails of patchesToApplyBeforeDiffing) {
            if (!applyPatches_1.applyPatch({
                patchDetails,
                patchDir,
                patchFilePath: path_1.join(appPath, patchDir, patchDetails.patchFilename),
                reverse: false,
                cwd: tmpRepo.name,
                bestEffort: false,
            })) {
                // TODO: add better error message once --rebase is implemented
                console_1.default.log(`Failed to apply patch ${patchDetails.patchFilename} to ${packageDetails.pathSpecifier}`);
                process.exit(1);
            }
        }
        git("add", "-f", packageDetails.path);
        git("commit", "--allow-empty", "-m", "init");
        // replace package with user's version
        fs_extra_1.removeSync(tmpRepoPackagePath);
        // pnpm installs packages as symlinks, copySync would copy only the symlink
        fs_extra_1.copySync(fs_extra_1.realpathSync(packagePath), tmpRepoPackagePath);
        // remove nested node_modules just to be safe
        fs_extra_1.removeSync(path_1.join(tmpRepoPackagePath, "node_modules"));
        // remove .git just to be safe
        fs_extra_1.removeSync(path_1.join(tmpRepoPackagePath, ".git"));
        // remove patch-package state file
        fs_extra_1.removeSync(path_1.join(tmpRepoPackagePath, stateFile_1.STATE_FILE_NAME));
        // also remove ignored files like before
        filterFiles_1.removeIgnoredFiles(tmpRepoPackagePath, includePaths, excludePaths);
        // stage all files
        git("add", "-f", packageDetails.path);
        // get diff of changes
        const diffResult = git("diff", "--cached", "--no-color", "--ignore-space-at-eol", "--no-ext-diff", "--src-prefix=a/", "--dst-prefix=b/");
        if (diffResult.stdout.length === 0) {
            console_1.default.log(`⁉️  Not creating patch file for package '${packagePathSpecifier}'`);
            console_1.default.log(`⁉️  There don't appear to be any changes.`);
            if (isRebasing && mode.type === "overwrite_last") {
                console_1.default.log("\n💡 To remove a patch file, delete it and then reinstall node_modules from scratch.");
            }
            process.exit(1);
            return;
        }
        try {
            parse_1.parsePatchFile(diffResult.stdout.toString());
        }
        catch (e) {
            if (e.message.includes("Unexpected file mode string: 120000")) {
                console_1.default.log(`
⛔️ ${chalk_1.default.red.bold("ERROR")}

  Your changes involve creating symlinks. patch-package does not yet support
  symlinks.
  
  ️Please use ${chalk_1.default.bold("--include")} and/or ${chalk_1.default.bold("--exclude")} to narrow the scope of your patch if
  this was unintentional.
`);
            }
            else {
                const outPath = "./patch-package-error.json.gz";
                fs_extra_1.writeFileSync(outPath, zlib_1.gzipSync(JSON.stringify({
                    error: { message: e.message, stack: e.stack },
                    patch: diffResult.stdout.toString(),
                })));
                console_1.default.log(`
⛔️ ${chalk_1.default.red.bold("ERROR")}
        
  patch-package was unable to read the patch-file made by git. This should not
  happen.
  
  A diagnostic file was written to
  
    ${outPath}
  
  Please attach it to a github issue
  
    https://github.com/ds300/patch-package/issues/new?title=New+patch+parse+failed&body=Please+attach+the+diagnostic+file+by+dragging+it+into+here+🙏
  
  Note that this diagnostic file will contain code from the package you were
  attempting to patch.

`);
            }
            process.exit(1);
            return;
        }
        // maybe delete existing
        if (mode.type === "append" && !isRebasing && existingPatches.length === 1) {
            // if we are appending to an existing patch that doesn't have a sequence number let's rename it
            const prevPatch = existingPatches[0];
            if (prevPatch.sequenceNumber === undefined) {
                const newFileName = createPatchFileName({
                    packageDetails,
                    packageVersion,
                    sequenceNumber: 1,
                    sequenceName: (_b = prevPatch.sequenceName) !== null && _b !== void 0 ? _b : "initial",
                });
                const oldPath = path_1.join(appPath, patchDir, prevPatch.patchFilename);
                const newPath = path_1.join(appPath, patchDir, newFileName);
                fs_1.renameSync(oldPath, newPath);
                prevPatch.sequenceNumber = 1;
                prevPatch.patchFilename = newFileName;
                prevPatch.sequenceName = (_c = prevPatch.sequenceName) !== null && _c !== void 0 ? _c : "initial";
            }
        }
        const lastPatch = existingPatches[state ? state.patches.length - 1 : existingPatches.length - 1];
        const sequenceName = mode.type === "append" ? mode.name : lastPatch === null || lastPatch === void 0 ? void 0 : lastPatch.sequenceName;
        const sequenceNumber = mode.type === "append"
            ? ((_d = lastPatch === null || lastPatch === void 0 ? void 0 : lastPatch.sequenceNumber) !== null && _d !== void 0 ? _d : 0) + 1
            : lastPatch === null || lastPatch === void 0 ? void 0 : lastPatch.sequenceNumber;
        const patchFileName = createPatchFileName({
            packageDetails,
            packageVersion,
            sequenceName,
            sequenceNumber,
        });
        const patchPath = path_1.join(patchesDir, patchFileName);
        if (!fs_extra_1.existsSync(path_1.dirname(patchPath))) {
            // scoped package
            fs_extra_1.mkdirSync(path_1.dirname(patchPath));
        }
        // if we are inserting a new patch into a sequence we most likely need to update the sequence numbers
        if (isRebasing && mode.type === "append") {
            const patchesToNudge = existingPatches.slice(state.patches.length);
            if (sequenceNumber === undefined) {
                throw new Error("sequenceNumber is undefined while rebasing");
            }
            if (((_e = patchesToNudge[0]) === null || _e === void 0 ? void 0 : _e.sequenceNumber) !== undefined &&
                patchesToNudge[0].sequenceNumber <= sequenceNumber) {
                let next = sequenceNumber + 1;
                for (const p of patchesToNudge) {
                    const newName = createPatchFileName({
                        packageDetails,
                        packageVersion,
                        sequenceName: p.sequenceName,
                        sequenceNumber: next++,
                    });
                    console_1.default.log("Renaming", chalk_1.default.bold(p.patchFilename), "to", chalk_1.default.bold(newName));
                    const oldPath = path_1.join(appPath, patchDir, p.patchFilename);
                    const newPath = path_1.join(appPath, patchDir, newName);
                    fs_1.renameSync(oldPath, newPath);
                }
            }
        }
        fs_extra_1.writeFileSync(patchPath, diffResult.stdout);
        console_1.default.log(`${chalk_1.default.green("✔")} Created file ${path_1.join(patchDir, patchFileName)}\n`);
        const prevState = patchesToApplyBeforeDiffing.map((p) => ({
            patchFilename: p.patchFilename,
            didApply: true,
            patchContentHash: hash_1.hashFile(path_1.join(appPath, patchDir, p.patchFilename)),
        }));
        const nextState = [
            ...prevState,
            {
                patchFilename: patchFileName,
                didApply: true,
                patchContentHash: hash_1.hashFile(patchPath),
            },
        ];
        // if any patches come after this one we just made, we should reapply them
        let didFailWhileFinishingRebase = false;
        if (isRebasing) {
            const currentPatches = patchFs_1.getGroupedPatches(path_1.join(appPath, patchDir))
                .pathSpecifierToPatchFiles[packageDetails.pathSpecifier];
            const previouslyUnappliedPatches = currentPatches.slice(nextState.length);
            if (previouslyUnappliedPatches.length) {
                console_1.default.log(`Fast forwarding...`);
                for (const patch of previouslyUnappliedPatches) {
                    const patchFilePath = path_1.join(appPath, patchDir, patch.patchFilename);
                    if (!applyPatches_1.applyPatch({
                        patchDetails: patch,
                        patchDir,
                        patchFilePath,
                        reverse: false,
                        cwd: process.cwd(),
                        bestEffort: false,
                    })) {
                        didFailWhileFinishingRebase = true;
                        logPatchSequenceError({ patchDetails: patch });
                        nextState.push({
                            patchFilename: patch.patchFilename,
                            didApply: false,
                            patchContentHash: hash_1.hashFile(patchFilePath),
                        });
                        break;
                    }
                    else {
                        console_1.default.log(`  ${chalk_1.default.green("✔")} ${patch.patchFilename}`);
                        nextState.push({
                            patchFilename: patch.patchFilename,
                            didApply: true,
                            patchContentHash: hash_1.hashFile(patchFilePath),
                        });
                    }
                }
            }
        }
        if (isRebasing || numPatchesAfterCreate > 1) {
            stateFile_1.savePatchApplicationState({
                packageDetails,
                patches: nextState,
                isRebasing: didFailWhileFinishingRebase,
            });
        }
        else {
            stateFile_1.clearPatchApplicationState(packageDetails);
        }
        if (canCreateIssue) {
            if (createIssue) {
                createIssue_1.openIssueCreationLink({
                    packageDetails,
                    patchFileContents: diffResult.stdout.toString(),
                    packageVersion,
                    patchPath,
                });
            }
            else {
                createIssue_1.maybePrintIssueCreationPrompt(vcs, packageDetails, packageManager);
            }
        }
    }
    catch (e) {
        console_1.default.log(e);
        throw e;
    }
    finally {
        tmpRepo.removeCallback();
    }
}
exports.makePatch = makePatch;
function createPatchFileName({ packageDetails, packageVersion, sequenceNumber, sequenceName, }) {
    const packageNames = packageDetails.packageNames
        .map((name) => name.replace(/\//g, "+"))
        .join("++");
    const nameAndVersion = `${packageNames}+${packageVersion}`;
    const num = sequenceNumber === undefined
        ? ""
        : `+${sequenceNumber.toString().padStart(3, "0")}`;
    const name = !sequenceName ? "" : `+${sequenceName}`;
    return `${nameAndVersion}${num}${name}.patch`;
}
function logPatchSequenceError({ patchDetails, }) {
    console_1.default.log(`
${chalk_1.default.red.bold("⛔ ERROR")}

Failed to apply patch file ${chalk_1.default.bold(patchDetails.patchFilename)}.

If this patch file is no longer useful, delete it and run

  ${chalk_1.default.bold(`patch-package`)}

To partially apply the patch (if possible) and output a log of errors to fix, run

  ${chalk_1.default.bold(`patch-package --partial`)}

After which you should make any required changes inside ${patchDetails.path}, and finally run

  ${chalk_1.default.bold(`patch-package ${patchDetails.pathSpecifier}`)}

to update the patch file.
`);
}
exports.logPatchSequenceError = logPatchSequenceError;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFrZVBhdGNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL21ha2VQYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrREFBeUI7QUFDekIsc0RBQTZCO0FBQzdCLDJCQUErQjtBQUMvQix1Q0FRaUI7QUFDakIsNkJBQTZCO0FBQzdCLCtCQUErQjtBQUMvQixpREFBMkM7QUFDM0MsK0NBS3NCO0FBRXRCLCtDQUFrRDtBQUNsRCxpRUFBNkQ7QUFDN0QsMkRBQXVEO0FBQ3ZELGlDQUFpQztBQUNqQyxxREFJeUI7QUFDekIseUNBQThDO0FBQzlDLHVDQUE2QztBQUM3QyxpQ0FBK0M7QUFDL0MsdUZBQW1GO0FBQ25GLDJDQUEyQztBQUMzQywyQ0FPb0I7QUFFcEIsU0FBUyx3QkFBd0IsQ0FDL0IsV0FBbUIsRUFDbkIsZUFBdUI7SUFFdkIsaUJBQU8sQ0FBQyxHQUFHLENBQ1QsbUJBQW1CLFdBQVc7O29CQUVkLGVBQWUsRUFBRSxDQUNsQyxDQUFBO0FBQ0gsQ0FBQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxFQUN4QixvQkFBb0IsRUFDcEIsT0FBTyxFQUNQLGNBQWMsRUFDZCxZQUFZLEVBQ1osWUFBWSxFQUNaLFFBQVEsRUFDUixXQUFXLEVBQ1gsSUFBSSxHQVVMOztJQUNDLE1BQU0sY0FBYyxHQUFHLDZDQUE0QixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFFekUsSUFBSSxDQUFDLGNBQWMsRUFBRTtRQUNuQixpQkFBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3BELE9BQU07S0FDUDtJQUVELE1BQU0sS0FBSyxHQUFHLG9DQUF3QixDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3RELE1BQU0sVUFBVSxHQUFHLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFVBQVUsbUNBQUksS0FBSyxDQUFBO0lBRTdDLGlHQUFpRztJQUNqRyxvREFBb0Q7SUFDcEQsSUFDRSxV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QXlCLENBQUM7OzBEQUdyQyxZQUFZLENBQUMsSUFDZjs7SUFFRSxlQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixZQUFZLENBQUMsYUFBYSxFQUFFLENBQUM7OztDQUc1RCxDQUFDLENBQUE7QUFDRixDQUFDO0FBMUJELHNEQTBCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tIFwiY2hhbGtcIlxyXG5pbXBvcnQgY29uc29sZSBmcm9tIFwiY29uc29sZVwiXHJcbmltcG9ydCB7IHJlbmFtZVN5bmMgfSBmcm9tIFwiZnNcIlxyXG5pbXBvcnQge1xyXG4gIGNvcHlTeW5jLFxyXG4gIGV4aXN0c1N5bmMsXHJcbiAgbWtkaXJwU3luYyxcclxuICBta2RpclN5bmMsXHJcbiAgcmVhbHBhdGhTeW5jLFxyXG4gIHJlbW92ZVN5bmMsXHJcbiAgd3JpdGVGaWxlU3luYyxcclxufSBmcm9tIFwiZnMtZXh0cmFcIlxyXG5pbXBvcnQgeyBkaXJTeW5jIH0gZnJvbSBcInRtcFwiXHJcbmltcG9ydCB7IGd6aXBTeW5jIH0gZnJvbSBcInpsaWJcIlxyXG5pbXBvcnQgeyBhcHBseVBhdGNoIH0gZnJvbSBcIi4vYXBwbHlQYXRjaGVzXCJcclxuaW1wb3J0IHtcclxuICBnZXRQYWNrYWdlVkNTRGV0YWlscyxcclxuICBtYXliZVByaW50SXNzdWVDcmVhdGlvblByb21wdCxcclxuICBvcGVuSXNzdWVDcmVhdGlvbkxpbmssXHJcbiAgc2hvdWxkUmVjb21tZW5kSXNzdWUsXHJcbn0gZnJvbSBcIi4vY3JlYXRlSXNzdWVcIlxyXG5pbXBvcnQgeyBQYWNrYWdlTWFuYWdlciB9IGZyb20gXCIuL2RldGVjdFBhY2thZ2VNYW5hZ2VyXCJcclxuaW1wb3J0IHsgcmVtb3ZlSWdub3JlZEZpbGVzIH0gZnJvbSBcIi4vZmlsdGVyRmlsZXNcIlxyXG5pbXBvcnQgeyBnZXRQYWNrYWdlUmVzb2x1dGlvbiB9IGZyb20gXCIuL2dldFBhY2thZ2VSZXNvbHV0aW9uXCJcclxuaW1wb3J0IHsgZ2V0UGFja2FnZVZlcnNpb24gfSBmcm9tIFwiLi9nZXRQYWNrYWdlVmVyc2lvblwiXHJcbmltcG9ydCB7IGhhc2hGaWxlIH0gZnJvbSBcIi4vaGFzaFwiXHJcbmltcG9ydCB7XHJcbiAgZ2V0UGF0Y2hEZXRhaWxzRnJvbUNsaVN0cmluZyxcclxuICBQYWNrYWdlRGV0YWlscyxcclxuICBQYXRjaGVkUGFja2FnZURldGFpbHMsXHJcbn0gZnJvbSBcIi4vUGFja2FnZURldGFpbHNcIlxyXG5pbXBvcnQgeyBwYXJzZVBhdGNoRmlsZSB9IGZyb20gXCIuL3BhdGNoL3BhcnNlXCJcclxuaW1wb3J0IHsgZ2V0R3JvdXBlZFBhdGNoZXMgfSBmcm9tIFwiLi9wYXRjaEZzXCJcclxuaW1wb3J0IHsgZGlybmFtZSwgam9pbiwgcmVzb2x2ZSB9IGZyb20gXCIuL3BhdGhcIlxyXG5pbXBvcnQgeyByZXNvbHZlUmVsYXRpdmVGaWxlRGVwZW5kZW5jaWVzIH0gZnJvbSBcIi4vcmVzb2x2ZVJlbGF0aXZlRmlsZURlcGVuZGVuY2llc1wiXHJcbmltcG9ydCB7IHNwYXduU2FmZVN5bmMgfSBmcm9tIFwiLi9zcGF3blNhZmVcIlxyXG5pbXBvcnQge1xyXG4gIGNsZWFyUGF0Y2hBcHBsaWNhdGlvblN0YXRlLFxyXG4gIGdldFBhdGNoQXBwbGljYXRpb25TdGF0ZSxcclxuICBQYXRjaFN0YXRlLFxyXG4gIHNhdmVQYXRjaEFwcGxpY2F0aW9uU3RhdGUsXHJcbiAgU1RBVEVfRklMRV9OQU1FLFxyXG4gIHZlcmlmeUFwcGxpZWRQYXRjaGVzLFxyXG59IGZyb20gXCIuL3N0YXRlRmlsZVwiXHJcblxyXG5mdW5jdGlvbiBwcmludE5vUGFja2FnZUZvdW5kRXJyb3IoXHJcbiAgcGFja2FnZU5hbWU6IHN0cmluZyxcclxuICBwYWNrYWdlSnNvblBhdGg6IHN0cmluZyxcclxuKSB7XHJcbiAgY29uc29sZS5sb2coXHJcbiAgICBgTm8gc3VjaCBwYWNrYWdlICR7cGFja2FnZU5hbWV9XHJcblxyXG4gIEZpbGUgbm90IGZvdW5kOiAke3BhY2thZ2VKc29uUGF0aH1gLFxyXG4gIClcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIG1ha2VQYXRjaCh7XHJcbiAgcGFja2FnZVBhdGhTcGVjaWZpZXIsXHJcbiAgYXBwUGF0aCxcclxuICBwYWNrYWdlTWFuYWdlcixcclxuICBpbmNsdWRlUGF0aHMsXHJcbiAgZXhjbHVkZVBhdGhzLFxyXG4gIHBhdGNoRGlyLFxyXG4gIGNyZWF0ZUlzc3VlLFxyXG4gIG1vZGUsXHJcbn06IHtcclxuICBwYWNrYWdlUGF0aFNwZWNpZmllcjogc3RyaW5nXHJcbiAgYXBwUGF0aDogc3RyaW5nXHJcbiAgcGFja2FnZU1hbmFnZXI6IFBhY2thZ2VNYW5hZ2VyXHJcbiAgaW5jbHVkZVBhdGhzOiBSZWdFeHBcclxuICBleGNsdWRlUGF0aHM6IFJlZ0V4cFxyXG4gIHBhdGNoRGlyOiBzdHJpbmdcclxuICBjcmVhdGVJc3N1ZTogYm9vbGVhblxyXG4gIG1vZGU6IHsgdHlwZTogXCJvdmVyd3JpdGVfbGFzdFwiIH0gfCB7IHR5cGU6IFwiYXBwZW5kXCI7IG5hbWU/OiBzdHJpbmcgfVxyXG59KSB7XHJcbiAgY29uc3QgcGFja2FnZURldGFpbHMgPSBnZXRQYXRjaERldGFpbHNGcm9tQ2xpU3RyaW5nKHBhY2thZ2VQYXRoU3BlY2lmaWVyKVxyXG5cclxuICBpZiAoIXBhY2thZ2VEZXRhaWxzKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcIk5vIHN1Y2ggcGFja2FnZVwiLCBwYWNrYWdlUGF0aFNwZWNpZmllcilcclxuICAgIHJldHVyblxyXG4gIH1cclxuXHJcbiAgY29uc3Qgc3RhdGUgPSBnZXRQYXRjaEFwcGxpY2F0aW9uU3RhdGUocGFja2FnZURldGFpbHMpXHJcbiAgY29uc3QgaXNSZWJhc2luZyA9IHN0YXRlPy5pc1JlYmFzaW5nID8/IGZhbHNlXHJcblxyXG4gIC8vIElmIHdlIGFyZSByZWJhc2luZyBhbmQgbm8gcGF0Y2hlcyBoYXZlIGJlZW4gYXBwbGllZCwgLS1hcHBlbmQgaXMgdGhlIG9ubHkgdmFsaWQgb3B0aW9uIGJlY2F1c2VcclxuICAvLyB0aGVyZSBhcmUgbm8gcHJldmlvdXMgcGF0Y2hlcyB0byBvdmVyd3JpdGUvdXBkYXRlXHJcbiAgaWYgKFxyXG4gICAgaXNSZWJhc2luZyAmJlxyXG4gICAgc3RhdGU/LnBhdGNoZXMuZmlsdGVyKChwKSA9PiBwLmRpZEFwcGx5KS5sZW5ndGggPT09IDAgJiZcclxuICAgIG1vZGUudHlwZSA9PT0gXCJvdmVyd3JpdGVfbGFzdFwiXHJcbiAgKSB7XHJcbiAgICBtb2RlID0geyB0eXBlOiBcImFwcGVuZFwiLCBuYW1lOiBcImluaXRpYWxcIiB9XHJcbiAgfVxyXG5cclxuICBpZiAoaXNSZWJhc2luZyAmJiBzdGF0ZSkge1xyXG4gICAgdmVyaWZ5QXBwbGllZFBhdGNoZXMoeyBhcHBQYXRoLCBwYXRjaERpciwgc3RhdGUgfSlcclxuICB9XHJcblxyXG4gIGlmIChcclxuICAgIG1vZGUudHlwZSA9PT0gXCJvdmVyd3JpdGVfbGFzdFwiICYmXHJcbiAgICBpc1JlYmFzaW5nICYmXHJcbiAgICBzdGF0ZT8ucGF0Y2hlcy5sZW5ndGggPT09IDBcclxuICApIHtcclxuICAgIG1vZGUgPSB7IHR5cGU6IFwiYXBwZW5kXCIsIG5hbWU6IFwiaW5pdGlhbFwiIH1cclxuICB9XHJcblxyXG4gIGNvbnN0IGV4aXN0aW5nUGF0Y2hlcyA9XHJcbiAgICBnZXRHcm91cGVkUGF0Y2hlcyhwYXRjaERpcikucGF0aFNwZWNpZmllclRvUGF0Y2hGaWxlc1tcclxuICAgICAgcGFja2FnZURldGFpbHMucGF0aFNwZWNpZmllclxyXG4gICAgXSB8fCBbXVxyXG5cclxuICAvLyBhcHBseSBhbGwgZXhpc3RpbmcgcGF0Y2hlcyBpZiBhcHBlbmRpbmdcclxuICAvLyBvdGhlcndpc2UgYXBwbHkgYWxsIGJ1dCB0aGUgbGFzdFxyXG4gIGNvbnN0IHByZXZpb3VzbHlBcHBsaWVkUGF0Y2hlcyA9IHN0YXRlPy5wYXRjaGVzLmZpbHRlcigocCkgPT4gcC5kaWRBcHBseSlcclxuICBjb25zdCBwYXRjaGVzVG9BcHBseUJlZm9yZURpZmZpbmc6IFBhdGNoZWRQYWNrYWdlRGV0YWlsc1tdID0gaXNSZWJhc2luZ1xyXG4gICAgPyBtb2RlLnR5cGUgPT09IFwiYXBwZW5kXCJcclxuICAgICAgPyBleGlzdGluZ1BhdGNoZXMuc2xpY2UoMCwgcHJldmlvdXNseUFwcGxpZWRQYXRjaGVzIS5sZW5ndGgpXHJcbiAgICAgIDogc3RhdGUhLnBhdGNoZXNbc3RhdGUhLnBhdGNoZXMubGVuZ3RoIC0gMV0uZGlkQXBwbHlcclxuICAgICAgPyBleGlzdGluZ1BhdGNoZXMuc2xpY2UoMCwgcHJldmlvdXNseUFwcGxpZWRQYXRjaGVzIS5sZW5ndGggLSAxKVxyXG4gICAgICA6IGV4aXN0aW5nUGF0Y2hlcy5zbGljZSgwLCBwcmV2aW91c2x5QXBwbGllZFBhdGNoZXMhLmxlbmd0aClcclxuICAgIDogbW9kZS50eXBlID09PSBcImFwcGVuZFwiXHJcbiAgICA/IGV4aXN0aW5nUGF0Y2hlc1xyXG4gICAgOiBleGlzdGluZ1BhdGNoZXMuc2xpY2UoMCwgLTEpXHJcblxyXG4gIGlmIChjcmVhdGVJc3N1ZSAmJiBtb2RlLnR5cGUgPT09IFwiYXBwZW5kXCIpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiLS1jcmVhdGUtaXNzdWUgaXMgbm90IGNvbXBhdGlibGUgd2l0aCAtLWFwcGVuZC5cIilcclxuICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gIH1cclxuXHJcbiAgaWYgKGNyZWF0ZUlzc3VlICYmIGlzUmViYXNpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKFwiLS1jcmVhdGUtaXNzdWUgaXMgbm90IGNvbXBhdGlibGUgd2l0aCByZWJhc2luZy5cIilcclxuICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gIH1cclxuXHJcbiAgY29uc3QgbnVtUGF0Y2hlc0FmdGVyQ3JlYXRlID1cclxuICAgIG1vZGUudHlwZSA9PT0gXCJhcHBlbmRcIiB8fCBleGlzdGluZ1BhdGNoZXMubGVuZ3RoID09PSAwXHJcbiAgICAgID8gZXhpc3RpbmdQYXRjaGVzLmxlbmd0aCArIDFcclxuICAgICAgOiBleGlzdGluZ1BhdGNoZXMubGVuZ3RoXHJcbiAgY29uc3QgdmNzID0gZ2V0UGFja2FnZVZDU0RldGFpbHMocGFja2FnZURldGFpbHMpXHJcbiAgY29uc3QgY2FuQ3JlYXRlSXNzdWUgPVxyXG4gICAgIWlzUmViYXNpbmcgJiZcclxuICAgIHNob3VsZFJlY29tbWVuZElzc3VlKHZjcykgJiZcclxuICAgIG51bVBhdGNoZXNBZnRlckNyZWF0ZSA9PT0gMSAmJlxyXG4gICAgbW9kZS50eXBlICE9PSBcImFwcGVuZFwiXHJcblxyXG4gIGNvbnN0IGFwcFBhY2thZ2VKc29uID0gcmVxdWlyZShqb2luKGFwcFBhdGgsIFwicGFja2FnZS5qc29uXCIpKVxyXG4gIGNvbnN0IHBhY2thZ2VQYXRoID0gam9pbihhcHBQYXRoLCBwYWNrYWdlRGV0YWlscy5wYXRoKVxyXG4gIGNvbnN0IHBhY2thZ2VKc29uUGF0aCA9IGpvaW4ocGFja2FnZVBhdGgsIFwicGFja2FnZS5qc29uXCIpXHJcblxyXG4gIGlmICghZXhpc3RzU3luYyhwYWNrYWdlSnNvblBhdGgpKSB7XHJcbiAgICBwcmludE5vUGFja2FnZUZvdW5kRXJyb3IocGFja2FnZVBhdGhTcGVjaWZpZXIsIHBhY2thZ2VKc29uUGF0aClcclxuICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gIH1cclxuXHJcbiAgY29uc3QgdG1wUmVwbyA9IGRpclN5bmMoeyB1bnNhZmVDbGVhbnVwOiB0cnVlIH0pXHJcbiAgY29uc3QgdG1wUmVwb1BhY2thZ2VQYXRoID0gam9pbih0bXBSZXBvLm5hbWUsIHBhY2thZ2VEZXRhaWxzLnBhdGgpXHJcbiAgY29uc3QgdG1wUmVwb05wbVJvb3QgPSB0bXBSZXBvUGFja2FnZVBhdGguc2xpY2UoXHJcbiAgICAwLFxyXG4gICAgLWAvbm9kZV9tb2R1bGVzLyR7cGFja2FnZURldGFpbHMubmFtZX1gLmxlbmd0aCxcclxuICApXHJcblxyXG4gIGNvbnN0IHRtcFJlcG9QYWNrYWdlSnNvblBhdGggPSBqb2luKHRtcFJlcG9OcG1Sb290LCBcInBhY2thZ2UuanNvblwiKVxyXG5cclxuICB0cnkge1xyXG4gICAgY29uc3QgcGF0Y2hlc0RpciA9IHJlc29sdmUoam9pbihhcHBQYXRoLCBwYXRjaERpcikpXHJcblxyXG4gICAgY29uc29sZS5pbmZvKGNoYWxrLmdyZXkoXCLigKJcIiksIFwiQ3JlYXRpbmcgdGVtcG9yYXJ5IGZvbGRlclwiKVxyXG5cclxuICAgIC8vIG1ha2UgYSBibGFuayBwYWNrYWdlLmpzb25cclxuICAgIG1rZGlycFN5bmModG1wUmVwb05wbVJvb3QpXHJcbiAgICB3cml0ZUZpbGVTeW5jKFxyXG4gICAgICB0bXBSZXBvUGFja2FnZUpzb25QYXRoLFxyXG4gICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZGVwZW5kZW5jaWVzOiB7XHJcbiAgICAgICAgICBbcGFja2FnZURldGFpbHMubmFtZV06IGdldFBhY2thZ2VSZXNvbHV0aW9uKHtcclxuICAgICAgICAgICAgcGFja2FnZURldGFpbHMsXHJcbiAgICAgICAgICAgIHBhY2thZ2VNYW5hZ2VyLFxyXG4gICAgICAgICAgICBhcHBQYXRoLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZXNvbHV0aW9uczogcmVzb2x2ZVJlbGF0aXZlRmlsZURlcGVuZGVuY2llcyhcclxuICAgICAgICAgIGFwcFBhdGgsXHJcbiAgICAgICAgICBhcHBQYWNrYWdlSnNvbi5yZXNvbHV0aW9ucyB8fCB7fSxcclxuICAgICAgICApLFxyXG4gICAgICB9KSxcclxuICAgIClcclxuXHJcbiAgICBjb25zdCBwYWNrYWdlVmVyc2lvbiA9IGdldFBhY2thZ2VWZXJzaW9uKFxyXG4gICAgICBqb2luKHJlc29sdmUocGFja2FnZURldGFpbHMucGF0aCksIFwicGFja2FnZS5qc29uXCIpLFxyXG4gICAgKVxyXG5cclxuICAgIC8vIGNvcHkgLm5wbXJjLy55YXJucmMgaW4gY2FzZSBwYWNrYWdlcyBhcmUgaG9zdGVkIGluIHByaXZhdGUgcmVnaXN0cnlcclxuICAgIC8vIGNvcHkgLnlhcm4gZGlyZWN0b3J5IGFzIHdlbGwgdG8gZW5zdXJlIGluc3RhbGxhdGlvbnMgd29yayBpbiB5YXJuIDJcclxuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTphbGlnblxyXG4gICAgO1tcIi5ucG1yY1wiLCBcIi55YXJucmNcIiwgXCIueWFyblwiXS5mb3JFYWNoKChyY0ZpbGUpID0+IHtcclxuICAgICAgY29uc3QgcmNQYXRoID0gam9pbihhcHBQYXRoLCByY0ZpbGUpXHJcbiAgICAgIGlmIChleGlzdHNTeW5jKHJjUGF0aCkpIHtcclxuICAgICAgICBjb3B5U3luYyhyY1BhdGgsIGpvaW4odG1wUmVwby5uYW1lLCByY0ZpbGUpLCB7IGRlcmVmZXJlbmNlOiB0cnVlIH0pXHJcbiAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gICAgaWYgKHBhY2thZ2VNYW5hZ2VyID09PSBcInlhcm5cIikge1xyXG4gICAgICBjb25zb2xlLmluZm8oXHJcbiAgICAgICAgY2hhbGsuZ3JleShcIuKAolwiKSxcclxuICAgICAgICBgSW5zdGFsbGluZyAke3BhY2thZ2VEZXRhaWxzLm5hbWV9QCR7cGFja2FnZVZlcnNpb259IHdpdGggeWFybmAsXHJcbiAgICAgIClcclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyB0cnkgZmlyc3Qgd2l0aG91dCBpZ25vcmluZyBzY3JpcHRzIGluIGNhc2UgdGhleSBhcmUgcmVxdWlyZWRcclxuICAgICAgICAvLyB0aGlzIHdvcmtzIGluIDk5Ljk5JSBvZiBjYXNlc1xyXG4gICAgICAgIHNwYXduU2FmZVN5bmMoYHlhcm5gLCBbXCJpbnN0YWxsXCIsIFwiLS1pZ25vcmUtZW5naW5lc1wiXSwge1xyXG4gICAgICAgICAgY3dkOiB0bXBSZXBvTnBtUm9vdCxcclxuICAgICAgICAgIGxvZ1N0ZEVyck9uRXJyb3I6IGZhbHNlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAvLyB0cnkgYWdhaW4gd2hpbGUgaWdub3Jpbmcgc2NyaXB0cyBpbiBjYXNlIHRoZSBzY3JpcHQgZGVwZW5kcyBvblxyXG4gICAgICAgIC8vIGFuIGltcGxpY2l0IGNvbnRleHQgd2hpY2ggd2UgaGF2ZW4ndCByZXByb2R1Y2VkXHJcbiAgICAgICAgc3Bhd25TYWZlU3luYyhcclxuICAgICAgICAgIGB5YXJuYCxcclxuICAgICAgICAgIFtcImluc3RhbGxcIiwgXCItLWlnbm9yZS1lbmdpbmVzXCIsIFwiLS1pZ25vcmUtc2NyaXB0c1wiXSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgY3dkOiB0bXBSZXBvTnBtUm9vdCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgKVxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmluZm8oXHJcbiAgICAgICAgY2hhbGsuZ3JleShcIuKAolwiKSxcclxuICAgICAgICBgSW5zdGFsbGluZyAke3BhY2thZ2VEZXRhaWxzLm5hbWV9QCR7cGFja2FnZVZlcnNpb259IHdpdGggbnBtYCxcclxuICAgICAgKVxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIC8vIHRyeSBmaXJzdCB3aXRob3V0IGlnbm9yaW5nIHNjcmlwdHMgaW4gY2FzZSB0aGV5IGFyZSByZXF1aXJlZFxyXG4gICAgICAgIC8vIHRoaXMgd29ya3MgaW4gOTkuOTklIG9mIGNhc2VzXHJcbiAgICAgICAgc3Bhd25TYWZlU3luYyhgbnBtYCwgW1wiaVwiLCBcIi0tZm9yY2VcIl0sIHtcclxuICAgICAgICAgIGN3ZDogdG1wUmVwb05wbVJvb3QsXHJcbiAgICAgICAgICBsb2dTdGRFcnJPbkVycm9yOiBmYWxzZSxcclxuICAgICAgICAgIHN0ZGlvOiBcImlnbm9yZVwiLFxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAvLyB0cnkgYWdhaW4gd2hpbGUgaWdub3Jpbmcgc2NyaXB0cyBpbiBjYXNlIHRoZSBzY3JpcHQgZGVwZW5kcyBvblxyXG4gICAgICAgIC8vIGFuIGltcGxpY2l0IGNvbnRleHQgd2hpY2ggd2UgaGF2ZW4ndCByZXByb2R1Y2VkXHJcbiAgICAgICAgc3Bhd25TYWZlU3luYyhgbnBtYCwgW1wiaVwiLCBcIi0taWdub3JlLXNjcmlwdHNcIiwgXCItLWZvcmNlXCJdLCB7XHJcbiAgICAgICAgICBjd2Q6IHRtcFJlcG9OcG1Sb290LFxyXG4gICAgICAgICAgc3RkaW86IFwiaWdub3JlXCIsXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGdpdCA9ICguLi5hcmdzOiBzdHJpbmdbXSkgPT5cclxuICAgICAgc3Bhd25TYWZlU3luYyhcImdpdFwiLCBhcmdzLCB7XHJcbiAgICAgICAgY3dkOiB0bXBSZXBvLm5hbWUsXHJcbiAgICAgICAgZW52OiB7IC4uLnByb2Nlc3MuZW52LCBIT01FOiB0bXBSZXBvLm5hbWUgfSxcclxuICAgICAgICBtYXhCdWZmZXI6IDEwMjQgKiAxMDI0ICogMTAwLFxyXG4gICAgICB9KVxyXG5cclxuICAgIC8vIHJlbW92ZSBuZXN0ZWQgbm9kZV9tb2R1bGVzIGp1c3QgdG8gYmUgc2FmZVxyXG4gICAgcmVtb3ZlU3luYyhqb2luKHRtcFJlcG9QYWNrYWdlUGF0aCwgXCJub2RlX21vZHVsZXNcIikpXHJcbiAgICAvLyByZW1vdmUgLmdpdCBqdXN0IHRvIGJlIHNhZmVcclxuICAgIHJlbW92ZVN5bmMoam9pbih0bXBSZXBvUGFja2FnZVBhdGgsIFwiLmdpdFwiKSlcclxuICAgIC8vIHJlbW92ZSBwYXRjaC1wYWNrYWdlIHN0YXRlIGZpbGVcclxuICAgIHJlbW92ZVN5bmMoam9pbih0bXBSZXBvUGFja2FnZVBhdGgsIFNUQVRFX0ZJTEVfTkFNRSkpXHJcblxyXG4gICAgLy8gY29tbWl0IHRoZSBwYWNrYWdlXHJcbiAgICBjb25zb2xlLmluZm8oY2hhbGsuZ3JleShcIuKAolwiKSwgXCJEaWZmaW5nIHlvdXIgZmlsZXMgd2l0aCBjbGVhbiBmaWxlc1wiKVxyXG4gICAgd3JpdGVGaWxlU3luYyhqb2luKHRtcFJlcG8ubmFtZSwgXCIuZ2l0aWdub3JlXCIpLCBcIiEvbm9kZV9tb2R1bGVzXFxuXFxuXCIpXHJcbiAgICBnaXQoXCJpbml0XCIpXHJcbiAgICBnaXQoXCJjb25maWdcIiwgXCItLWxvY2FsXCIsIFwidXNlci5uYW1lXCIsIFwicGF0Y2gtcGFja2FnZVwiKVxyXG4gICAgZ2l0KFwiY29uZmlnXCIsIFwiLS1sb2NhbFwiLCBcInVzZXIuZW1haWxcIiwgXCJwYXRjaEBwYWNrLmFnZVwiKVxyXG5cclxuICAgIC8vIHJlbW92ZSBpZ25vcmVkIGZpbGVzIGZpcnN0XHJcbiAgICByZW1vdmVJZ25vcmVkRmlsZXModG1wUmVwb1BhY2thZ2VQYXRoLCBpbmNsdWRlUGF0aHMsIGV4Y2x1ZGVQYXRocylcclxuXHJcbiAgICBmb3IgKGNvbnN0IHBhdGNoRGV0YWlscyBvZiBwYXRjaGVzVG9BcHBseUJlZm9yZURpZmZpbmcpIHtcclxuICAgICAgaWYgKFxyXG4gICAgICAgICFhcHBseVBhdGNoKHtcclxuICAgICAgICAgIHBhdGNoRGV0YWlscyxcclxuICAgICAgICAgIHBhdGNoRGlyLFxyXG4gICAgICAgICAgcGF0Y2hGaWxlUGF0aDogam9pbihhcHBQYXRoLCBwYXRjaERpciwgcGF0Y2hEZXRhaWxzLnBhdGNoRmlsZW5hbWUpLFxyXG4gICAgICAgICAgcmV2ZXJzZTogZmFsc2UsXHJcbiAgICAgICAgICBjd2Q6IHRtcFJlcG8ubmFtZSxcclxuICAgICAgICAgIGJlc3RFZmZvcnQ6IGZhbHNlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICkge1xyXG4gICAgICAgIC8vIFRPRE86IGFkZCBiZXR0ZXIgZXJyb3IgbWVzc2FnZSBvbmNlIC0tcmViYXNlIGlzIGltcGxlbWVudGVkXHJcbiAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICBgRmFpbGVkIHRvIGFwcGx5IHBhdGNoICR7cGF0Y2hEZXRhaWxzLnBhdGNoRmlsZW5hbWV9IHRvICR7cGFja2FnZURldGFpbHMucGF0aFNwZWNpZmllcn1gLFxyXG4gICAgICAgIClcclxuICAgICAgICBwcm9jZXNzLmV4aXQoMSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgZ2l0KFwiYWRkXCIsIFwiLWZcIiwgcGFja2FnZURldGFpbHMucGF0aClcclxuICAgIGdpdChcImNvbW1pdFwiLCBcIi0tYWxsb3ctZW1wdHlcIiwgXCItbVwiLCBcImluaXRcIilcclxuXHJcbiAgICAvLyByZXBsYWNlIHBhY2thZ2Ugd2l0aCB1c2VyJ3MgdmVyc2lvblxyXG4gICAgcmVtb3ZlU3luYyh0bXBSZXBvUGFja2FnZVBhdGgpXHJcblxyXG4gICAgLy8gcG5wbSBpbnN0YWxscyBwYWNrYWdlcyBhcyBzeW1saW5rcywgY29weVN5bmMgd291bGQgY29weSBvbmx5IHRoZSBzeW1saW5rXHJcbiAgICBjb3B5U3luYyhyZWFscGF0aFN5bmMocGFja2FnZVBhdGgpLCB0bXBSZXBvUGFja2FnZVBhdGgpXHJcblxyXG4gICAgLy8gcmVtb3ZlIG5lc3RlZCBub2RlX21vZHVsZXMganVzdCB0byBiZSBzYWZlXHJcbiAgICByZW1vdmVTeW5jKGpvaW4odG1wUmVwb1BhY2thZ2VQYXRoLCBcIm5vZGVfbW9kdWxlc1wiKSlcclxuICAgIC8vIHJlbW92ZSAuZ2l0IGp1c3QgdG8gYmUgc2FmZVxyXG4gICAgcmVtb3ZlU3luYyhqb2luKHRtcFJlcG9QYWNrYWdlUGF0aCwgXCIuZ2l0XCIpKVxyXG4gICAgLy8gcmVtb3ZlIHBhdGNoLXBhY2thZ2Ugc3RhdGUgZmlsZVxyXG4gICAgcmVtb3ZlU3luYyhqb2luKHRtcFJlcG9QYWNrYWdlUGF0aCwgU1RBVEVfRklMRV9OQU1FKSlcclxuXHJcbiAgICAvLyBhbHNvIHJlbW92ZSBpZ25vcmVkIGZpbGVzIGxpa2UgYmVmb3JlXHJcbiAgICByZW1vdmVJZ25vcmVkRmlsZXModG1wUmVwb1BhY2thZ2VQYXRoLCBpbmNsdWRlUGF0aHMsIGV4Y2x1ZGVQYXRocylcclxuXHJcbiAgICAvLyBzdGFnZSBhbGwgZmlsZXNcclxuICAgIGdpdChcImFkZFwiLCBcIi1mXCIsIHBhY2thZ2VEZXRhaWxzLnBhdGgpXHJcblxyXG4gICAgLy8gZ2V0IGRpZmYgb2YgY2hhbmdlc1xyXG4gICAgY29uc3QgZGlmZlJlc3VsdCA9IGdpdChcclxuICAgICAgXCJkaWZmXCIsXHJcbiAgICAgIFwiLS1jYWNoZWRcIixcclxuICAgICAgXCItLW5vLWNvbG9yXCIsXHJcbiAgICAgIFwiLS1pZ25vcmUtc3BhY2UtYXQtZW9sXCIsXHJcbiAgICAgIFwiLS1uby1leHQtZGlmZlwiLFxyXG4gICAgICBcIi0tc3JjLXByZWZpeD1hL1wiLFxyXG4gICAgICBcIi0tZHN0LXByZWZpeD1iL1wiLFxyXG4gICAgKVxyXG5cclxuICAgIGlmIChkaWZmUmVzdWx0LnN0ZG91dC5sZW5ndGggPT09IDApIHtcclxuICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgYOKBie+4jyAgTm90IGNyZWF0aW5nIHBhdGNoIGZpbGUgZm9yIHBhY2thZ2UgJyR7cGFja2FnZVBhdGhTcGVjaWZpZXJ9J2AsXHJcbiAgICAgIClcclxuICAgICAgY29uc29sZS5sb2coYOKBie+4jyAgVGhlcmUgZG9uJ3QgYXBwZWFyIHRvIGJlIGFueSBjaGFuZ2VzLmApXHJcbiAgICAgIGlmIChpc1JlYmFzaW5nICYmIG1vZGUudHlwZSA9PT0gXCJvdmVyd3JpdGVfbGFzdFwiKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICBcIlxcbvCfkqEgVG8gcmVtb3ZlIGEgcGF0Y2ggZmlsZSwgZGVsZXRlIGl0IGFuZCB0aGVuIHJlaW5zdGFsbCBub2RlX21vZHVsZXMgZnJvbSBzY3JhdGNoLlwiLFxyXG4gICAgICAgIClcclxuICAgICAgfVxyXG4gICAgICBwcm9jZXNzLmV4aXQoMSlcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgcGFyc2VQYXRjaEZpbGUoZGlmZlJlc3VsdC5zdGRvdXQudG9TdHJpbmcoKSlcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgaWYgKFxyXG4gICAgICAgIChlIGFzIEVycm9yKS5tZXNzYWdlLmluY2x1ZGVzKFwiVW5leHBlY3RlZCBmaWxlIG1vZGUgc3RyaW5nOiAxMjAwMDBcIilcclxuICAgICAgKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFxyXG7im5TvuI8gJHtjaGFsay5yZWQuYm9sZChcIkVSUk9SXCIpfVxyXG5cclxuICBZb3VyIGNoYW5nZXMgaW52b2x2ZSBjcmVhdGluZyBzeW1saW5rcy4gcGF0Y2gtcGFja2FnZSBkb2VzIG5vdCB5ZXQgc3VwcG9ydFxyXG4gIHN5bWxpbmtzLlxyXG4gIFxyXG4gIO+4j1BsZWFzZSB1c2UgJHtjaGFsay5ib2xkKFwiLS1pbmNsdWRlXCIpfSBhbmQvb3IgJHtjaGFsay5ib2xkKFxyXG4gICAgICAgICAgXCItLWV4Y2x1ZGVcIixcclxuICAgICAgICApfSB0byBuYXJyb3cgdGhlIHNjb3BlIG9mIHlvdXIgcGF0Y2ggaWZcclxuICB0aGlzIHdhcyB1bmludGVudGlvbmFsLlxyXG5gKVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbnN0IG91dFBhdGggPSBcIi4vcGF0Y2gtcGFja2FnZS1lcnJvci5qc29uLmd6XCJcclxuICAgICAgICB3cml0ZUZpbGVTeW5jKFxyXG4gICAgICAgICAgb3V0UGF0aCxcclxuICAgICAgICAgIGd6aXBTeW5jKFxyXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgZXJyb3I6IHsgbWVzc2FnZTogZS5tZXNzYWdlLCBzdGFjazogZS5zdGFjayB9LFxyXG4gICAgICAgICAgICAgIHBhdGNoOiBkaWZmUmVzdWx0LnN0ZG91dC50b1N0cmluZygpLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICksXHJcbiAgICAgICAgKVxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBcclxu4puU77iPICR7Y2hhbGsucmVkLmJvbGQoXCJFUlJPUlwiKX1cclxuICAgICAgICBcclxuICBwYXRjaC1wYWNrYWdlIHdhcyB1bmFibGUgdG8gcmVhZCB0aGUgcGF0Y2gtZmlsZSBtYWRlIGJ5IGdpdC4gVGhpcyBzaG91bGQgbm90XHJcbiAgaGFwcGVuLlxyXG4gIFxyXG4gIEEgZGlhZ25vc3RpYyBmaWxlIHdhcyB3cml0dGVuIHRvXHJcbiAgXHJcbiAgICAke291dFBhdGh9XHJcbiAgXHJcbiAgUGxlYXNlIGF0dGFjaCBpdCB0byBhIGdpdGh1YiBpc3N1ZVxyXG4gIFxyXG4gICAgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzL25ldz90aXRsZT1OZXcrcGF0Y2grcGFyc2UrZmFpbGVkJmJvZHk9UGxlYXNlK2F0dGFjaCt0aGUrZGlhZ25vc3RpYytmaWxlK2J5K2RyYWdnaW5nK2l0K2ludG8raGVyZSvwn5mPXHJcbiAgXHJcbiAgTm90ZSB0aGF0IHRoaXMgZGlhZ25vc3RpYyBmaWxlIHdpbGwgY29udGFpbiBjb2RlIGZyb20gdGhlIHBhY2thZ2UgeW91IHdlcmVcclxuICBhdHRlbXB0aW5nIHRvIHBhdGNoLlxyXG5cclxuYClcclxuICAgICAgfVxyXG4gICAgICBwcm9jZXNzLmV4aXQoMSlcclxuICAgICAgcmV0dXJuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gbWF5YmUgZGVsZXRlIGV4aXN0aW5nXHJcbiAgICBpZiAobW9kZS50eXBlID09PSBcImFwcGVuZFwiICYmICFpc1JlYmFzaW5nICYmIGV4aXN0aW5nUGF0Y2hlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgLy8gaWYgd2UgYXJlIGFwcGVuZGluZyB0byBhbiBleGlzdGluZyBwYXRjaCB0aGF0IGRvZXNuJ3QgaGF2ZSBhIHNlcXVlbmNlIG51bWJlciBsZXQncyByZW5hbWUgaXRcclxuICAgICAgY29uc3QgcHJldlBhdGNoID0gZXhpc3RpbmdQYXRjaGVzWzBdXHJcbiAgICAgIGlmIChwcmV2UGF0Y2guc2VxdWVuY2VOdW1iZXIgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIGNvbnN0IG5ld0ZpbGVOYW1lID0gY3JlYXRlUGF0Y2hGaWxlTmFtZSh7XHJcbiAgICAgICAgICBwYWNrYWdlRGV0YWlscyxcclxuICAgICAgICAgIHBhY2thZ2VWZXJzaW9uLFxyXG4gICAgICAgICAgc2VxdWVuY2VOdW1iZXI6IDEsXHJcbiAgICAgICAgICBzZXF1ZW5jZU5hbWU6IHByZXZQYXRjaC5zZXF1ZW5jZU5hbWUgPz8gXCJpbml0aWFsXCIsXHJcbiAgICAgICAgfSlcclxuICAgICAgICBjb25zdCBvbGRQYXRoID0gam9pbihhcHBQYXRoLCBwYXRjaERpciwgcHJldlBhdGNoLnBhdGNoRmlsZW5hbWUpXHJcbiAgICAgICAgY29uc3QgbmV3UGF0aCA9IGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIsIG5ld0ZpbGVOYW1lKVxyXG4gICAgICAgIHJlbmFtZVN5bmMob2xkUGF0aCwgbmV3UGF0aClcclxuICAgICAgICBwcmV2UGF0Y2guc2VxdWVuY2VOdW1iZXIgPSAxXHJcbiAgICAgICAgcHJldlBhdGNoLnBhdGNoRmlsZW5hbWUgPSBuZXdGaWxlTmFtZVxyXG4gICAgICAgIHByZXZQYXRjaC5zZXF1ZW5jZU5hbWUgPSBwcmV2UGF0Y2guc2VxdWVuY2VOYW1lID8/IFwiaW5pdGlhbFwiXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBsYXN0UGF0Y2ggPSBleGlzdGluZ1BhdGNoZXNbXHJcbiAgICAgIHN0YXRlID8gc3RhdGUucGF0Y2hlcy5sZW5ndGggLSAxIDogZXhpc3RpbmdQYXRjaGVzLmxlbmd0aCAtIDFcclxuICAgIF0gYXMgUGF0Y2hlZFBhY2thZ2VEZXRhaWxzIHwgdW5kZWZpbmVkXHJcbiAgICBjb25zdCBzZXF1ZW5jZU5hbWUgPVxyXG4gICAgICBtb2RlLnR5cGUgPT09IFwiYXBwZW5kXCIgPyBtb2RlLm5hbWUgOiBsYXN0UGF0Y2g/LnNlcXVlbmNlTmFtZVxyXG4gICAgY29uc3Qgc2VxdWVuY2VOdW1iZXIgPVxyXG4gICAgICBtb2RlLnR5cGUgPT09IFwiYXBwZW5kXCJcclxuICAgICAgICA/IChsYXN0UGF0Y2g/LnNlcXVlbmNlTnVtYmVyID8/IDApICsgMVxyXG4gICAgICAgIDogbGFzdFBhdGNoPy5zZXF1ZW5jZU51bWJlclxyXG5cclxuICAgIGNvbnN0IHBhdGNoRmlsZU5hbWUgPSBjcmVhdGVQYXRjaEZpbGVOYW1lKHtcclxuICAgICAgcGFja2FnZURldGFpbHMsXHJcbiAgICAgIHBhY2thZ2VWZXJzaW9uLFxyXG4gICAgICBzZXF1ZW5jZU5hbWUsXHJcbiAgICAgIHNlcXVlbmNlTnVtYmVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBwYXRjaFBhdGg6IHN0cmluZyA9IGpvaW4ocGF0Y2hlc0RpciwgcGF0Y2hGaWxlTmFtZSlcclxuICAgIGlmICghZXhpc3RzU3luYyhkaXJuYW1lKHBhdGNoUGF0aCkpKSB7XHJcbiAgICAgIC8vIHNjb3BlZCBwYWNrYWdlXHJcbiAgICAgIG1rZGlyU3luYyhkaXJuYW1lKHBhdGNoUGF0aCkpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gaWYgd2UgYXJlIGluc2VydGluZyBhIG5ldyBwYXRjaCBpbnRvIGEgc2VxdWVuY2Ugd2UgbW9zdCBsaWtlbHkgbmVlZCB0byB1cGRhdGUgdGhlIHNlcXVlbmNlIG51bWJlcnNcclxuICAgIGlmIChpc1JlYmFzaW5nICYmIG1vZGUudHlwZSA9PT0gXCJhcHBlbmRcIikge1xyXG4gICAgICBjb25zdCBwYXRjaGVzVG9OdWRnZSA9IGV4aXN0aW5nUGF0Y2hlcy5zbGljZShzdGF0ZSEucGF0Y2hlcy5sZW5ndGgpXHJcbiAgICAgIGlmIChzZXF1ZW5jZU51bWJlciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwic2VxdWVuY2VOdW1iZXIgaXMgdW5kZWZpbmVkIHdoaWxlIHJlYmFzaW5nXCIpXHJcbiAgICAgIH1cclxuICAgICAgaWYgKFxyXG4gICAgICAgIHBhdGNoZXNUb051ZGdlWzBdPy5zZXF1ZW5jZU51bWJlciAhPT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgcGF0Y2hlc1RvTnVkZ2VbMF0uc2VxdWVuY2VOdW1iZXIgPD0gc2VxdWVuY2VOdW1iZXJcclxuICAgICAgKSB7XHJcbiAgICAgICAgbGV0IG5leHQgPSBzZXF1ZW5jZU51bWJlciArIDFcclxuICAgICAgICBmb3IgKGNvbnN0IHAgb2YgcGF0Y2hlc1RvTnVkZ2UpIHtcclxuICAgICAgICAgIGNvbnN0IG5ld05hbWUgPSBjcmVhdGVQYXRjaEZpbGVOYW1lKHtcclxuICAgICAgICAgICAgcGFja2FnZURldGFpbHMsXHJcbiAgICAgICAgICAgIHBhY2thZ2VWZXJzaW9uLFxyXG4gICAgICAgICAgICBzZXF1ZW5jZU5hbWU6IHAuc2VxdWVuY2VOYW1lLFxyXG4gICAgICAgICAgICBzZXF1ZW5jZU51bWJlcjogbmV4dCsrLFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICBcIlJlbmFtaW5nXCIsXHJcbiAgICAgICAgICAgIGNoYWxrLmJvbGQocC5wYXRjaEZpbGVuYW1lKSxcclxuICAgICAgICAgICAgXCJ0b1wiLFxyXG4gICAgICAgICAgICBjaGFsay5ib2xkKG5ld05hbWUpLFxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgY29uc3Qgb2xkUGF0aCA9IGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIsIHAucGF0Y2hGaWxlbmFtZSlcclxuICAgICAgICAgIGNvbnN0IG5ld1BhdGggPSBqb2luKGFwcFBhdGgsIHBhdGNoRGlyLCBuZXdOYW1lKVxyXG4gICAgICAgICAgcmVuYW1lU3luYyhvbGRQYXRoLCBuZXdQYXRoKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHdyaXRlRmlsZVN5bmMocGF0Y2hQYXRoLCBkaWZmUmVzdWx0LnN0ZG91dClcclxuICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICBgJHtjaGFsay5ncmVlbihcIuKclFwiKX0gQ3JlYXRlZCBmaWxlICR7am9pbihwYXRjaERpciwgcGF0Y2hGaWxlTmFtZSl9XFxuYCxcclxuICAgIClcclxuXHJcbiAgICBjb25zdCBwcmV2U3RhdGU6IFBhdGNoU3RhdGVbXSA9IHBhdGNoZXNUb0FwcGx5QmVmb3JlRGlmZmluZy5tYXAoXHJcbiAgICAgIChwKTogUGF0Y2hTdGF0ZSA9PiAoe1xyXG4gICAgICAgIHBhdGNoRmlsZW5hbWU6IHAucGF0Y2hGaWxlbmFtZSxcclxuICAgICAgICBkaWRBcHBseTogdHJ1ZSxcclxuICAgICAgICBwYXRjaENvbnRlbnRIYXNoOiBoYXNoRmlsZShqb2luKGFwcFBhdGgsIHBhdGNoRGlyLCBwLnBhdGNoRmlsZW5hbWUpKSxcclxuICAgICAgfSksXHJcbiAgICApXHJcbiAgICBjb25zdCBuZXh0U3RhdGU6IFBhdGNoU3RhdGVbXSA9IFtcclxuICAgICAgLi4ucHJldlN0YXRlLFxyXG4gICAgICB7XHJcbiAgICAgICAgcGF0Y2hGaWxlbmFtZTogcGF0Y2hGaWxlTmFtZSxcclxuICAgICAgICBkaWRBcHBseTogdHJ1ZSxcclxuICAgICAgICBwYXRjaENvbnRlbnRIYXNoOiBoYXNoRmlsZShwYXRjaFBhdGgpLFxyXG4gICAgICB9LFxyXG4gICAgXVxyXG5cclxuICAgIC8vIGlmIGFueSBwYXRjaGVzIGNvbWUgYWZ0ZXIgdGhpcyBvbmUgd2UganVzdCBtYWRlLCB3ZSBzaG91bGQgcmVhcHBseSB0aGVtXHJcbiAgICBsZXQgZGlkRmFpbFdoaWxlRmluaXNoaW5nUmViYXNlID0gZmFsc2VcclxuICAgIGlmIChpc1JlYmFzaW5nKSB7XHJcbiAgICAgIGNvbnN0IGN1cnJlbnRQYXRjaGVzID0gZ2V0R3JvdXBlZFBhdGNoZXMoam9pbihhcHBQYXRoLCBwYXRjaERpcikpXHJcbiAgICAgICAgLnBhdGhTcGVjaWZpZXJUb1BhdGNoRmlsZXNbcGFja2FnZURldGFpbHMucGF0aFNwZWNpZmllcl1cclxuXHJcbiAgICAgIGNvbnN0IHByZXZpb3VzbHlVbmFwcGxpZWRQYXRjaGVzID0gY3VycmVudFBhdGNoZXMuc2xpY2UobmV4dFN0YXRlLmxlbmd0aClcclxuICAgICAgaWYgKHByZXZpb3VzbHlVbmFwcGxpZWRQYXRjaGVzLmxlbmd0aCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBGYXN0IGZvcndhcmRpbmcuLi5gKVxyXG4gICAgICAgIGZvciAoY29uc3QgcGF0Y2ggb2YgcHJldmlvdXNseVVuYXBwbGllZFBhdGNoZXMpIHtcclxuICAgICAgICAgIGNvbnN0IHBhdGNoRmlsZVBhdGggPSBqb2luKGFwcFBhdGgsIHBhdGNoRGlyLCBwYXRjaC5wYXRjaEZpbGVuYW1lKVxyXG4gICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAhYXBwbHlQYXRjaCh7XHJcbiAgICAgICAgICAgICAgcGF0Y2hEZXRhaWxzOiBwYXRjaCxcclxuICAgICAgICAgICAgICBwYXRjaERpcixcclxuICAgICAgICAgICAgICBwYXRjaEZpbGVQYXRoLFxyXG4gICAgICAgICAgICAgIHJldmVyc2U6IGZhbHNlLFxyXG4gICAgICAgICAgICAgIGN3ZDogcHJvY2Vzcy5jd2QoKSxcclxuICAgICAgICAgICAgICBiZXN0RWZmb3J0OiBmYWxzZSxcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICkge1xyXG4gICAgICAgICAgICBkaWRGYWlsV2hpbGVGaW5pc2hpbmdSZWJhc2UgPSB0cnVlXHJcbiAgICAgICAgICAgIGxvZ1BhdGNoU2VxdWVuY2VFcnJvcih7IHBhdGNoRGV0YWlsczogcGF0Y2ggfSlcclxuICAgICAgICAgICAgbmV4dFN0YXRlLnB1c2goe1xyXG4gICAgICAgICAgICAgIHBhdGNoRmlsZW5hbWU6IHBhdGNoLnBhdGNoRmlsZW5hbWUsXHJcbiAgICAgICAgICAgICAgZGlkQXBwbHk6IGZhbHNlLFxyXG4gICAgICAgICAgICAgIHBhdGNoQ29udGVudEhhc2g6IGhhc2hGaWxlKHBhdGNoRmlsZVBhdGgpLFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coYCAgJHtjaGFsay5ncmVlbihcIuKclFwiKX0gJHtwYXRjaC5wYXRjaEZpbGVuYW1lfWApXHJcbiAgICAgICAgICAgIG5leHRTdGF0ZS5wdXNoKHtcclxuICAgICAgICAgICAgICBwYXRjaEZpbGVuYW1lOiBwYXRjaC5wYXRjaEZpbGVuYW1lLFxyXG4gICAgICAgICAgICAgIGRpZEFwcGx5OiB0cnVlLFxyXG4gICAgICAgICAgICAgIHBhdGNoQ29udGVudEhhc2g6IGhhc2hGaWxlKHBhdGNoRmlsZVBhdGgpLFxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChpc1JlYmFzaW5nIHx8IG51bVBhdGNoZXNBZnRlckNyZWF0ZSA+IDEpIHtcclxuICAgICAgc2F2ZVBhdGNoQXBwbGljYXRpb25TdGF0ZSh7XHJcbiAgICAgICAgcGFja2FnZURldGFpbHMsXHJcbiAgICAgICAgcGF0Y2hlczogbmV4dFN0YXRlLFxyXG4gICAgICAgIGlzUmViYXNpbmc6IGRpZEZhaWxXaGlsZUZpbmlzaGluZ1JlYmFzZSxcclxuICAgICAgfSlcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNsZWFyUGF0Y2hBcHBsaWNhdGlvblN0YXRlKHBhY2thZ2VEZXRhaWxzKVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChjYW5DcmVhdGVJc3N1ZSkge1xyXG4gICAgICBpZiAoY3JlYXRlSXNzdWUpIHtcclxuICAgICAgICBvcGVuSXNzdWVDcmVhdGlvbkxpbmsoe1xyXG4gICAgICAgICAgcGFja2FnZURldGFpbHMsXHJcbiAgICAgICAgICBwYXRjaEZpbGVDb250ZW50czogZGlmZlJlc3VsdC5zdGRvdXQudG9TdHJpbmcoKSxcclxuICAgICAgICAgIHBhY2thZ2VWZXJzaW9uLFxyXG4gICAgICAgICAgcGF0Y2hQYXRoLFxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgbWF5YmVQcmludElzc3VlQ3JlYXRpb25Qcm9tcHQodmNzLCBwYWNrYWdlRGV0YWlscywgcGFja2FnZU1hbmFnZXIpXHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICBjb25zb2xlLmxvZyhlKVxyXG4gICAgdGhyb3cgZVxyXG4gIH0gZmluYWxseSB7XHJcbiAgICB0bXBSZXBvLnJlbW92ZUNhbGxiYWNrKClcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVBhdGNoRmlsZU5hbWUoe1xyXG4gIHBhY2thZ2VEZXRhaWxzLFxyXG4gIHBhY2thZ2VWZXJzaW9uLFxyXG4gIHNlcXVlbmNlTnVtYmVyLFxyXG4gIHNlcXVlbmNlTmFtZSxcclxufToge1xyXG4gIHBhY2thZ2VEZXRhaWxzOiBQYWNrYWdlRGV0YWlsc1xyXG4gIHBhY2thZ2VWZXJzaW9uOiBzdHJpbmdcclxuICBzZXF1ZW5jZU51bWJlcj86IG51bWJlclxyXG4gIHNlcXVlbmNlTmFtZT86IHN0cmluZ1xyXG59KSB7XHJcbiAgY29uc3QgcGFja2FnZU5hbWVzID0gcGFja2FnZURldGFpbHMucGFja2FnZU5hbWVzXHJcbiAgICAubWFwKChuYW1lKSA9PiBuYW1lLnJlcGxhY2UoL1xcLy9nLCBcIitcIikpXHJcbiAgICAuam9pbihcIisrXCIpXHJcblxyXG4gIGNvbnN0IG5hbWVBbmRWZXJzaW9uID0gYCR7cGFja2FnZU5hbWVzfSske3BhY2thZ2VWZXJzaW9ufWBcclxuICBjb25zdCBudW0gPVxyXG4gICAgc2VxdWVuY2VOdW1iZXIgPT09IHVuZGVmaW5lZFxyXG4gICAgICA/IFwiXCJcclxuICAgICAgOiBgKyR7c2VxdWVuY2VOdW1iZXIudG9TdHJpbmcoKS5wYWRTdGFydCgzLCBcIjBcIil9YFxyXG4gIGNvbnN0IG5hbWUgPSAhc2VxdWVuY2VOYW1lID8gXCJcIiA6IGArJHtzZXF1ZW5jZU5hbWV9YFxyXG5cclxuICByZXR1cm4gYCR7bmFtZUFuZFZlcnNpb259JHtudW19JHtuYW1lfS5wYXRjaGBcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGxvZ1BhdGNoU2VxdWVuY2VFcnJvcih7XHJcbiAgcGF0Y2hEZXRhaWxzLFxyXG59OiB7XHJcbiAgcGF0Y2hEZXRhaWxzOiBQYXRjaGVkUGFja2FnZURldGFpbHNcclxufSkge1xyXG4gIGNvbnNvbGUubG9nKGBcclxuJHtjaGFsay5yZWQuYm9sZChcIuKblCBFUlJPUlwiKX1cclxuXHJcbkZhaWxlZCB0byBhcHBseSBwYXRjaCBmaWxlICR7Y2hhbGsuYm9sZChwYXRjaERldGFpbHMucGF0Y2hGaWxlbmFtZSl9LlxyXG5cclxuSWYgdGhpcyBwYXRjaCBmaWxlIGlzIG5vIGxvbmdlciB1c2VmdWwsIGRlbGV0ZSBpdCBhbmQgcnVuXHJcblxyXG4gICR7Y2hhbGsuYm9sZChgcGF0Y2gtcGFja2FnZWApfVxyXG5cclxuVG8gcGFydGlhbGx5IGFwcGx5IHRoZSBwYXRjaCAoaWYgcG9zc2libGUpIGFuZCBvdXRwdXQgYSBsb2cgb2YgZXJyb3JzIHRvIGZpeCwgcnVuXHJcblxyXG4gICR7Y2hhbGsuYm9sZChgcGF0Y2gtcGFja2FnZSAtLXBhcnRpYWxgKX1cclxuXHJcbkFmdGVyIHdoaWNoIHlvdSBzaG91bGQgbWFrZSBhbnkgcmVxdWlyZWQgY2hhbmdlcyBpbnNpZGUgJHtcclxuICAgIHBhdGNoRGV0YWlscy5wYXRoXHJcbiAgfSwgYW5kIGZpbmFsbHkgcnVuXHJcblxyXG4gICR7Y2hhbGsuYm9sZChgcGF0Y2gtcGFja2FnZSAke3BhdGNoRGV0YWlscy5wYXRoU3BlY2lmaWVyfWApfVxyXG5cclxudG8gdXBkYXRlIHRoZSBwYXRjaCBmaWxlLlxyXG5gKVxyXG59XHJcbiJdfQ==
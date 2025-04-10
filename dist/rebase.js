"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebase = void 0;
const chalk_1 = __importDefault(require("chalk"));
const path_1 = require("path");
const applyPatches_1 = require("./applyPatches");
const hash_1 = require("./hash");
const patchFs_1 = require("./patchFs");
const stateFile_1 = require("./stateFile");
function rebase({ appPath, patchDir, packagePathSpecifier, targetPatch, }) {
    const patchesDirectory = path_1.join(appPath, patchDir);
    const groupedPatches = patchFs_1.getGroupedPatches(patchesDirectory);
    if (groupedPatches.numPatchFiles === 0) {
        console.log(chalk_1.default.blueBright("No patch files found"));
        process.exit(1);
    }
    const packagePatches = groupedPatches.pathSpecifierToPatchFiles[packagePathSpecifier];
    if (!packagePatches) {
        console.log(chalk_1.default.blueBright("No patch files found for package"), packagePathSpecifier);
        process.exit(1);
    }
    const state = stateFile_1.getPatchApplicationState(packagePatches[0]);
    if (!state) {
        console.log(chalk_1.default.blueBright("No patch state found"), "Did you forget to run", chalk_1.default.bold("patch-package"), "(without arguments) first?");
        process.exit(1);
    }
    if (state.isRebasing) {
        console.log(chalk_1.default.blueBright("Already rebasing"), "Make changes to the files in", chalk_1.default.bold(packagePatches[0].path), "and then run `patch-package", packagePathSpecifier, "--continue` to", packagePatches.length === state.patches.length
            ? "append a patch file"
            : `update the ${packagePatches[packagePatches.length - 1].patchFilename} file`);
        console.log(`💡 To remove a broken patch file, delete it and reinstall node_modules`);
        process.exit(1);
    }
    if (state.patches.length !== packagePatches.length) {
        console.log(chalk_1.default.blueBright("Some patches have not been applied."), "Reinstall node_modules and try again.");
    }
    // check hashes
    stateFile_1.verifyAppliedPatches({ appPath, patchDir, state });
    if (targetPatch === "0") {
        // unapply all
        unApplyPatches({
            patches: packagePatches,
            appPath,
            patchDir,
        });
        stateFile_1.savePatchApplicationState({
            packageDetails: packagePatches[0],
            isRebasing: true,
            patches: [],
        });
        console.log(`
Make any changes you need inside ${chalk_1.default.bold(packagePatches[0].path)}

When you are done, run

  ${chalk_1.default.bold(`patch-package ${packagePathSpecifier} --append 'MyChangeDescription'`)}
  
to insert a new patch file.
`);
        return;
    }
    // find target patch
    const target = packagePatches.find((p) => {
        if (p.patchFilename === targetPatch) {
            return true;
        }
        if (path_1.resolve(process.cwd(), targetPatch) ===
            path_1.join(patchesDirectory, p.patchFilename)) {
            return true;
        }
        if (targetPatch === p.sequenceName) {
            return true;
        }
        const n = Number(targetPatch.replace(/^0+/g, ""));
        if (!isNaN(n) && n === p.sequenceNumber) {
            return true;
        }
        return false;
    });
    if (!target) {
        console.log(chalk_1.default.red("Could not find target patch file"), chalk_1.default.bold(targetPatch));
        console.log();
        console.log("The list of available patch files is:");
        packagePatches.forEach((p) => {
            console.log(`  - ${p.patchFilename}`);
        });
        process.exit(1);
    }
    const currentHash = hash_1.hashFile(path_1.join(patchesDirectory, target.patchFilename));
    const prevApplication = state.patches.find((p) => p.patchContentHash === currentHash);
    if (!prevApplication) {
        console.log(chalk_1.default.red("Could not find previous application of patch file"), chalk_1.default.bold(target.patchFilename));
        console.log();
        console.log("You should reinstall node_modules and try again.");
        process.exit(1);
    }
    // ok, we are good to start undoing all the patches that were applied up to but not including the target patch
    const targetIdx = state.patches.indexOf(prevApplication);
    unApplyPatches({
        patches: packagePatches.slice(targetIdx + 1),
        appPath,
        patchDir,
    });
    stateFile_1.savePatchApplicationState({
        packageDetails: packagePatches[0],
        isRebasing: true,
        patches: packagePatches.slice(0, targetIdx + 1).map((p) => ({
            patchFilename: p.patchFilename,
            patchContentHash: hash_1.hashFile(path_1.join(patchesDirectory, p.patchFilename)),
            didApply: true,
        })),
    });
    console.log(`
Make any changes you need inside ${chalk_1.default.bold(packagePatches[0].path)}

When you are done, do one of the following:

  To update ${chalk_1.default.bold(packagePatches[targetIdx].patchFilename)} run

    ${chalk_1.default.bold(`patch-package ${packagePathSpecifier}`)}
    
  To create a new patch file after ${chalk_1.default.bold(packagePatches[targetIdx].patchFilename)} run
  
    ${chalk_1.default.bold(`patch-package ${packagePathSpecifier} --append 'MyChangeDescription'`)}

  `);
}
exports.rebase = rebase;
function unApplyPatches({ patches, appPath, patchDir, }) {
    for (const patch of patches.slice().reverse()) {
        if (!applyPatches_1.applyPatch({
            patchFilePath: path_1.join(appPath, patchDir, patch.patchFilename),
            reverse: true,
            patchDetails: patch,
            patchDir,
            cwd: process.cwd(),
            bestEffort: false,
        })) {
            console.log(chalk_1.default.red("Failed to un-apply patch file"), chalk_1.default.bold(patch.patchFilename), "Try completely reinstalling node_modules.");
            process.exit(1);
        }
        console.log(chalk_1.default.cyan.bold("Un-applied"), patch.patchFilename);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmViYXNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3JlYmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxrREFBeUI7QUFDekIsK0JBQW9DO0FBQ3BDLGlEQUEyQztBQUMzQyxpQ0FBaUM7QUFFakMsdUNBQTZDO0FBQzdDLDJDQUlvQjtBQUVwQixTQUFnQixNQUFNLENBQUMsRUFDckIsT0FBTyxFQUNQLFFBQVEsRUFDUixvQkFBb0IsRUFDcEIsV0FBVyxHQU1aO0lBQ0MsTUFBTSxnQkFBZ0IsR0FBRyxXQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ2hELE1BQU0sY0FBYyxHQUFHLDJCQUFpQixDQUFDLGdCQUFnQixDQUFDLENBQUE7SUFFMUQsSUFBSSxjQUFjLENBQUMsYUFBYSxLQUFLLENBQUMsRUFBRTtRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQUssQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1FBQ3JELE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7S0FDaEI7SUFFRCxNQUFNLGNBQWMsR0FDbEIsY0FBYyxDQUFDLHlCQUF5QixDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDaEUsSUFBSSxDQUFDLGNBQWMsRUFBRTtRQUNuQixPQUFPLENBQUMsR0FBRyxDQUNULGVBQUssQ0FBQyxVQUFVLENBQUMsa0NBQWtDLENBQUMsRUFDcEQsb0JBQW9CLENBQ3JCLENBQUE7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO0tBQ2hCO0lBRUQsTUFBTSxLQUFLLEdBQUcsb0NBQXdCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFFekQsSUFBSSxDQUFDLEtBQUssRUFBRTtRQUNWLE9BQU8sQ0FBQyxHQUFHLENBQ1QsZUFBSyxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUN4Qyx1QkFBdUIsRUFDdkIsZUFB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RSxXQUFJLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFXO1lBQ3JFLE9BQU8sRUFBRSxJQUFJO1lBQ2IsWUFBWSxFQUFFLEtBQUs7WUFDbkIsUUFBUTtZQUNSLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ2xCLFVBQVUsRUFBRSxLQUFLO1NBQ2xCLENBQUMsRUFDRjtZQUNBLE9BQU8sQ0FBQyxHQUFHLENBQ1QsZUFBSyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxFQUMxQyxlQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFDL0IsMkNBQTJDLENBQzVDLENBQUE7WUFDRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1NBQ2hCO1FBQ0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUE7S0FDaEU7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gXCJjaGFsa1wiXHJcbmltcG9ydCB7IGpvaW4sIHJlc29sdmUgfSBmcm9tIFwicGF0aFwiXHJcbmltcG9ydCB7IGFwcGx5UGF0Y2ggfSBmcm9tIFwiLi9hcHBseVBhdGNoZXNcIlxyXG5pbXBvcnQgeyBoYXNoRmlsZSB9IGZyb20gXCIuL2hhc2hcIlxyXG5pbXBvcnQgeyBQYXRjaGVkUGFja2FnZURldGFpbHMgfSBmcm9tIFwiLi9QYWNrYWdlRGV0YWlsc1wiXHJcbmltcG9ydCB7IGdldEdyb3VwZWRQYXRjaGVzIH0gZnJvbSBcIi4vcGF0Y2hGc1wiXHJcbmltcG9ydCB7XHJcbiAgZ2V0UGF0Y2hBcHBsaWNhdGlvblN0YXRlLFxyXG4gIHNhdmVQYXRjaEFwcGxpY2F0aW9uU3RhdGUsXHJcbiAgdmVyaWZ5QXBwbGllZFBhdGNoZXMsXHJcbn0gZnJvbSBcIi4vc3RhdGVGaWxlXCJcclxuXHJcbmV4cG9ydCBmdW5jdGlvbiByZWJhc2Uoe1xyXG4gIGFwcFBhdGgsXHJcbiAgcGF0Y2hEaXIsXHJcbiAgcGFja2FnZVBhdGhTcGVjaWZpZXIsXHJcbiAgdGFyZ2V0UGF0Y2gsXHJcbn06IHtcclxuICBhcHBQYXRoOiBzdHJpbmdcclxuICBwYXRjaERpcjogc3RyaW5nXHJcbiAgcGFja2FnZVBhdGhTcGVjaWZpZXI6IHN0cmluZ1xyXG4gIHRhcmdldFBhdGNoOiBzdHJpbmdcclxufSk6IHZvaWQge1xyXG4gIGNvbnN0IHBhdGNoZXNEaXJlY3RvcnkgPSBqb2luKGFwcFBhdGgsIHBhdGNoRGlyKVxyXG4gIGNvbnN0IGdyb3VwZWRQYXRjaGVzID0gZ2V0R3JvdXBlZFBhdGNoZXMocGF0Y2hlc0RpcmVjdG9yeSlcclxuXHJcbiAgaWYgKGdyb3VwZWRQYXRjaGVzLm51bVBhdGNoRmlsZXMgPT09IDApIHtcclxuICAgIGNvbnNvbGUubG9nKGNoYWxrLmJsdWVCcmlnaHQoXCJObyBwYXRjaCBmaWxlcyBmb3VuZFwiKSlcclxuICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gIH1cclxuXHJcbiAgY29uc3QgcGFja2FnZVBhdGNoZXMgPVxyXG4gICAgZ3JvdXBlZFBhdGNoZXMucGF0aFNwZWNpZmllclRvUGF0Y2hGaWxlc1twYWNrYWdlUGF0aFNwZWNpZmllcl1cclxuICBpZiAoIXBhY2thZ2VQYXRjaGVzKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcclxuICAgICAgY2hhbGsuYmx1ZUJyaWdodChcIk5vIHBhdGNoIGZpbGVzIGZvdW5kIGZvciBwYWNrYWdlXCIpLFxyXG4gICAgICBwYWNrYWdlUGF0aFNwZWNpZmllcixcclxuICAgIClcclxuICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gIH1cclxuXHJcbiAgY29uc3Qgc3RhdGUgPSBnZXRQYXRjaEFwcGxpY2F0aW9uU3RhdGUocGFja2FnZVBhdGNoZXNbMF0pXHJcblxyXG4gIGlmICghc3RhdGUpIHtcclxuICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICBjaGFsay5ibHVlQnJpZ2h0KFwiTm8gcGF0Y2ggc3RhdGUgZm91bmRcIiksXHJcbiAgICAgIFwiRGlkIHlvdSBmb3JnZXQgdG8gcnVuXCIsXHJcbiAgICAgIGNoYWxrLmJvbGQoXCJwYXRjaC1wYWNrYWdlXCIpLFxyXG4gICAgICBcIih3aXRob3V0IGFyZ3VtZW50cykgZmlyc3Q/XCIsXHJcbiAgICApXHJcbiAgICBwcm9jZXNzLmV4aXQoMSlcclxuICB9XHJcbiAgaWYgKHN0YXRlLmlzUmViYXNpbmcpIHtcclxuICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICBjaGFsay5ibHVlQnJpZ2h0KFwiQWxyZWFkeSByZWJhc2luZ1wiKSxcclxuICAgICAgXCJNYWtlIGNoYW5nZXMgdG8gdGhlIGZpbGVzIGluXCIsXHJcbiAgICAgIGNoYWxrLmJvbGQocGFja2FnZVBhdGNoZXNbMF0ucGF0aCksXHJcbiAgICAgIFwiYW5kIHRoZW4gcnVuIGBwYXRjaC1wYWNrYWdlXCIsXHJcbiAgICAgIHBhY2thZ2VQYXRoU3BlY2lmaWVyLFxyXG4gICAgICBcIi0tY29udGludWVgIHRvXCIsXHJcbiAgICAgIHBhY2thZ2VQYXRjaGVzLmxlbmd0aCA9PT0gc3RhdGUucGF0Y2hlcy5sZW5ndGhcclxuICAgICAgICA/IFwiYXBwZW5kIGEgcGF0Y2ggZmlsZVwiXHJcbiAgICAgICAgOiBgdXBkYXRlIHRoZSAke1xyXG4gICAgICAgICAgICBwYWNrYWdlUGF0Y2hlc1twYWNrYWdlUGF0Y2hlcy5sZW5ndGggLSAxXS5wYXRjaEZpbGVuYW1lXHJcbiAgICAgICAgICB9IGZpbGVgLFxyXG4gICAgKVxyXG4gICAgY29uc29sZS5sb2coXHJcbiAgICAgIGDwn5KhIFRvIHJlbW92ZSBhIGJyb2tlbiBwYXRjaCBmaWxlLCBkZWxldGUgaXQgYW5kIHJlaW5zdGFsbCBub2RlX21vZHVsZXNgLFxyXG4gICAgKVxyXG4gICAgcHJvY2Vzcy5leGl0KDEpXHJcbiAgfVxyXG4gIGlmIChzdGF0ZS5wYXRjaGVzLmxlbmd0aCAhPT0gcGFja2FnZVBhdGNoZXMubGVuZ3RoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcclxuICAgICAgY2hhbGsuYmx1ZUJyaWdodChcIlNvbWUgcGF0Y2hlcyBoYXZlIG5vdCBiZWVuIGFwcGxpZWQuXCIpLFxyXG4gICAgICBcIlJlaW5zdGFsbCBub2RlX21vZHVsZXMgYW5kIHRyeSBhZ2Fpbi5cIixcclxuICAgIClcclxuICB9XHJcbiAgLy8gY2hlY2sgaGFzaGVzXHJcbiAgdmVyaWZ5QXBwbGllZFBhdGNoZXMoeyBhcHBQYXRoLCBwYXRjaERpciwgc3RhdGUgfSlcclxuXHJcbiAgaWYgKHRhcmdldFBhdGNoID09PSBcIjBcIikge1xyXG4gICAgLy8gdW5hcHBseSBhbGxcclxuICAgIHVuQXBwbHlQYXRjaGVzKHtcclxuICAgICAgcGF0Y2hlczogcGFja2FnZVBhdGNoZXMsXHJcbiAgICAgIGFwcFBhdGgsXHJcbiAgICAgIHBhdGNoRGlyLFxyXG4gICAgfSlcclxuICAgIHNhdmVQYXRjaEFwcGxpY2F0aW9uU3RhdGUoe1xyXG4gICAgICBwYWNrYWdlRGV0YWlsczogcGFja2FnZVBhdGNoZXNbMF0sXHJcbiAgICAgIGlzUmViYXNpbmc6IHRydWUsXHJcbiAgICAgIHBhdGNoZXM6IFtdLFxyXG4gICAgfSlcclxuICAgIGNvbnNvbGUubG9nKGBcclxuTWFrZSBhbnkgY2hhbmdlcyB5b3UgbmVlZCBpbnNpZGUgJHtjaGFsay5ib2xkKHBhY2thZ2VQYXRjaGVzWzBdLnBhdGgpfVxyXG5cclxuV2hlbiB5b3UgYXJlIGRvbmUsIHJ1blxyXG5cclxuICAke2NoYWxrLmJvbGQoXHJcbiAgICBgcGF0Y2gtcGFja2FnZSAke3BhY2thZ2VQYXRoU3BlY2lmaWVyfSAtLWFwcGVuZCAnTXlDaGFuZ2VEZXNjcmlwdGlvbidgLFxyXG4gICl9XHJcbiAgXHJcbnRvIGluc2VydCBhIG5ldyBwYXRjaCBmaWxlLlxyXG5gKVxyXG4gICAgcmV0dXJuXHJcbiAgfVxyXG5cclxuICAvLyBmaW5kIHRhcmdldCBwYXRjaFxyXG4gIGNvbnN0IHRhcmdldCA9IHBhY2thZ2VQYXRjaGVzLmZpbmQoKHApID0+IHtcclxuICAgIGlmIChwLnBhdGNoRmlsZW5hbWUgPT09IHRhcmdldFBhdGNoKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcbiAgICBpZiAoXHJcbiAgICAgIHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgdGFyZ2V0UGF0Y2gpID09PVxyXG4gICAgICBqb2luKHBhdGNoZXNEaXJlY3RvcnksIHAucGF0Y2hGaWxlbmFtZSlcclxuICAgICkge1xyXG4gICAgICByZXR1cm4gdHJ1ZVxyXG4gICAgfVxyXG5cclxuICAgIGlmICh0YXJnZXRQYXRjaCA9PT0gcC5zZXF1ZW5jZU5hbWUpIHtcclxuICAgICAgcmV0dXJuIHRydWVcclxuICAgIH1cclxuICAgIGNvbnN0IG4gPSBOdW1iZXIodGFyZ2V0UGF0Y2gucmVwbGFjZSgvXjArL2csIFwiXCIpKVxyXG4gICAgaWYgKCFpc05hTihuKSAmJiBuID09PSBwLnNlcXVlbmNlTnVtYmVyKSB7XHJcbiAgICAgIHJldHVybiB0cnVlXHJcbiAgICB9XHJcbiAgICByZXR1cm4gZmFsc2VcclxuICB9KVxyXG5cclxuICBpZiAoIXRhcmdldCkge1xyXG4gICAgY29uc29sZS5sb2coXHJcbiAgICAgIGNoYWxrLnJlZChcIkNvdWxkIG5vdCBmaW5kIHRhcmdldCBwYXRjaCBmaWxlXCIpLFxyXG4gICAgICBjaGFsay5ib2xkKHRhcmdldFBhdGNoKSxcclxuICAgIClcclxuICAgIGNvbnNvbGUubG9nKClcclxuICAgIGNvbnNvbGUubG9nKFwiVGhlIGxpc3Qgb2YgYXZhaWxhYmxlIHBhdGNoIGZpbGVzIGlzOlwiKVxyXG4gICAgcGFja2FnZVBhdGNoZXMuZm9yRWFjaCgocCkgPT4ge1xyXG4gICAgICBjb25zb2xlLmxvZyhgICAtICR7cC5wYXRjaEZpbGVuYW1lfWApXHJcbiAgICB9KVxyXG5cclxuICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gIH1cclxuICBjb25zdCBjdXJyZW50SGFzaCA9IGhhc2hGaWxlKGpvaW4ocGF0Y2hlc0RpcmVjdG9yeSwgdGFyZ2V0LnBhdGNoRmlsZW5hbWUpKVxyXG5cclxuICBjb25zdCBwcmV2QXBwbGljYXRpb24gPSBzdGF0ZS5wYXRjaGVzLmZpbmQoXHJcbiAgICAocCkgPT4gcC5wYXRjaENvbnRlbnRIYXNoID09PSBjdXJyZW50SGFzaCxcclxuICApXHJcbiAgaWYgKCFwcmV2QXBwbGljYXRpb24pIHtcclxuICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICBjaGFsay5yZWQoXCJDb3VsZCBub3QgZmluZCBwcmV2aW91cyBhcHBsaWNhdGlvbiBvZiBwYXRjaCBmaWxlXCIpLFxyXG4gICAgICBjaGFsay5ib2xkKHRhcmdldC5wYXRjaEZpbGVuYW1lKSxcclxuICAgIClcclxuICAgIGNvbnNvbGUubG9nKClcclxuICAgIGNvbnNvbGUubG9nKFwiWW91IHNob3VsZCByZWluc3RhbGwgbm9kZV9tb2R1bGVzIGFuZCB0cnkgYWdhaW4uXCIpXHJcbiAgICBwcm9jZXNzLmV4aXQoMSlcclxuICB9XHJcblxyXG4gIC8vIG9rLCB3ZSBhcmUgZ29vZCB0byBzdGFydCB1bmRvaW5nIGFsbCB0aGUgcGF0Y2hlcyB0aGF0IHdlcmUgYXBwbGllZCB1cCB0byBidXQgbm90IGluY2x1ZGluZyB0aGUgdGFyZ2V0IHBhdGNoXHJcbiAgY29uc3QgdGFyZ2V0SWR4ID0gc3RhdGUucGF0Y2hlcy5pbmRleE9mKHByZXZBcHBsaWNhdGlvbilcclxuXHJcbiAgdW5BcHBseVBhdGNoZXMoe1xyXG4gICAgcGF0Y2hlczogcGFja2FnZVBhdGNoZXMuc2xpY2UodGFyZ2V0SWR4ICsgMSksXHJcbiAgICBhcHBQYXRoLFxyXG4gICAgcGF0Y2hEaXIsXHJcbiAgfSlcclxuICBzYXZlUGF0Y2hBcHBsaWNhdGlvblN0YXRlKHtcclxuICAgIHBhY2thZ2VEZXRhaWxzOiBwYWNrYWdlUGF0Y2hlc1swXSxcclxuICAgIGlzUmViYXNpbmc6IHRydWUsXHJcbiAgICBwYXRjaGVzOiBwYWNrYWdlUGF0Y2hlcy5zbGljZSgwLCB0YXJnZXRJZHggKyAxKS5tYXAoKHApID0+ICh7XHJcbiAgICAgIHBhdGNoRmlsZW5hbWU6IHAucGF0Y2hGaWxlbmFtZSxcclxuICAgICAgcGF0Y2hDb250ZW50SGFzaDogaGFzaEZpbGUoam9pbihwYXRjaGVzRGlyZWN0b3J5LCBwLnBhdGNoRmlsZW5hbWUpKSxcclxuICAgICAgZGlkQXBwbHk6IHRydWUsXHJcbiAgICB9KSksXHJcbiAgfSlcclxuXHJcbiAgY29uc29sZS5sb2coYFxyXG5NYWtlIGFueSBjaGFuZ2VzIHlvdSBuZWVkIGluc2lkZSAke2NoYWxrLmJvbGQocGFja2FnZVBhdGNoZXNbMF0ucGF0aCl9XHJcblxyXG5XaGVuIHlvdSBhcmUgZG9uZSwgZG8gb25lIG9mIHRoZSBmb2xsb3dpbmc6XHJcblxyXG4gIFRvIHVwZGF0ZSAke2NoYWxrLmJvbGQocGFja2FnZVBhdGNoZXNbdGFyZ2V0SWR4XS5wYXRjaEZpbGVuYW1lKX0gcnVuXHJcblxyXG4gICAgJHtjaGFsay5ib2xkKGBwYXRjaC1wYWNrYWdlICR7cGFja2FnZVBhdGhTcGVjaWZpZXJ9YCl9XHJcbiAgICBcclxuICBUbyBjcmVhdGUgYSBuZXcgcGF0Y2ggZmlsZSBhZnRlciAke2NoYWxrLmJvbGQoXHJcbiAgICBwYWNrYWdlUGF0Y2hlc1t0YXJnZXRJZHhdLnBhdGNoRmlsZW5hbWUsXHJcbiAgKX0gcnVuXHJcbiAgXHJcbiAgICAke2NoYWxrLmJvbGQoXHJcbiAgICAgIGBwYXRjaC1wYWNrYWdlICR7cGFja2FnZVBhdGhTcGVjaWZpZXJ9IC0tYXBwZW5kICdNeUNoYW5nZURlc2NyaXB0aW9uJ2AsXHJcbiAgICApfVxyXG5cclxuICBgKVxyXG59XHJcblxyXG5mdW5jdGlvbiB1bkFwcGx5UGF0Y2hlcyh7XHJcbiAgcGF0Y2hlcyxcclxuICBhcHBQYXRoLFxyXG4gIHBhdGNoRGlyLFxyXG59OiB7XHJcbiAgcGF0Y2hlczogUGF0Y2hlZFBhY2thZ2VEZXRhaWxzW11cclxuICBhcHBQYXRoOiBzdHJpbmdcclxuICBwYXRjaERpcjogc3RyaW5nXHJcbn0pIHtcclxuICBmb3IgKGNvbnN0IHBhdGNoIG9mIHBhdGNoZXMuc2xpY2UoKS5yZXZlcnNlKCkpIHtcclxuICAgIGlmIChcclxuICAgICAgIWFwcGx5UGF0Y2goe1xyXG4gICAgICAgIHBhdGNoRmlsZVBhdGg6IGpvaW4oYXBwUGF0aCwgcGF0Y2hEaXIsIHBhdGNoLnBhdGNoRmlsZW5hbWUpIGFzIHN0cmluZyxcclxuICAgICAgICByZXZlcnNlOiB0cnVlLFxyXG4gICAgICAgIHBhdGNoRGV0YWlsczogcGF0Y2gsXHJcbiAgICAgICAgcGF0Y2hEaXIsXHJcbiAgICAgICAgY3dkOiBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgIGJlc3RFZmZvcnQ6IGZhbHNlLFxyXG4gICAgICB9KVxyXG4gICAgKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgIGNoYWxrLnJlZChcIkZhaWxlZCB0byB1bi1hcHBseSBwYXRjaCBmaWxlXCIpLFxyXG4gICAgICAgIGNoYWxrLmJvbGQocGF0Y2gucGF0Y2hGaWxlbmFtZSksXHJcbiAgICAgICAgXCJUcnkgY29tcGxldGVseSByZWluc3RhbGxpbmcgbm9kZV9tb2R1bGVzLlwiLFxyXG4gICAgICApXHJcbiAgICAgIHByb2Nlc3MuZXhpdCgxKVxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coY2hhbGsuY3lhbi5ib2xkKFwiVW4tYXBwbGllZFwiKSwgcGF0Y2gucGF0Y2hGaWxlbmFtZSlcclxuICB9XHJcbn1cclxuIl19
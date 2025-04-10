"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const read_1 = require("./read");
const PackageDetails_1 = require("../PackageDetails");
const removeAnsiCodes = (s) => s.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, "");
jest.mock("fs-extra", () => ({
    readFileSync: jest.fn(),
}));
jest.mock("./parse", () => ({
    parsePatchFile: jest.fn(() => {
        throw new Error("hunk integrity check failed etc");
    }),
}));
const log = jest.fn();
console.log = log;
process.cwd = jest.fn(() => "/test/root");
process.exit = jest.fn();
const lastLog = () => log.mock.calls[log.mock.calls.length - 1][0];
describe(read_1.readPatch, () => {
    beforeEach(() => {
        log.mockReset();
    });
    it("throws an error for basic packages", () => {
        read_1.readPatch({
            patchFilePath: "/test/root/patches/test+1.2.3.patch",
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename("test+1.2.3.patch"),
            patchDir: "patches/",
        });
        expect(removeAnsiCodes(lastLog())).toMatchInlineSnapshot(`
"
**ERROR** Failed to apply patch for package test
    
  This happened because the patch file patches/test+1.2.3.patch could not be parsed.
   
  If you just upgraded patch-package, you can try running:
  
    patch -p1 -i patches/test+1.2.3.patch
    npx patch-package test
    
  Otherwise, try manually creating the patch file again.
  
  If the problem persists, please submit a bug report:
  
    https://github.com/ds300/patch-package/issues/new?title=Patch+file+parse+error&body=%3CPlease+attach+the+patch+file+in+question%3E

"
`);
    });
    it("throws an error for scoped packages", () => {
        read_1.readPatch({
            patchFilePath: "/test/root/patches/@david+test+1.2.3.patch",
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename("@david+test+1.2.3.patch"),
            patchDir: "patches/",
        });
        expect(removeAnsiCodes(lastLog())).toMatchInlineSnapshot(`
"
**ERROR** Failed to apply patch for package @david/test
    
  This happened because the patch file patches/@david+test+1.2.3.patch could not be parsed.
   
  If you just upgraded patch-package, you can try running:
  
    patch -p1 -i patches/@david+test+1.2.3.patch
    npx patch-package @david/test
    
  Otherwise, try manually creating the patch file again.
  
  If the problem persists, please submit a bug report:
  
    https://github.com/ds300/patch-package/issues/new?title=Patch+file+parse+error&body=%3CPlease+attach+the+patch+file+in+question%3E

"
`);
    });
    it("throws an error for nested packages", () => {
        const patchFileName = "@david+test++react-native+1.2.3.patch";
        read_1.readPatch({
            patchFilePath: `/test/root/patches/${patchFileName}`,
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename(patchFileName),
            patchDir: "patches/",
        });
        expect(removeAnsiCodes(lastLog())).toMatchInlineSnapshot(`
"
**ERROR** Failed to apply patch for package @david/test => react-native
    
  This happened because the patch file patches/@david+test++react-native+1.2.3.patch could not be parsed.
   
  If you just upgraded patch-package, you can try running:
  
    patch -p1 -i patches/@david+test++react-native+1.2.3.patch
    npx patch-package @david/test/react-native
    
  Otherwise, try manually creating the patch file again.
  
  If the problem persists, please submit a bug report:
  
    https://github.com/ds300/patch-package/issues/new?title=Patch+file+parse+error&body=%3CPlease+attach+the+patch+file+in+question%3E

"
`);
    });
    it("throws an error for with custom patch dir", () => {
        const patchFileName = "@david+test++react-native+1.2.3.patch";
        read_1.readPatch({
            patchFilePath: `/test/root/.cruft/patches/${patchFileName}`,
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename(patchFileName),
            patchDir: ".cruft/patches",
        });
        expect(removeAnsiCodes(lastLog())).toMatchInlineSnapshot(`
"
**ERROR** Failed to apply patch for package @david/test => react-native
    
  This happened because the patch file .cruft/patches/@david+test++react-native+1.2.3.patch could not be parsed.
   
  If you just upgraded patch-package, you can try running:
  
    patch -p1 -i .cruft/patches/@david+test++react-native+1.2.3.patch
    npx patch-package @david/test/react-native
    
  Otherwise, try manually creating the patch file again.
  
  If the problem persists, please submit a bug report:
  
    https://github.com/ds300/patch-package/issues/new?title=Patch+file+parse+error&body=%3CPlease+attach+the+patch+file+in+question%3E

"
`);
    });
    it("throws an error with cd instruction for unhoisted packages", () => {
        const patchFileName = "@david+test++react-native+1.2.3.patch";
        read_1.readPatch({
            patchFilePath: `/test/root/packages/banana/patches/${patchFileName}`,
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename(patchFileName),
            patchDir: "patches/",
        });
        expect(process.cwd).toHaveBeenCalled();
        expect(removeAnsiCodes(lastLog())).toMatchInlineSnapshot(`
"
**ERROR** Failed to apply patch for package @david/test => react-native
    
  This happened because the patch file packages/banana/patches/@david+test++react-native+1.2.3.patch could not be parsed.
   
  If you just upgraded patch-package, you can try running:
  
    cd packages/banana/
    patch -p1 -i patches/@david+test++react-native+1.2.3.patch
    npx patch-package @david/test/react-native
    cd ../..
    
  Otherwise, try manually creating the patch file again.
  
  If the problem persists, please submit a bug report:
  
    https://github.com/ds300/patch-package/issues/new?title=Patch+file+parse+error&body=%3CPlease+attach+the+patch+file+in+question%3E

"
`);
    });
    it("throws an error with cd instruction for unhoisted packages and custom patchDir", () => {
        const patchFileName = "@david+test++react-native+1.2.3.patch";
        read_1.readPatch({
            patchFilePath: `/test/root/packages/banana/.patches/${patchFileName}`,
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename(patchFileName),
            patchDir: ".patches/",
        });
        expect(process.cwd).toHaveBeenCalled();
        expect(removeAnsiCodes(lastLog())).toMatchInlineSnapshot(`
"
**ERROR** Failed to apply patch for package @david/test => react-native
    
  This happened because the patch file packages/banana/.patches/@david+test++react-native+1.2.3.patch could not be parsed.
   
  If you just upgraded patch-package, you can try running:
  
    cd packages/banana/
    patch -p1 -i .patches/@david+test++react-native+1.2.3.patch
    npx patch-package @david/test/react-native
    cd ../..
    
  Otherwise, try manually creating the patch file again.
  
  If the problem persists, please submit a bug report:
  
    https://github.com/ds300/patch-package/issues/new?title=Patch+file+parse+error&body=%3CPlease+attach+the+patch+file+in+question%3E

"
`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhZC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3BhdGNoL3JlYWQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLGlDQUFrQztBQUNsQyxzREFBc0U7QUFFdEUsTUFBTSxlQUFlLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUNwQyxDQUFDLENBQUMsT0FBTyxDQUNQLDZFQUE2RSxFQUM3RSxFQUFFLENBQ0gsQ0FBQTtBQUVILElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDM0IsWUFBWSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDeEIsQ0FBQyxDQUFDLENBQUE7QUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLGNBQWMsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRTtRQUMzQixNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUE7SUFDcEQsQ0FBQyxDQUFDO0NBQ0gsQ0FBQyxDQUFDLENBQUE7QUFFSCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUE7QUFDckIsT0FBTyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUE7QUFDakIsT0FBTyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFBO0FBQ3pDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBUyxDQUFBO0FBRS9CLE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUVsRSxRQUFRLENBQUMsZ0JBQVMsRUFBRSxHQUFHLEVBQUU7SUFDdkIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNqQixDQUFDLENBQUMsQ0FBQTtJQUNGLEVBQUUsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDNUMsZ0JBQVMsQ0FBQztZQUNSLGFBQWEsRUFBRSxxQ0FBcUM7WUFDcEQsWUFBWSxFQUFFLG1EQUFrQyxDQUFDLGtCQUFrQixDQUFFO1lBQ3JFLFFBQVEsRUFBRSxVQUFVO1NBQ3JCLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FrQjVELENBQUMsQ0FBQTtJQUNBLENBQUMsQ0FBQyxDQUFBO0lBRUYsRUFBRSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxnQkFBUyxDQUFDO1lBQ1IsYUFBYSxFQUFFLDRDQUE0QztZQUMzRCxZQUFZLEVBQUUsbURBQWtDLENBQzlDLHlCQUF5QixDQUN6QjtZQUNGLFFBQVEsRUFBRSxVQUFVO1NBQ3JCLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FrQjVELENBQUMsQ0FBQTtJQUNBLENBQUMsQ0FBQyxDQUFBO0lBRUYsRUFBRSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxNQUFNLGFBQWEsR0FBRyx1Q0FBdUMsQ0FBQTtRQUM3RCxnQkFBUyxDQUFDO1lBQ1IsYUFBYSxFQUFFLHNCQUFzQixhQUFhLEVBQUU7WUFDcEQsWUFBWSxFQUFFLG1EQUFrQyxDQUFDLGFBQWEsQ0FBRTtZQUNoRSxRQUFRLEVBQUUsVUFBVTtTQUNyQixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBa0I1RCxDQUFDLENBQUE7SUFDQSxDQUFDLENBQUMsQ0FBQTtJQUVGLEVBQUUsQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7UUFDbkQsTUFBTSxhQUFhLEdBQUcsdUNBQXVDLENBQUE7UUFDN0QsZ0JBQVMsQ0FBQztZQUNSLGFBQWEsRUFBRSw2QkFBNkIsYUFBYSxFQUFFO1lBQzNELFlBQVksRUFBRSxtREFBa0MsQ0FBQyxhQUFhLENBQUU7WUFDaEUsUUFBUSxFQUFFLGdCQUFnQjtTQUMzQixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBa0I1RCxDQUFDLENBQUE7SUFDQSxDQUFDLENBQUMsQ0FBQTtJQUVGLEVBQUUsQ0FBQyw0REFBNEQsRUFBRSxHQUFHLEVBQUU7UUFDcEUsTUFBTSxhQUFhLEdBQUcsdUNBQXVDLENBQUE7UUFDN0QsZ0JBQVMsQ0FBQztZQUNSLGFBQWEsRUFBRSxzQ0FBc0MsYUFBYSxFQUFFO1lBQ3BFLFlBQVksRUFBRSxtREFBa0MsQ0FBQyxhQUFhLENBQUU7WUFDaEUsUUFBUSxFQUFFLFVBQVU7U0FDckIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBRXRDLE1BQU0sQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLHFCQUFxQixDQUFDOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQW9CNUQsQ0FBQyxDQUFBO0lBQ0EsQ0FBQyxDQUFDLENBQUE7SUFFRixFQUFFLENBQUMsZ0ZBQWdGLEVBQUUsR0FBRyxFQUFFO1FBQ3hGLE1BQU0sYUFBYSxHQUFHLHVDQUF1QyxDQUFBO1FBQzdELGdCQUFTLENBQUM7WUFDUixhQUFhLEVBQUUsdUNBQXVDLGFBQWEsRUFBRTtZQUNyRSxZQUFZLEVBQUUsbURBQWtDLENBQUMsYUFBYSxDQUFFO1lBQ2hFLFFBQVEsRUFBRSxXQUFXO1NBQ3RCLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtRQUV0QyxNQUFNLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FvQjVELENBQUMsQ0FBQTtJQUNBLENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByZWFkUGF0Y2ggfSBmcm9tIFwiLi9yZWFkXCJcclxuaW1wb3J0IHsgZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZSB9IGZyb20gXCIuLi9QYWNrYWdlRGV0YWlsc1wiXHJcblxyXG5jb25zdCByZW1vdmVBbnNpQ29kZXMgPSAoczogc3RyaW5nKSA9PlxyXG4gIHMucmVwbGFjZShcclxuICAgIC9bXFx1MDAxYlxcdTAwOWJdW1soKSM7P10qKD86WzAtOV17MSw0fSg/OjtbMC05XXswLDR9KSopP1swLTlBLU9SWmNmLW5xcnk9PjxdL2csXHJcbiAgICBcIlwiLFxyXG4gIClcclxuXHJcbmplc3QubW9jayhcImZzLWV4dHJhXCIsICgpID0+ICh7XHJcbiAgcmVhZEZpbGVTeW5jOiBqZXN0LmZuKCksXHJcbn0pKVxyXG5qZXN0Lm1vY2soXCIuL3BhcnNlXCIsICgpID0+ICh7XHJcbiAgcGFyc2VQYXRjaEZpbGU6IGplc3QuZm4oKCkgPT4ge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiaHVuayBpbnRlZ3JpdHkgY2hlY2sgZmFpbGVkIGV0Y1wiKVxyXG4gIH0pLFxyXG59KSlcclxuXHJcbmNvbnN0IGxvZyA9IGplc3QuZm4oKVxyXG5jb25zb2xlLmxvZyA9IGxvZ1xyXG5wcm9jZXNzLmN3ZCA9IGplc3QuZm4oKCkgPT4gXCIvdGVzdC9yb290XCIpXHJcbnByb2Nlc3MuZXhpdCA9IGplc3QuZm4oKSBhcyBhbnlcclxuXHJcbmNvbnN0IGxhc3RMb2cgPSAoKSA9PiBsb2cubW9jay5jYWxsc1tsb2cubW9jay5jYWxscy5sZW5ndGggLSAxXVswXVxyXG5cclxuZGVzY3JpYmUocmVhZFBhdGNoLCAoKSA9PiB7XHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBsb2cubW9ja1Jlc2V0KClcclxuICB9KVxyXG4gIGl0KFwidGhyb3dzIGFuIGVycm9yIGZvciBiYXNpYyBwYWNrYWdlc1wiLCAoKSA9PiB7XHJcbiAgICByZWFkUGF0Y2goe1xyXG4gICAgICBwYXRjaEZpbGVQYXRoOiBcIi90ZXN0L3Jvb3QvcGF0Y2hlcy90ZXN0KzEuMi4zLnBhdGNoXCIsXHJcbiAgICAgIHBhdGNoRGV0YWlsczogZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcInRlc3QrMS4yLjMucGF0Y2hcIikhLFxyXG4gICAgICBwYXRjaERpcjogXCJwYXRjaGVzL1wiLFxyXG4gICAgfSlcclxuXHJcbiAgICBleHBlY3QocmVtb3ZlQW5zaUNvZGVzKGxhc3RMb2coKSkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXHJcblwiXHJcbioqRVJST1IqKiBGYWlsZWQgdG8gYXBwbHkgcGF0Y2ggZm9yIHBhY2thZ2UgdGVzdFxyXG4gICAgXHJcbiAgVGhpcyBoYXBwZW5lZCBiZWNhdXNlIHRoZSBwYXRjaCBmaWxlIHBhdGNoZXMvdGVzdCsxLjIuMy5wYXRjaCBjb3VsZCBub3QgYmUgcGFyc2VkLlxyXG4gICBcclxuICBJZiB5b3UganVzdCB1cGdyYWRlZCBwYXRjaC1wYWNrYWdlLCB5b3UgY2FuIHRyeSBydW5uaW5nOlxyXG4gIFxyXG4gICAgcGF0Y2ggLXAxIC1pIHBhdGNoZXMvdGVzdCsxLjIuMy5wYXRjaFxyXG4gICAgbnB4IHBhdGNoLXBhY2thZ2UgdGVzdFxyXG4gICAgXHJcbiAgT3RoZXJ3aXNlLCB0cnkgbWFudWFsbHkgY3JlYXRpbmcgdGhlIHBhdGNoIGZpbGUgYWdhaW4uXHJcbiAgXHJcbiAgSWYgdGhlIHByb2JsZW0gcGVyc2lzdHMsIHBsZWFzZSBzdWJtaXQgYSBidWcgcmVwb3J0OlxyXG4gIFxyXG4gICAgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzL25ldz90aXRsZT1QYXRjaCtmaWxlK3BhcnNlK2Vycm9yJmJvZHk9JTNDUGxlYXNlK2F0dGFjaCt0aGUrcGF0Y2grZmlsZStpbitxdWVzdGlvbiUzRVxyXG5cclxuXCJcclxuYClcclxuICB9KVxyXG5cclxuICBpdChcInRocm93cyBhbiBlcnJvciBmb3Igc2NvcGVkIHBhY2thZ2VzXCIsICgpID0+IHtcclxuICAgIHJlYWRQYXRjaCh7XHJcbiAgICAgIHBhdGNoRmlsZVBhdGg6IFwiL3Rlc3Qvcm9vdC9wYXRjaGVzL0BkYXZpZCt0ZXN0KzEuMi4zLnBhdGNoXCIsXHJcbiAgICAgIHBhdGNoRGV0YWlsczogZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcclxuICAgICAgICBcIkBkYXZpZCt0ZXN0KzEuMi4zLnBhdGNoXCIsXHJcbiAgICAgICkhLFxyXG4gICAgICBwYXRjaERpcjogXCJwYXRjaGVzL1wiLFxyXG4gICAgfSlcclxuXHJcbiAgICBleHBlY3QocmVtb3ZlQW5zaUNvZGVzKGxhc3RMb2coKSkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXHJcblwiXHJcbioqRVJST1IqKiBGYWlsZWQgdG8gYXBwbHkgcGF0Y2ggZm9yIHBhY2thZ2UgQGRhdmlkL3Rlc3RcclxuICAgIFxyXG4gIFRoaXMgaGFwcGVuZWQgYmVjYXVzZSB0aGUgcGF0Y2ggZmlsZSBwYXRjaGVzL0BkYXZpZCt0ZXN0KzEuMi4zLnBhdGNoIGNvdWxkIG5vdCBiZSBwYXJzZWQuXHJcbiAgIFxyXG4gIElmIHlvdSBqdXN0IHVwZ3JhZGVkIHBhdGNoLXBhY2thZ2UsIHlvdSBjYW4gdHJ5IHJ1bm5pbmc6XHJcbiAgXHJcbiAgICBwYXRjaCAtcDEgLWkgcGF0Y2hlcy9AZGF2aWQrdGVzdCsxLjIuMy5wYXRjaFxyXG4gICAgbnB4IHBhdGNoLXBhY2thZ2UgQGRhdmlkL3Rlc3RcclxuICAgIFxyXG4gIE90aGVyd2lzZSwgdHJ5IG1hbnVhbGx5IGNyZWF0aW5nIHRoZSBwYXRjaCBmaWxlIGFnYWluLlxyXG4gIFxyXG4gIElmIHRoZSBwcm9ibGVtIHBlcnNpc3RzLCBwbGVhc2Ugc3VibWl0IGEgYnVnIHJlcG9ydDpcclxuICBcclxuICAgIGh0dHBzOi8vZ2l0aHViLmNvbS9kczMwMC9wYXRjaC1wYWNrYWdlL2lzc3Vlcy9uZXc/dGl0bGU9UGF0Y2grZmlsZStwYXJzZStlcnJvciZib2R5PSUzQ1BsZWFzZSthdHRhY2grdGhlK3BhdGNoK2ZpbGUraW4rcXVlc3Rpb24lM0VcclxuXHJcblwiXHJcbmApXHJcbiAgfSlcclxuXHJcbiAgaXQoXCJ0aHJvd3MgYW4gZXJyb3IgZm9yIG5lc3RlZCBwYWNrYWdlc1wiLCAoKSA9PiB7XHJcbiAgICBjb25zdCBwYXRjaEZpbGVOYW1lID0gXCJAZGF2aWQrdGVzdCsrcmVhY3QtbmF0aXZlKzEuMi4zLnBhdGNoXCJcclxuICAgIHJlYWRQYXRjaCh7XHJcbiAgICAgIHBhdGNoRmlsZVBhdGg6IGAvdGVzdC9yb290L3BhdGNoZXMvJHtwYXRjaEZpbGVOYW1lfWAsXHJcbiAgICAgIHBhdGNoRGV0YWlsczogZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShwYXRjaEZpbGVOYW1lKSEsXHJcbiAgICAgIHBhdGNoRGlyOiBcInBhdGNoZXMvXCIsXHJcbiAgICB9KVxyXG5cclxuICAgIGV4cGVjdChyZW1vdmVBbnNpQ29kZXMobGFzdExvZygpKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuXCJcclxuKipFUlJPUioqIEZhaWxlZCB0byBhcHBseSBwYXRjaCBmb3IgcGFja2FnZSBAZGF2aWQvdGVzdCA9PiByZWFjdC1uYXRpdmVcclxuICAgIFxyXG4gIFRoaXMgaGFwcGVuZWQgYmVjYXVzZSB0aGUgcGF0Y2ggZmlsZSBwYXRjaGVzL0BkYXZpZCt0ZXN0KytyZWFjdC1uYXRpdmUrMS4yLjMucGF0Y2ggY291bGQgbm90IGJlIHBhcnNlZC5cclxuICAgXHJcbiAgSWYgeW91IGp1c3QgdXBncmFkZWQgcGF0Y2gtcGFja2FnZSwgeW91IGNhbiB0cnkgcnVubmluZzpcclxuICBcclxuICAgIHBhdGNoIC1wMSAtaSBwYXRjaGVzL0BkYXZpZCt0ZXN0KytyZWFjdC1uYXRpdmUrMS4yLjMucGF0Y2hcclxuICAgIG5weCBwYXRjaC1wYWNrYWdlIEBkYXZpZC90ZXN0L3JlYWN0LW5hdGl2ZVxyXG4gICAgXHJcbiAgT3RoZXJ3aXNlLCB0cnkgbWFudWFsbHkgY3JlYXRpbmcgdGhlIHBhdGNoIGZpbGUgYWdhaW4uXHJcbiAgXHJcbiAgSWYgdGhlIHByb2JsZW0gcGVyc2lzdHMsIHBsZWFzZSBzdWJtaXQgYSBidWcgcmVwb3J0OlxyXG4gIFxyXG4gICAgaHR0cHM6Ly9naXRodWIuY29tL2RzMzAwL3BhdGNoLXBhY2thZ2UvaXNzdWVzL25ldz90aXRsZT1QYXRjaCtmaWxlK3BhcnNlK2Vycm9yJmJvZHk9JTNDUGxlYXNlK2F0dGFjaCt0aGUrcGF0Y2grZmlsZStpbitxdWVzdGlvbiUzRVxyXG5cclxuXCJcclxuYClcclxuICB9KVxyXG5cclxuICBpdChcInRocm93cyBhbiBlcnJvciBmb3Igd2l0aCBjdXN0b20gcGF0Y2ggZGlyXCIsICgpID0+IHtcclxuICAgIGNvbnN0IHBhdGNoRmlsZU5hbWUgPSBcIkBkYXZpZCt0ZXN0KytyZWFjdC1uYXRpdmUrMS4yLjMucGF0Y2hcIlxyXG4gICAgcmVhZFBhdGNoKHtcclxuICAgICAgcGF0Y2hGaWxlUGF0aDogYC90ZXN0L3Jvb3QvLmNydWZ0L3BhdGNoZXMvJHtwYXRjaEZpbGVOYW1lfWAsXHJcbiAgICAgIHBhdGNoRGV0YWlsczogZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShwYXRjaEZpbGVOYW1lKSEsXHJcbiAgICAgIHBhdGNoRGlyOiBcIi5jcnVmdC9wYXRjaGVzXCIsXHJcbiAgICB9KVxyXG5cclxuICAgIGV4cGVjdChyZW1vdmVBbnNpQ29kZXMobGFzdExvZygpKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuXCJcclxuKipFUlJPUioqIEZhaWxlZCB0byBhcHBseSBwYXRjaCBmb3IgcGFja2FnZSBAZGF2aWQvdGVzdCA9PiByZWFjdC1uYXRpdmVcclxuICAgIFxyXG4gIFRoaXMgaGFwcGVuZWQgYmVjYXVzZSB0aGUgcGF0Y2ggZmlsZSAuY3J1ZnQvcGF0Y2hlcy9AZGF2aWQrdGVzdCsrcmVhY3QtbmF0aXZlKzEuMi4zLnBhdGNoIGNvdWxkIG5vdCBiZSBwYXJzZWQuXHJcbiAgIFxyXG4gIElmIHlvdSBqdXN0IHVwZ3JhZGVkIHBhdGNoLXBhY2thZ2UsIHlvdSBjYW4gdHJ5IHJ1bm5pbmc6XHJcbiAgXHJcbiAgICBwYXRjaCAtcDEgLWkgLmNydWZ0L3BhdGNoZXMvQGRhdmlkK3Rlc3QrK3JlYWN0LW5hdGl2ZSsxLjIuMy5wYXRjaFxyXG4gICAgbnB4IHBhdGNoLXBhY2thZ2UgQGRhdmlkL3Rlc3QvcmVhY3QtbmF0aXZlXHJcbiAgICBcclxuICBPdGhlcndpc2UsIHRyeSBtYW51YWxseSBjcmVhdGluZyB0aGUgcGF0Y2ggZmlsZSBhZ2Fpbi5cclxuICBcclxuICBJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgcGxlYXNlIHN1Ym1pdCBhIGJ1ZyByZXBvcnQ6XHJcbiAgXHJcbiAgICBodHRwczovL2dpdGh1Yi5jb20vZHMzMDAvcGF0Y2gtcGFja2FnZS9pc3N1ZXMvbmV3P3RpdGxlPVBhdGNoK2ZpbGUrcGFyc2UrZXJyb3ImYm9keT0lM0NQbGVhc2UrYXR0YWNoK3RoZStwYXRjaCtmaWxlK2luK3F1ZXN0aW9uJTNFXHJcblxyXG5cIlxyXG5gKVxyXG4gIH0pXHJcblxyXG4gIGl0KFwidGhyb3dzIGFuIGVycm9yIHdpdGggY2QgaW5zdHJ1Y3Rpb24gZm9yIHVuaG9pc3RlZCBwYWNrYWdlc1wiLCAoKSA9PiB7XHJcbiAgICBjb25zdCBwYXRjaEZpbGVOYW1lID0gXCJAZGF2aWQrdGVzdCsrcmVhY3QtbmF0aXZlKzEuMi4zLnBhdGNoXCJcclxuICAgIHJlYWRQYXRjaCh7XHJcbiAgICAgIHBhdGNoRmlsZVBhdGg6IGAvdGVzdC9yb290L3BhY2thZ2VzL2JhbmFuYS9wYXRjaGVzLyR7cGF0Y2hGaWxlTmFtZX1gLFxyXG4gICAgICBwYXRjaERldGFpbHM6IGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUocGF0Y2hGaWxlTmFtZSkhLFxyXG4gICAgICBwYXRjaERpcjogXCJwYXRjaGVzL1wiLFxyXG4gICAgfSlcclxuXHJcbiAgICBleHBlY3QocHJvY2Vzcy5jd2QpLnRvSGF2ZUJlZW5DYWxsZWQoKVxyXG5cclxuICAgIGV4cGVjdChyZW1vdmVBbnNpQ29kZXMobGFzdExvZygpKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuXCJcclxuKipFUlJPUioqIEZhaWxlZCB0byBhcHBseSBwYXRjaCBmb3IgcGFja2FnZSBAZGF2aWQvdGVzdCA9PiByZWFjdC1uYXRpdmVcclxuICAgIFxyXG4gIFRoaXMgaGFwcGVuZWQgYmVjYXVzZSB0aGUgcGF0Y2ggZmlsZSBwYWNrYWdlcy9iYW5hbmEvcGF0Y2hlcy9AZGF2aWQrdGVzdCsrcmVhY3QtbmF0aXZlKzEuMi4zLnBhdGNoIGNvdWxkIG5vdCBiZSBwYXJzZWQuXHJcbiAgIFxyXG4gIElmIHlvdSBqdXN0IHVwZ3JhZGVkIHBhdGNoLXBhY2thZ2UsIHlvdSBjYW4gdHJ5IHJ1bm5pbmc6XHJcbiAgXHJcbiAgICBjZCBwYWNrYWdlcy9iYW5hbmEvXHJcbiAgICBwYXRjaCAtcDEgLWkgcGF0Y2hlcy9AZGF2aWQrdGVzdCsrcmVhY3QtbmF0aXZlKzEuMi4zLnBhdGNoXHJcbiAgICBucHggcGF0Y2gtcGFja2FnZSBAZGF2aWQvdGVzdC9yZWFjdC1uYXRpdmVcclxuICAgIGNkIC4uLy4uXHJcbiAgICBcclxuICBPdGhlcndpc2UsIHRyeSBtYW51YWxseSBjcmVhdGluZyB0aGUgcGF0Y2ggZmlsZSBhZ2Fpbi5cclxuICBcclxuICBJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgcGxlYXNlIHN1Ym1pdCBhIGJ1ZyByZXBvcnQ6XHJcbiAgXHJcbiAgICBodHRwczovL2dpdGh1Yi5jb20vZHMzMDAvcGF0Y2gtcGFja2FnZS9pc3N1ZXMvbmV3P3RpdGxlPVBhdGNoK2ZpbGUrcGFyc2UrZXJyb3ImYm9keT0lM0NQbGVhc2UrYXR0YWNoK3RoZStwYXRjaCtmaWxlK2luK3F1ZXN0aW9uJTNFXHJcblxyXG5cIlxyXG5gKVxyXG4gIH0pXHJcblxyXG4gIGl0KFwidGhyb3dzIGFuIGVycm9yIHdpdGggY2QgaW5zdHJ1Y3Rpb24gZm9yIHVuaG9pc3RlZCBwYWNrYWdlcyBhbmQgY3VzdG9tIHBhdGNoRGlyXCIsICgpID0+IHtcclxuICAgIGNvbnN0IHBhdGNoRmlsZU5hbWUgPSBcIkBkYXZpZCt0ZXN0KytyZWFjdC1uYXRpdmUrMS4yLjMucGF0Y2hcIlxyXG4gICAgcmVhZFBhdGNoKHtcclxuICAgICAgcGF0Y2hGaWxlUGF0aDogYC90ZXN0L3Jvb3QvcGFja2FnZXMvYmFuYW5hLy5wYXRjaGVzLyR7cGF0Y2hGaWxlTmFtZX1gLFxyXG4gICAgICBwYXRjaERldGFpbHM6IGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUocGF0Y2hGaWxlTmFtZSkhLFxyXG4gICAgICBwYXRjaERpcjogXCIucGF0Y2hlcy9cIixcclxuICAgIH0pXHJcblxyXG4gICAgZXhwZWN0KHByb2Nlc3MuY3dkKS50b0hhdmVCZWVuQ2FsbGVkKClcclxuXHJcbiAgICBleHBlY3QocmVtb3ZlQW5zaUNvZGVzKGxhc3RMb2coKSkpLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXHJcblwiXHJcbioqRVJST1IqKiBGYWlsZWQgdG8gYXBwbHkgcGF0Y2ggZm9yIHBhY2thZ2UgQGRhdmlkL3Rlc3QgPT4gcmVhY3QtbmF0aXZlXHJcbiAgICBcclxuICBUaGlzIGhhcHBlbmVkIGJlY2F1c2UgdGhlIHBhdGNoIGZpbGUgcGFja2FnZXMvYmFuYW5hLy5wYXRjaGVzL0BkYXZpZCt0ZXN0KytyZWFjdC1uYXRpdmUrMS4yLjMucGF0Y2ggY291bGQgbm90IGJlIHBhcnNlZC5cclxuICAgXHJcbiAgSWYgeW91IGp1c3QgdXBncmFkZWQgcGF0Y2gtcGFja2FnZSwgeW91IGNhbiB0cnkgcnVubmluZzpcclxuICBcclxuICAgIGNkIHBhY2thZ2VzL2JhbmFuYS9cclxuICAgIHBhdGNoIC1wMSAtaSAucGF0Y2hlcy9AZGF2aWQrdGVzdCsrcmVhY3QtbmF0aXZlKzEuMi4zLnBhdGNoXHJcbiAgICBucHggcGF0Y2gtcGFja2FnZSBAZGF2aWQvdGVzdC9yZWFjdC1uYXRpdmVcclxuICAgIGNkIC4uLy4uXHJcbiAgICBcclxuICBPdGhlcndpc2UsIHRyeSBtYW51YWxseSBjcmVhdGluZyB0aGUgcGF0Y2ggZmlsZSBhZ2Fpbi5cclxuICBcclxuICBJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgcGxlYXNlIHN1Ym1pdCBhIGJ1ZyByZXBvcnQ6XHJcbiAgXHJcbiAgICBodHRwczovL2dpdGh1Yi5jb20vZHMzMDAvcGF0Y2gtcGFja2FnZS9pc3N1ZXMvbmV3P3RpdGxlPVBhdGNoK2ZpbGUrcGFyc2UrZXJyb3ImYm9keT0lM0NQbGVhc2UrYXR0YWNoK3RoZStwYXRjaCtmaWxlK2luK3F1ZXN0aW9uJTNFXHJcblxyXG5cIlxyXG5gKVxyXG4gIH0pXHJcbn0pXHJcbiJdfQ==
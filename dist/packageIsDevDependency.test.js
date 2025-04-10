"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const packageIsDevDependency_1 = require("./packageIsDevDependency");
const path_1 = require("./path");
const path_2 = require("path");
const PackageDetails_1 = require("./PackageDetails");
const fs_1 = require("fs");
const appPath = path_2.normalize(path_1.join(__dirname, "../"));
describe(packageIsDevDependency_1.packageIsDevDependency, () => {
    it("returns true if package is a dev dependency", () => {
        expect(packageIsDevDependency_1.packageIsDevDependency({
            appPath,
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename("typescript+3.0.1.patch"),
        })).toBe(true);
    });
    it("returns false if package is not a dev dependency", () => {
        expect(packageIsDevDependency_1.packageIsDevDependency({
            appPath,
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename("chalk+3.0.1.patch"),
        })).toBe(false);
    });
    it("returns false if package is a transitive dependency of a dev dependency", () => {
        expect(fs_1.existsSync(path_1.join(appPath, "node_modules/cosmiconfig"))).toBe(true);
        expect(packageIsDevDependency_1.packageIsDevDependency({
            appPath,
            patchDetails: PackageDetails_1.getPackageDetailsFromPatchFilename(
            // cosmiconfig is a transitive dep of lint-staged
            "cosmiconfig+3.0.1.patch"),
        })).toBe(false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZUlzRGV2RGVwZW5kZW5jeS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3BhY2thZ2VJc0RldkRlcGVuZGVuY3kudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHFFQUFpRTtBQUNqRSxpQ0FBNkI7QUFDN0IsK0JBQWdDO0FBQ2hDLHFEQUFxRTtBQUNyRSwyQkFBK0I7QUFFL0IsTUFBTSxPQUFPLEdBQUcsZ0JBQVMsQ0FBQyxXQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7QUFFakQsUUFBUSxDQUFDLCtDQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNwQyxFQUFFLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1FBQ3JELE1BQU0sQ0FDSiwrQ0FBc0IsQ0FBQztZQUNyQixPQUFPO1lBQ1AsWUFBWSxFQUFFLG1EQUFrQyxDQUM5Qyx3QkFBd0IsQ0FDeEI7U0FDSCxDQUFDLENBQ0gsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDZCxDQUFDLENBQUMsQ0FBQTtJQUNGLEVBQUUsQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7UUFDMUQsTUFBTSxDQUNKLCtDQUFzQixDQUFDO1lBQ3JCLE9BQU87WUFDUCxZQUFZLEVBQUUsbURBQWtDLENBQUMsbUJBQW1CLENBQUU7U0FDdkUsQ0FBQyxDQUNILENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ2YsQ0FBQyxDQUFDLENBQUE7SUFDRixFQUFFLENBQUMseUVBQXlFLEVBQUUsR0FBRyxFQUFFO1FBQ2pGLE1BQU0sQ0FBQyxlQUFVLENBQUMsV0FBSSxDQUFDLE9BQU8sRUFBRSwwQkFBMEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUNKLCtDQUFzQixDQUFDO1lBQ3JCLE9BQU87WUFDUCxZQUFZLEVBQUUsbURBQWtDO1lBQzlDLGlEQUFpRDtZQUNqRCx5QkFBeUIsQ0FDekI7U0FDSCxDQUFDLENBQ0gsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDZixDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcGFja2FnZUlzRGV2RGVwZW5kZW5jeSB9IGZyb20gXCIuL3BhY2thZ2VJc0RldkRlcGVuZGVuY3lcIlxyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcIi4vcGF0aFwiXHJcbmltcG9ydCB7IG5vcm1hbGl6ZSB9IGZyb20gXCJwYXRoXCJcclxuaW1wb3J0IHsgZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZSB9IGZyb20gXCIuL1BhY2thZ2VEZXRhaWxzXCJcclxuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gXCJmc1wiXHJcblxyXG5jb25zdCBhcHBQYXRoID0gbm9ybWFsaXplKGpvaW4oX19kaXJuYW1lLCBcIi4uL1wiKSlcclxuXHJcbmRlc2NyaWJlKHBhY2thZ2VJc0RldkRlcGVuZGVuY3ksICgpID0+IHtcclxuICBpdChcInJldHVybnMgdHJ1ZSBpZiBwYWNrYWdlIGlzIGEgZGV2IGRlcGVuZGVuY3lcIiwgKCkgPT4ge1xyXG4gICAgZXhwZWN0KFxyXG4gICAgICBwYWNrYWdlSXNEZXZEZXBlbmRlbmN5KHtcclxuICAgICAgICBhcHBQYXRoLFxyXG4gICAgICAgIHBhdGNoRGV0YWlsczogZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcclxuICAgICAgICAgIFwidHlwZXNjcmlwdCszLjAuMS5wYXRjaFwiLFxyXG4gICAgICAgICkhLFxyXG4gICAgICB9KSxcclxuICAgICkudG9CZSh0cnVlKVxyXG4gIH0pXHJcbiAgaXQoXCJyZXR1cm5zIGZhbHNlIGlmIHBhY2thZ2UgaXMgbm90IGEgZGV2IGRlcGVuZGVuY3lcIiwgKCkgPT4ge1xyXG4gICAgZXhwZWN0KFxyXG4gICAgICBwYWNrYWdlSXNEZXZEZXBlbmRlbmN5KHtcclxuICAgICAgICBhcHBQYXRoLFxyXG4gICAgICAgIHBhdGNoRGV0YWlsczogZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcImNoYWxrKzMuMC4xLnBhdGNoXCIpISxcclxuICAgICAgfSksXHJcbiAgICApLnRvQmUoZmFsc2UpXHJcbiAgfSlcclxuICBpdChcInJldHVybnMgZmFsc2UgaWYgcGFja2FnZSBpcyBhIHRyYW5zaXRpdmUgZGVwZW5kZW5jeSBvZiBhIGRldiBkZXBlbmRlbmN5XCIsICgpID0+IHtcclxuICAgIGV4cGVjdChleGlzdHNTeW5jKGpvaW4oYXBwUGF0aCwgXCJub2RlX21vZHVsZXMvY29zbWljb25maWdcIikpKS50b0JlKHRydWUpXHJcbiAgICBleHBlY3QoXHJcbiAgICAgIHBhY2thZ2VJc0RldkRlcGVuZGVuY3koe1xyXG4gICAgICAgIGFwcFBhdGgsXHJcbiAgICAgICAgcGF0Y2hEZXRhaWxzOiBnZXRQYWNrYWdlRGV0YWlsc0Zyb21QYXRjaEZpbGVuYW1lKFxyXG4gICAgICAgICAgLy8gY29zbWljb25maWcgaXMgYSB0cmFuc2l0aXZlIGRlcCBvZiBsaW50LXN0YWdlZFxyXG4gICAgICAgICAgXCJjb3NtaWNvbmZpZyszLjAuMS5wYXRjaFwiLFxyXG4gICAgICAgICkhLFxyXG4gICAgICB9KSxcclxuICAgICkudG9CZShmYWxzZSlcclxuICB9KVxyXG59KVxyXG4iXX0=
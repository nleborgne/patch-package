"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const PackageDetails_1 = require("./PackageDetails");
describe("getPackageDetailsFromPatchFilename", () => {
    it("parses new-style patch filenames", () => {
        expect(PackageDetails_1.getPackageDetailsFromPatchFilename("banana++apple+0.4.2.patch"))
            .toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "banana => apple",
  "isDevOnly": false,
  "isNested": true,
  "name": "apple",
  "packageNames": Array [
    "banana",
    "apple",
  ],
  "patchFilename": "banana++apple+0.4.2.patch",
  "path": "node_modules/banana/node_modules/apple",
  "pathSpecifier": "banana/apple",
  "sequenceName": undefined,
  "sequenceNumber": undefined,
  "version": "0.4.2",
}
`);
        expect(PackageDetails_1.getPackageDetailsFromPatchFilename("@types+banana++@types+apple++@mollusc+man+0.4.2-banana-tree.patch")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@types/banana => @types/apple => @mollusc/man",
  "isDevOnly": false,
  "isNested": true,
  "name": "@mollusc/man",
  "packageNames": Array [
    "@types/banana",
    "@types/apple",
    "@mollusc/man",
  ],
  "patchFilename": "@types+banana++@types+apple++@mollusc+man+0.4.2-banana-tree.patch",
  "path": "node_modules/@types/banana/node_modules/@types/apple/node_modules/@mollusc/man",
  "pathSpecifier": "@types/banana/@types/apple/@mollusc/man",
  "sequenceName": undefined,
  "sequenceNumber": undefined,
  "version": "0.4.2-banana-tree",
}
`);
        expect(PackageDetails_1.getPackageDetailsFromPatchFilename("@types+banana.patch++hello+0.4.2-banana-tree.patch")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@types/banana.patch => hello",
  "isDevOnly": false,
  "isNested": true,
  "name": "hello",
  "packageNames": Array [
    "@types/banana.patch",
    "hello",
  ],
  "patchFilename": "@types+banana.patch++hello+0.4.2-banana-tree.patch",
  "path": "node_modules/@types/banana.patch/node_modules/hello",
  "pathSpecifier": "@types/banana.patch/hello",
  "sequenceName": undefined,
  "sequenceNumber": undefined,
  "version": "0.4.2-banana-tree",
}
`);
        expect(PackageDetails_1.getPackageDetailsFromPatchFilename("@types+banana.patch++hello+0.4.2-banana-tree.dev.patch")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@types/banana.patch => hello",
  "isDevOnly": true,
  "isNested": true,
  "name": "hello",
  "packageNames": Array [
    "@types/banana.patch",
    "hello",
  ],
  "patchFilename": "@types+banana.patch++hello+0.4.2-banana-tree.dev.patch",
  "path": "node_modules/@types/banana.patch/node_modules/hello",
  "pathSpecifier": "@types/banana.patch/hello",
  "sequenceName": undefined,
  "sequenceNumber": undefined,
  "version": "0.4.2-banana-tree",
}
`);
    });
    it("works for ordered patches", () => {
        expect(PackageDetails_1.getPackageDetailsFromPatchFilename("left-pad+1.3.0+02+world"))
            .toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "left-pad",
  "isDevOnly": false,
  "isNested": false,
  "name": "left-pad",
  "packageNames": Array [
    "left-pad",
  ],
  "patchFilename": "left-pad+1.3.0+02+world",
  "path": "node_modules/left-pad",
  "pathSpecifier": "left-pad",
  "sequenceName": "world",
  "sequenceNumber": 2,
  "version": "1.3.0",
}
`);
        expect(PackageDetails_1.getPackageDetailsFromPatchFilename("@microsoft/api-extractor+2.0.0+01+FixThing")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@microsoft/api-extractor",
  "isDevOnly": false,
  "isNested": false,
  "name": "@microsoft/api-extractor",
  "packageNames": Array [
    "@microsoft/api-extractor",
  ],
  "patchFilename": "@microsoft/api-extractor+2.0.0+01+FixThing",
  "path": "node_modules/@microsoft/api-extractor",
  "pathSpecifier": "@microsoft/api-extractor",
  "sequenceName": "FixThing",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`);
    });
});
describe("getPatchDetailsFromCliString", () => {
    it("handles a minimal package name", () => {
        expect(PackageDetails_1.getPatchDetailsFromCliString("patch-package")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "patch-package",
  "isNested": false,
  "name": "patch-package",
  "packageNames": Array [
    "patch-package",
  ],
  "path": "node_modules/patch-package",
  "pathSpecifier": "patch-package",
}
`);
    });
    it("handles a scoped package name", () => {
        expect(PackageDetails_1.getPatchDetailsFromCliString("@david/patch-package")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@david/patch-package",
  "isNested": false,
  "name": "@david/patch-package",
  "packageNames": Array [
    "@david/patch-package",
  ],
  "path": "node_modules/@david/patch-package",
  "pathSpecifier": "@david/patch-package",
}
`);
    });
    it("handles a nested package name", () => {
        expect(PackageDetails_1.getPatchDetailsFromCliString("david/patch-package")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "david => patch-package",
  "isNested": true,
  "name": "patch-package",
  "packageNames": Array [
    "david",
    "patch-package",
  ],
  "path": "node_modules/david/node_modules/patch-package",
  "pathSpecifier": "david/patch-package",
}
`);
    });
    it("handles a nested package name with scopes", () => {
        expect(PackageDetails_1.getPatchDetailsFromCliString("@david/patch-package/banana")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@david/patch-package => banana",
  "isNested": true,
  "name": "banana",
  "packageNames": Array [
    "@david/patch-package",
    "banana",
  ],
  "path": "node_modules/@david/patch-package/node_modules/banana",
  "pathSpecifier": "@david/patch-package/banana",
}
`);
        expect(PackageDetails_1.getPatchDetailsFromCliString("@david/patch-package/@david/banana")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "@david/patch-package => @david/banana",
  "isNested": true,
  "name": "@david/banana",
  "packageNames": Array [
    "@david/patch-package",
    "@david/banana",
  ],
  "path": "node_modules/@david/patch-package/node_modules/@david/banana",
  "pathSpecifier": "@david/patch-package/@david/banana",
}
`);
        expect(PackageDetails_1.getPatchDetailsFromCliString("david/patch-package/@david/banana")).toMatchInlineSnapshot(`
Object {
  "humanReadablePathSpecifier": "david => patch-package => @david/banana",
  "isNested": true,
  "name": "@david/banana",
  "packageNames": Array [
    "david",
    "patch-package",
    "@david/banana",
  ],
  "path": "node_modules/david/node_modules/patch-package/node_modules/@david/banana",
  "pathSpecifier": "david/patch-package/@david/banana",
}
`);
    });
});
describe("parseNameAndVersion", () => {
    it("works for good-looking names", () => {
        expect(PackageDetails_1.parseNameAndVersion("lodash+2.3.4")).toMatchInlineSnapshot(`
Object {
  "packageName": "lodash",
  "version": "2.3.4",
}
`);
        expect(PackageDetails_1.parseNameAndVersion("patch-package+2.0.0-alpha.3"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "version": "2.0.0-alpha.3",
}
`);
    });
    it("works for scoped package names", () => {
        expect(PackageDetails_1.parseNameAndVersion("@react-spring+rafz+2.0.0-alpha.3"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "version": "2.0.0-alpha.3",
}
`);
        expect(PackageDetails_1.parseNameAndVersion("@microsoft+api-extractor+2.2.3"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "version": "2.2.3",
}
`);
    });
    it("works for ordered patches", () => {
        expect(PackageDetails_1.parseNameAndVersion("patch-package+2.0.0+01"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`);
        expect(PackageDetails_1.parseNameAndVersion("@react-spring+rafz+2.0.0-alpha.3+23"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "sequenceNumber": 23,
  "version": "2.0.0-alpha.3",
}
`);
        expect(PackageDetails_1.parseNameAndVersion("@microsoft+api-extractor+2.0.0+001"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`);
    });
    it("works for ordered patches with names", () => {
        expect(PackageDetails_1.parseNameAndVersion("patch-package+2.0.0+021+FixImportantThing"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "patch-package",
  "sequenceName": "FixImportantThing",
  "sequenceNumber": 21,
  "version": "2.0.0",
}
`);
        expect(PackageDetails_1.parseNameAndVersion("@react-spring+rafz+2.0.0-alpha.3+000023+Foo"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@react-spring/rafz",
  "sequenceName": "Foo",
  "sequenceNumber": 23,
  "version": "2.0.0-alpha.3",
}
`);
        expect(PackageDetails_1.parseNameAndVersion("@microsoft+api-extractor+2.0.0+001+Bar"))
            .toMatchInlineSnapshot(`
Object {
  "packageName": "@microsoft/api-extractor",
  "sequenceName": "Bar",
  "sequenceNumber": 1,
  "version": "2.0.0",
}
`);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGFja2FnZURldGFpbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9QYWNrYWdlRGV0YWlscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEscURBSXlCO0FBRXpCLFFBQVEsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7SUFDbEQsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEdBQUcsRUFBRTtRQUMxQyxNQUFNLENBQUMsbURBQWtDLENBQUMsMkJBQTJCLENBQUMsQ0FBQzthQUNwRSxxQkFBcUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FpQjVCLENBQUMsQ0FBQTtRQUVFLE1BQU0sQ0FDSixtREFBa0MsQ0FDaEMsbUVBQW1FLENBQ3BFLENBQ0YsQ0FBQyxxQkFBcUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBa0IzQixDQUFDLENBQUE7UUFFRSxNQUFNLENBQ0osbURBQWtDLENBQ2hDLG9EQUFvRCxDQUNyRCxDQUNGLENBQUMscUJBQXFCLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBaUIzQixDQUFDLENBQUE7UUFFRSxNQUFNLENBQ0osbURBQWtDLENBQ2hDLHdEQUF3RCxDQUN6RCxDQUNGLENBQUMscUJBQXFCLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7O0NBaUIzQixDQUFDLENBQUE7SUFDQSxDQUFDLENBQUMsQ0FBQTtJQUVGLEVBQUUsQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDbkMsTUFBTSxDQUFDLG1EQUFrQyxDQUFDLHlCQUF5QixDQUFDLENBQUM7YUFDbEUscUJBQXFCLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7Q0FnQjVCLENBQUMsQ0FBQTtRQUVFLE1BQU0sQ0FDSixtREFBa0MsQ0FDaEMsNENBQTRDLENBQzdDLENBQ0YsQ0FBQyxxQkFBcUIsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7OztDQWdCM0IsQ0FBQyxDQUFBO0lBQ0EsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDLENBQUMsQ0FBQTtBQUVGLFFBQVEs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QTtRQUNFLE1BQU0sQ0FBQyxvQ0FBbUIsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO2FBQ2xFLHFCQUFxQixDQUFDOzs7Ozs7O0NBTzVCLENBQUMsQ0FBQTtJQUNBLENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xyXG4gIGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUsXHJcbiAgZ2V0UGF0Y2hEZXRhaWxzRnJvbUNsaVN0cmluZyxcclxuICBwYXJzZU5hbWVBbmRWZXJzaW9uLFxyXG59IGZyb20gXCIuL1BhY2thZ2VEZXRhaWxzXCJcclxuXHJcbmRlc2NyaWJlKFwiZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZVwiLCAoKSA9PiB7XHJcbiAgaXQoXCJwYXJzZXMgbmV3LXN0eWxlIHBhdGNoIGZpbGVuYW1lc1wiLCAoKSA9PiB7XHJcbiAgICBleHBlY3QoZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcImJhbmFuYSsrYXBwbGUrMC40LjIucGF0Y2hcIikpXHJcbiAgICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJiYW5hbmEgPT4gYXBwbGVcIixcclxuICBcImlzRGV2T25seVwiOiBmYWxzZSxcclxuICBcImlzTmVzdGVkXCI6IHRydWUsXHJcbiAgXCJuYW1lXCI6IFwiYXBwbGVcIixcclxuICBcInBhY2thZ2VOYW1lc1wiOiBBcnJheSBbXHJcbiAgICBcImJhbmFuYVwiLFxyXG4gICAgXCJhcHBsZVwiLFxyXG4gIF0sXHJcbiAgXCJwYXRjaEZpbGVuYW1lXCI6IFwiYmFuYW5hKythcHBsZSswLjQuMi5wYXRjaFwiLFxyXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9iYW5hbmEvbm9kZV9tb2R1bGVzL2FwcGxlXCIsXHJcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwiYmFuYW5hL2FwcGxlXCIsXHJcbiAgXCJzZXF1ZW5jZU5hbWVcIjogdW5kZWZpbmVkLFxyXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogdW5kZWZpbmVkLFxyXG4gIFwidmVyc2lvblwiOiBcIjAuNC4yXCIsXHJcbn1cclxuYClcclxuXHJcbiAgICBleHBlY3QoXHJcbiAgICAgIGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUoXHJcbiAgICAgICAgXCJAdHlwZXMrYmFuYW5hKytAdHlwZXMrYXBwbGUrK0Btb2xsdXNjK21hbiswLjQuMi1iYW5hbmEtdHJlZS5wYXRjaFwiLFxyXG4gICAgICApLFxyXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJAdHlwZXMvYmFuYW5hID0+IEB0eXBlcy9hcHBsZSA9PiBAbW9sbHVzYy9tYW5cIixcclxuICBcImlzRGV2T25seVwiOiBmYWxzZSxcclxuICBcImlzTmVzdGVkXCI6IHRydWUsXHJcbiAgXCJuYW1lXCI6IFwiQG1vbGx1c2MvbWFuXCIsXHJcbiAgXCJwYWNrYWdlTmFtZXNcIjogQXJyYXkgW1xyXG4gICAgXCJAdHlwZXMvYmFuYW5hXCIsXHJcbiAgICBcIkB0eXBlcy9hcHBsZVwiLFxyXG4gICAgXCJAbW9sbHVzYy9tYW5cIixcclxuICBdLFxyXG4gIFwicGF0Y2hGaWxlbmFtZVwiOiBcIkB0eXBlcytiYW5hbmErK0B0eXBlcythcHBsZSsrQG1vbGx1c2MrbWFuKzAuNC4yLWJhbmFuYS10cmVlLnBhdGNoXCIsXHJcbiAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL0B0eXBlcy9iYW5hbmEvbm9kZV9tb2R1bGVzL0B0eXBlcy9hcHBsZS9ub2RlX21vZHVsZXMvQG1vbGx1c2MvbWFuXCIsXHJcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwiQHR5cGVzL2JhbmFuYS9AdHlwZXMvYXBwbGUvQG1vbGx1c2MvbWFuXCIsXHJcbiAgXCJzZXF1ZW5jZU5hbWVcIjogdW5kZWZpbmVkLFxyXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogdW5kZWZpbmVkLFxyXG4gIFwidmVyc2lvblwiOiBcIjAuNC4yLWJhbmFuYS10cmVlXCIsXHJcbn1cclxuYClcclxuXHJcbiAgICBleHBlY3QoXHJcbiAgICAgIGdldFBhY2thZ2VEZXRhaWxzRnJvbVBhdGNoRmlsZW5hbWUoXHJcbiAgICAgICAgXCJAdHlwZXMrYmFuYW5hLnBhdGNoKytoZWxsbyswLjQuMi1iYW5hbmEtdHJlZS5wYXRjaFwiLFxyXG4gICAgICApLFxyXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJAdHlwZXMvYmFuYW5hLnBhdGNoID0+IGhlbGxvXCIsXHJcbiAgXCJpc0Rldk9ubHlcIjogZmFsc2UsXHJcbiAgXCJpc05lc3RlZFwiOiB0cnVlLFxyXG4gIFwibmFtZVwiOiBcImhlbGxvXCIsXHJcbiAgXCJwYWNrYWdlTmFtZXNcIjogQXJyYXkgW1xyXG4gICAgXCJAdHlwZXMvYmFuYW5hLnBhdGNoXCIsXHJcbiAgICBcImhlbGxvXCIsXHJcbiAgXSxcclxuICBcInBhdGNoRmlsZW5hbWVcIjogXCJAdHlwZXMrYmFuYW5hLnBhdGNoKytoZWxsbyswLjQuMi1iYW5hbmEtdHJlZS5wYXRjaFwiLFxyXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9AdHlwZXMvYmFuYW5hLnBhdGNoL25vZGVfbW9kdWxlcy9oZWxsb1wiLFxyXG4gIFwicGF0aFNwZWNpZmllclwiOiBcIkB0eXBlcy9iYW5hbmEucGF0Y2gvaGVsbG9cIixcclxuICBcInNlcXVlbmNlTmFtZVwiOiB1bmRlZmluZWQsXHJcbiAgXCJzZXF1ZW5jZU51bWJlclwiOiB1bmRlZmluZWQsXHJcbiAgXCJ2ZXJzaW9uXCI6IFwiMC40LjItYmFuYW5hLXRyZWVcIixcclxufVxyXG5gKVxyXG5cclxuICAgIGV4cGVjdChcclxuICAgICAgZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcclxuICAgICAgICBcIkB0eXBlcytiYW5hbmEucGF0Y2grK2hlbGxvKzAuNC4yLWJhbmFuYS10cmVlLmRldi5wYXRjaFwiLFxyXG4gICAgICApLFxyXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJAdHlwZXMvYmFuYW5hLnBhdGNoID0+IGhlbGxvXCIsXHJcbiAgXCJpc0Rldk9ubHlcIjogdHJ1ZSxcclxuICBcImlzTmVzdGVkXCI6IHRydWUsXHJcbiAgXCJuYW1lXCI6IFwiaGVsbG9cIixcclxuICBcInBhY2thZ2VOYW1lc1wiOiBBcnJheSBbXHJcbiAgICBcIkB0eXBlcy9iYW5hbmEucGF0Y2hcIixcclxuICAgIFwiaGVsbG9cIixcclxuICBdLFxyXG4gIFwicGF0Y2hGaWxlbmFtZVwiOiBcIkB0eXBlcytiYW5hbmEucGF0Y2grK2hlbGxvKzAuNC4yLWJhbmFuYS10cmVlLmRldi5wYXRjaFwiLFxyXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9AdHlwZXMvYmFuYW5hLnBhdGNoL25vZGVfbW9kdWxlcy9oZWxsb1wiLFxyXG4gIFwicGF0aFNwZWNpZmllclwiOiBcIkB0eXBlcy9iYW5hbmEucGF0Y2gvaGVsbG9cIixcclxuICBcInNlcXVlbmNlTmFtZVwiOiB1bmRlZmluZWQsXHJcbiAgXCJzZXF1ZW5jZU51bWJlclwiOiB1bmRlZmluZWQsXHJcbiAgXCJ2ZXJzaW9uXCI6IFwiMC40LjItYmFuYW5hLXRyZWVcIixcclxufVxyXG5gKVxyXG4gIH0pXHJcblxyXG4gIGl0KFwid29ya3MgZm9yIG9yZGVyZWQgcGF0Y2hlc1wiLCAoKSA9PiB7XHJcbiAgICBleHBlY3QoZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcImxlZnQtcGFkKzEuMy4wKzAyK3dvcmxkXCIpKVxyXG4gICAgICAudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuT2JqZWN0IHtcclxuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwibGVmdC1wYWRcIixcclxuICBcImlzRGV2T25seVwiOiBmYWxzZSxcclxuICBcImlzTmVzdGVkXCI6IGZhbHNlLFxyXG4gIFwibmFtZVwiOiBcImxlZnQtcGFkXCIsXHJcbiAgXCJwYWNrYWdlTmFtZXNcIjogQXJyYXkgW1xyXG4gICAgXCJsZWZ0LXBhZFwiLFxyXG4gIF0sXHJcbiAgXCJwYXRjaEZpbGVuYW1lXCI6IFwibGVmdC1wYWQrMS4zLjArMDIrd29ybGRcIixcclxuICBcInBhdGhcIjogXCJub2RlX21vZHVsZXMvbGVmdC1wYWRcIixcclxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJsZWZ0LXBhZFwiLFxyXG4gIFwic2VxdWVuY2VOYW1lXCI6IFwid29ybGRcIixcclxuICBcInNlcXVlbmNlTnVtYmVyXCI6IDIsXHJcbiAgXCJ2ZXJzaW9uXCI6IFwiMS4zLjBcIixcclxufVxyXG5gKVxyXG5cclxuICAgIGV4cGVjdChcclxuICAgICAgZ2V0UGFja2FnZURldGFpbHNGcm9tUGF0Y2hGaWxlbmFtZShcclxuICAgICAgICBcIkBtaWNyb3NvZnQvYXBpLWV4dHJhY3RvcisyLjAuMCswMStGaXhUaGluZ1wiLFxyXG4gICAgICApLFxyXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJAbWljcm9zb2Z0L2FwaS1leHRyYWN0b3JcIixcclxuICBcImlzRGV2T25seVwiOiBmYWxzZSxcclxuICBcImlzTmVzdGVkXCI6IGZhbHNlLFxyXG4gIFwibmFtZVwiOiBcIkBtaWNyb3NvZnQvYXBpLWV4dHJhY3RvclwiLFxyXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcclxuICAgIFwiQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXHJcbiAgXSxcclxuICBcInBhdGNoRmlsZW5hbWVcIjogXCJAbWljcm9zb2Z0L2FwaS1leHRyYWN0b3IrMi4wLjArMDErRml4VGhpbmdcIixcclxuICBcInBhdGhcIjogXCJub2RlX21vZHVsZXMvQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXHJcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwiQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXHJcbiAgXCJzZXF1ZW5jZU5hbWVcIjogXCJGaXhUaGluZ1wiLFxyXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogMSxcclxuICBcInZlcnNpb25cIjogXCIyLjAuMFwiLFxyXG59XHJcbmApXHJcbiAgfSlcclxufSlcclxuXHJcbmRlc2NyaWJlKFwiZ2V0UGF0Y2hEZXRhaWxzRnJvbUNsaVN0cmluZ1wiLCAoKSA9PiB7XHJcbiAgaXQoXCJoYW5kbGVzIGEgbWluaW1hbCBwYWNrYWdlIG5hbWVcIiwgKCkgPT4ge1xyXG4gICAgZXhwZWN0KGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcoXCJwYXRjaC1wYWNrYWdlXCIpKS50b01hdGNoSW5saW5lU25hcHNob3QoXHJcbiAgICAgIGBcclxuT2JqZWN0IHtcclxuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwicGF0Y2gtcGFja2FnZVwiLFxyXG4gIFwiaXNOZXN0ZWRcIjogZmFsc2UsXHJcbiAgXCJuYW1lXCI6IFwicGF0Y2gtcGFja2FnZVwiLFxyXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcclxuICAgIFwicGF0Y2gtcGFja2FnZVwiLFxyXG4gIF0sXHJcbiAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL3BhdGNoLXBhY2thZ2VcIixcclxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJwYXRjaC1wYWNrYWdlXCIsXHJcbn1cclxuYCxcclxuICAgIClcclxuICB9KVxyXG5cclxuICBpdChcImhhbmRsZXMgYSBzY29wZWQgcGFja2FnZSBuYW1lXCIsICgpID0+IHtcclxuICAgIGV4cGVjdChcclxuICAgICAgZ2V0UGF0Y2hEZXRhaWxzRnJvbUNsaVN0cmluZyhcIkBkYXZpZC9wYXRjaC1wYWNrYWdlXCIpLFxyXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoXHJcbiAgICAgIGBcclxuT2JqZWN0IHtcclxuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwiQGRhdmlkL3BhdGNoLXBhY2thZ2VcIixcclxuICBcImlzTmVzdGVkXCI6IGZhbHNlLFxyXG4gIFwibmFtZVwiOiBcIkBkYXZpZC9wYXRjaC1wYWNrYWdlXCIsXHJcbiAgXCJwYWNrYWdlTmFtZXNcIjogQXJyYXkgW1xyXG4gICAgXCJAZGF2aWQvcGF0Y2gtcGFja2FnZVwiLFxyXG4gIF0sXHJcbiAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL0BkYXZpZC9wYXRjaC1wYWNrYWdlXCIsXHJcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwiQGRhdmlkL3BhdGNoLXBhY2thZ2VcIixcclxufVxyXG5gLFxyXG4gICAgKVxyXG4gIH0pXHJcblxyXG4gIGl0KFwiaGFuZGxlcyBhIG5lc3RlZCBwYWNrYWdlIG5hbWVcIiwgKCkgPT4ge1xyXG4gICAgZXhwZWN0KFxyXG4gICAgICBnZXRQYXRjaERldGFpbHNGcm9tQ2xpU3RyaW5nKFwiZGF2aWQvcGF0Y2gtcGFja2FnZVwiKSxcclxuICAgICkudG9NYXRjaElubGluZVNuYXBzaG90KFxyXG4gICAgICBgXHJcbk9iamVjdCB7XHJcbiAgXCJodW1hblJlYWRhYmxlUGF0aFNwZWNpZmllclwiOiBcImRhdmlkID0+IHBhdGNoLXBhY2thZ2VcIixcclxuICBcImlzTmVzdGVkXCI6IHRydWUsXHJcbiAgXCJuYW1lXCI6IFwicGF0Y2gtcGFja2FnZVwiLFxyXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcclxuICAgIFwiZGF2aWRcIixcclxuICAgIFwicGF0Y2gtcGFja2FnZVwiLFxyXG4gIF0sXHJcbiAgXCJwYXRoXCI6IFwibm9kZV9tb2R1bGVzL2RhdmlkL25vZGVfbW9kdWxlcy9wYXRjaC1wYWNrYWdlXCIsXHJcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwiZGF2aWQvcGF0Y2gtcGFja2FnZVwiLFxyXG59XHJcbmAsXHJcbiAgICApXHJcbiAgfSlcclxuXHJcbiAgaXQoXCJoYW5kbGVzIGEgbmVzdGVkIHBhY2thZ2UgbmFtZSB3aXRoIHNjb3Blc1wiLCAoKSA9PiB7XHJcbiAgICBleHBlY3QoXHJcbiAgICAgIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcoXCJAZGF2aWQvcGF0Y2gtcGFja2FnZS9iYW5hbmFcIiksXHJcbiAgICApLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChcclxuICAgICAgYFxyXG5PYmplY3Qge1xyXG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJAZGF2aWQvcGF0Y2gtcGFja2FnZSA9PiBiYW5hbmFcIixcclxuICBcImlzTmVzdGVkXCI6IHRydWUsXHJcbiAgXCJuYW1lXCI6IFwiYmFuYW5hXCIsXHJcbiAgXCJwYWNrYWdlTmFtZXNcIjogQXJyYXkgW1xyXG4gICAgXCJAZGF2aWQvcGF0Y2gtcGFja2FnZVwiLFxyXG4gICAgXCJiYW5hbmFcIixcclxuICBdLFxyXG4gIFwicGF0aFwiOiBcIm5vZGVfbW9kdWxlcy9AZGF2aWQvcGF0Y2gtcGFja2FnZS9ub2RlX21vZHVsZXMvYmFuYW5hXCIsXHJcbiAgXCJwYXRoU3BlY2lmaWVyXCI6IFwiQGRhdmlkL3BhdGNoLXBhY2thZ2UvYmFuYW5hXCIsXHJcbn1cclxuYCxcclxuICAgIClcclxuXHJcbiAgICBleHBlY3QoXHJcbiAgICAgIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcoXCJAZGF2aWQvcGF0Y2gtcGFja2FnZS9AZGF2aWQvYmFuYW5hXCIpLFxyXG4gICAgKS50b01hdGNoSW5saW5lU25hcHNob3QoXHJcbiAgICAgIGBcclxuT2JqZWN0IHtcclxuICBcImh1bWFuUmVhZGFibGVQYXRoU3BlY2lmaWVyXCI6IFwiQGRhdmlkL3BhdGNoLXBhY2thZ2UgPT4gQGRhdmlkL2JhbmFuYVwiLFxyXG4gIFwiaXNOZXN0ZWRcIjogdHJ1ZSxcclxuICBcIm5hbWVcIjogXCJAZGF2aWQvYmFuYW5hXCIsXHJcbiAgXCJwYWNrYWdlTmFtZXNcIjogQXJyYXkgW1xyXG4gICAgXCJAZGF2aWQvcGF0Y2gtcGFja2FnZVwiLFxyXG4gICAgXCJAZGF2aWQvYmFuYW5hXCIsXHJcbiAgXSxcclxuICBcInBhdGhcIjogXCJub2RlX21vZHVsZXMvQGRhdmlkL3BhdGNoLXBhY2thZ2Uvbm9kZV9tb2R1bGVzL0BkYXZpZC9iYW5hbmFcIixcclxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJAZGF2aWQvcGF0Y2gtcGFja2FnZS9AZGF2aWQvYmFuYW5hXCIsXHJcbn1cclxuYCxcclxuICAgIClcclxuXHJcbiAgICBleHBlY3QoXHJcbiAgICAgIGdldFBhdGNoRGV0YWlsc0Zyb21DbGlTdHJpbmcoXCJkYXZpZC9wYXRjaC1wYWNrYWdlL0BkYXZpZC9iYW5hbmFcIiksXHJcbiAgICApLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChcclxuICAgICAgYFxyXG5PYmplY3Qge1xyXG4gIFwiaHVtYW5SZWFkYWJsZVBhdGhTcGVjaWZpZXJcIjogXCJkYXZpZCA9PiBwYXRjaC1wYWNrYWdlID0+IEBkYXZpZC9iYW5hbmFcIixcclxuICBcImlzTmVzdGVkXCI6IHRydWUsXHJcbiAgXCJuYW1lXCI6IFwiQGRhdmlkL2JhbmFuYVwiLFxyXG4gIFwicGFja2FnZU5hbWVzXCI6IEFycmF5IFtcclxuICAgIFwiZGF2aWRcIixcclxuICAgIFwicGF0Y2gtcGFja2FnZVwiLFxyXG4gICAgXCJAZGF2aWQvYmFuYW5hXCIsXHJcbiAgXSxcclxuICBcInBhdGhcIjogXCJub2RlX21vZHVsZXMvZGF2aWQvbm9kZV9tb2R1bGVzL3BhdGNoLXBhY2thZ2Uvbm9kZV9tb2R1bGVzL0BkYXZpZC9iYW5hbmFcIixcclxuICBcInBhdGhTcGVjaWZpZXJcIjogXCJkYXZpZC9wYXRjaC1wYWNrYWdlL0BkYXZpZC9iYW5hbmFcIixcclxufVxyXG5gLFxyXG4gICAgKVxyXG4gIH0pXHJcbn0pXHJcblxyXG5kZXNjcmliZShcInBhcnNlTmFtZUFuZFZlcnNpb25cIiwgKCkgPT4ge1xyXG4gIGl0KFwid29ya3MgZm9yIGdvb2QtbG9va2luZyBuYW1lc1wiLCAoKSA9PiB7XHJcbiAgICBleHBlY3QocGFyc2VOYW1lQW5kVmVyc2lvbihcImxvZGFzaCsyLjMuNFwiKSkudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuT2JqZWN0IHtcclxuICBcInBhY2thZ2VOYW1lXCI6IFwibG9kYXNoXCIsXHJcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4zLjRcIixcclxufVxyXG5gKVxyXG4gICAgZXhwZWN0KHBhcnNlTmFtZUFuZFZlcnNpb24oXCJwYXRjaC1wYWNrYWdlKzIuMC4wLWFscGhhLjNcIikpXHJcbiAgICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwicGFja2FnZU5hbWVcIjogXCJwYXRjaC1wYWNrYWdlXCIsXHJcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjAtYWxwaGEuM1wiLFxyXG59XHJcbmApXHJcbiAgfSlcclxuICBpdChcIndvcmtzIGZvciBzY29wZWQgcGFja2FnZSBuYW1lc1wiLCAoKSA9PiB7XHJcbiAgICBleHBlY3QocGFyc2VOYW1lQW5kVmVyc2lvbihcIkByZWFjdC1zcHJpbmcrcmFmeisyLjAuMC1hbHBoYS4zXCIpKVxyXG4gICAgICAudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuT2JqZWN0IHtcclxuICBcInBhY2thZ2VOYW1lXCI6IFwiQHJlYWN0LXNwcmluZy9yYWZ6XCIsXHJcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjAtYWxwaGEuM1wiLFxyXG59XHJcbmApXHJcbiAgICBleHBlY3QocGFyc2VOYW1lQW5kVmVyc2lvbihcIkBtaWNyb3NvZnQrYXBpLWV4dHJhY3RvcisyLjIuM1wiKSlcclxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXHJcbk9iamVjdCB7XHJcbiAgXCJwYWNrYWdlTmFtZVwiOiBcIkBtaWNyb3NvZnQvYXBpLWV4dHJhY3RvclwiLFxyXG4gIFwidmVyc2lvblwiOiBcIjIuMi4zXCIsXHJcbn1cclxuYClcclxuICB9KVxyXG4gIGl0KFwid29ya3MgZm9yIG9yZGVyZWQgcGF0Y2hlc1wiLCAoKSA9PiB7XHJcbiAgICBleHBlY3QocGFyc2VOYW1lQW5kVmVyc2lvbihcInBhdGNoLXBhY2thZ2UrMi4wLjArMDFcIikpXHJcbiAgICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwicGFja2FnZU5hbWVcIjogXCJwYXRjaC1wYWNrYWdlXCIsXHJcbiAgXCJzZXF1ZW5jZU51bWJlclwiOiAxLFxyXG4gIFwidmVyc2lvblwiOiBcIjIuMC4wXCIsXHJcbn1cclxuYClcclxuICAgIGV4cGVjdChwYXJzZU5hbWVBbmRWZXJzaW9uKFwiQHJlYWN0LXNwcmluZytyYWZ6KzIuMC4wLWFscGhhLjMrMjNcIikpXHJcbiAgICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwicGFja2FnZU5hbWVcIjogXCJAcmVhY3Qtc3ByaW5nL3JhZnpcIixcclxuICBcInNlcXVlbmNlTnVtYmVyXCI6IDIzLFxyXG4gIFwidmVyc2lvblwiOiBcIjIuMC4wLWFscGhhLjNcIixcclxufVxyXG5gKVxyXG4gICAgZXhwZWN0KHBhcnNlTmFtZUFuZFZlcnNpb24oXCJAbWljcm9zb2Z0K2FwaS1leHRyYWN0b3IrMi4wLjArMDAxXCIpKVxyXG4gICAgICAudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuT2JqZWN0IHtcclxuICBcInBhY2thZ2VOYW1lXCI6IFwiQG1pY3Jvc29mdC9hcGktZXh0cmFjdG9yXCIsXHJcbiAgXCJzZXF1ZW5jZU51bWJlclwiOiAxLFxyXG4gIFwidmVyc2lvblwiOiBcIjIuMC4wXCIsXHJcbn1cclxuYClcclxuICB9KVxyXG5cclxuICBpdChcIndvcmtzIGZvciBvcmRlcmVkIHBhdGNoZXMgd2l0aCBuYW1lc1wiLCAoKSA9PiB7XHJcbiAgICBleHBlY3QocGFyc2VOYW1lQW5kVmVyc2lvbihcInBhdGNoLXBhY2thZ2UrMi4wLjArMDIxK0ZpeEltcG9ydGFudFRoaW5nXCIpKVxyXG4gICAgICAudG9NYXRjaElubGluZVNuYXBzaG90KGBcclxuT2JqZWN0IHtcclxuICBcInBhY2thZ2VOYW1lXCI6IFwicGF0Y2gtcGFja2FnZVwiLFxyXG4gIFwic2VxdWVuY2VOYW1lXCI6IFwiRml4SW1wb3J0YW50VGhpbmdcIixcclxuICBcInNlcXVlbmNlTnVtYmVyXCI6IDIxLFxyXG4gIFwidmVyc2lvblwiOiBcIjIuMC4wXCIsXHJcbn1cclxuYClcclxuICAgIGV4cGVjdChwYXJzZU5hbWVBbmRWZXJzaW9uKFwiQHJlYWN0LXNwcmluZytyYWZ6KzIuMC4wLWFscGhhLjMrMDAwMDIzK0Zvb1wiKSlcclxuICAgICAgLnRvTWF0Y2hJbmxpbmVTbmFwc2hvdChgXHJcbk9iamVjdCB7XHJcbiAgXCJwYWNrYWdlTmFtZVwiOiBcIkByZWFjdC1zcHJpbmcvcmFmelwiLFxyXG4gIFwic2VxdWVuY2VOYW1lXCI6IFwiRm9vXCIsXHJcbiAgXCJzZXF1ZW5jZU51bWJlclwiOiAyMyxcclxuICBcInZlcnNpb25cIjogXCIyLjAuMC1hbHBoYS4zXCIsXHJcbn1cclxuYClcclxuICAgIGV4cGVjdChwYXJzZU5hbWVBbmRWZXJzaW9uKFwiQG1pY3Jvc29mdCthcGktZXh0cmFjdG9yKzIuMC4wKzAwMStCYXJcIikpXHJcbiAgICAgIC50b01hdGNoSW5saW5lU25hcHNob3QoYFxyXG5PYmplY3Qge1xyXG4gIFwicGFja2FnZU5hbWVcIjogXCJAbWljcm9zb2Z0L2FwaS1leHRyYWN0b3JcIixcclxuICBcInNlcXVlbmNlTmFtZVwiOiBcIkJhclwiLFxyXG4gIFwic2VxdWVuY2VOdW1iZXJcIjogMSxcclxuICBcInZlcnNpb25cIjogXCIyLjAuMFwiLFxyXG59XHJcbmApXHJcbiAgfSlcclxufSlcclxuIl19
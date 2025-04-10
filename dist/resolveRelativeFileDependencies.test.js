"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resolveRelativeFileDependencies_1 = require("./resolveRelativeFileDependencies");
describe("resolveRelativeFileDependencies", () => {
    it("works for package.json", () => {
        const appRootPath = "/foo/bar";
        const resolutions = {
            absolute: "file:/not-foo/bar",
            relative: "file:../baz",
            remote: "git+https://blah.com/blah.git",
            version: "^434.34.34",
        };
        const expected = {
            absolute: "file:/not-foo/bar",
            relative: "file:/foo/baz",
            remote: "git+https://blah.com/blah.git",
            version: "^434.34.34",
        };
        expect(resolveRelativeFileDependencies_1.resolveRelativeFileDependencies(appRootPath, JSON.parse(JSON.stringify(resolutions)))).toEqual(expected);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb2x2ZVJlbGF0aXZlRmlsZURlcGVuZGVuY2llcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3Jlc29sdmVSZWxhdGl2ZUZpbGVEZXBlbmRlbmNpZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVGQUFtRjtBQUVuRixRQUFRLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO0lBQy9DLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDaEMsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFBO1FBRTlCLE1BQU0sV0FBVyxHQUFHO1lBQ2xCLFFBQVEsRUFBRSxtQkFBbUI7WUFDN0IsUUFBUSxFQUFFLGFBQWE7WUFDdkIsTUFBTSxFQUFFLCtCQUErQjtZQUN2QyxPQUFPLEVBQUUsWUFBWTtTQUN0QixDQUFBO1FBRUQsTUFBTSxRQUFRLEdBQUc7WUFDZixRQUFRLEVBQUUsbUJBQW1CO1lBQzdCLFFBQVEsRUFBRSxlQUFlO1lBQ3pCLE1BQU0sRUFBRSwrQkFBK0I7WUFDdkMsT0FBTyxFQUFFLFlBQVk7U0FDdEIsQ0FBQTtRQUVELE1BQU0sQ0FDSixpRUFBK0IsQ0FDN0IsV0FBVyxFQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUN4QyxDQUNGLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3JCLENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUFDLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByZXNvbHZlUmVsYXRpdmVGaWxlRGVwZW5kZW5jaWVzIH0gZnJvbSBcIi4vcmVzb2x2ZVJlbGF0aXZlRmlsZURlcGVuZGVuY2llc1wiXHJcblxyXG5kZXNjcmliZShcInJlc29sdmVSZWxhdGl2ZUZpbGVEZXBlbmRlbmNpZXNcIiwgKCkgPT4ge1xyXG4gIGl0KFwid29ya3MgZm9yIHBhY2thZ2UuanNvblwiLCAoKSA9PiB7XHJcbiAgICBjb25zdCBhcHBSb290UGF0aCA9IFwiL2Zvby9iYXJcIlxyXG5cclxuICAgIGNvbnN0IHJlc29sdXRpb25zID0ge1xyXG4gICAgICBhYnNvbHV0ZTogXCJmaWxlOi9ub3QtZm9vL2JhclwiLFxyXG4gICAgICByZWxhdGl2ZTogXCJmaWxlOi4uL2JhelwiLFxyXG4gICAgICByZW1vdGU6IFwiZ2l0K2h0dHBzOi8vYmxhaC5jb20vYmxhaC5naXRcIixcclxuICAgICAgdmVyc2lvbjogXCJeNDM0LjM0LjM0XCIsXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZXhwZWN0ZWQgPSB7XHJcbiAgICAgIGFic29sdXRlOiBcImZpbGU6L25vdC1mb28vYmFyXCIsXHJcbiAgICAgIHJlbGF0aXZlOiBcImZpbGU6L2Zvby9iYXpcIixcclxuICAgICAgcmVtb3RlOiBcImdpdCtodHRwczovL2JsYWguY29tL2JsYWguZ2l0XCIsXHJcbiAgICAgIHZlcnNpb246IFwiXjQzNC4zNC4zNFwiLFxyXG4gICAgfVxyXG5cclxuICAgIGV4cGVjdChcclxuICAgICAgcmVzb2x2ZVJlbGF0aXZlRmlsZURlcGVuZGVuY2llcyhcclxuICAgICAgICBhcHBSb290UGF0aCxcclxuICAgICAgICBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHJlc29sdXRpb25zKSksXHJcbiAgICAgICksXHJcbiAgICApLnRvRXF1YWwoZXhwZWN0ZWQpXHJcbiAgfSlcclxufSlcclxuIl19
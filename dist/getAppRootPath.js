"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAppRootPath = void 0;
const path_1 = require("./path");
const process_1 = __importDefault(require("process"));
const fs_extra_1 = require("fs-extra");
const getAppRootPath = () => {
    let cwd = process_1.default.cwd();
    while (!fs_extra_1.existsSync(path_1.join(cwd, "package.json"))) {
        const up = path_1.resolve(cwd, "../");
        if (up === cwd) {
            throw new Error("no package.json found for this project");
        }
        cwd = up;
    }
    return cwd;
};
exports.getAppRootPath = getAppRootPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0QXBwUm9vdFBhdGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvZ2V0QXBwUm9vdFBhdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsaUNBQXNDO0FBQ3RDLHNEQUE2QjtBQUM3Qix1Q0FBcUM7QUFFOUIsTUFBTSxjQUFjLEdBQUcsR0FBVyxFQUFFO0lBQ3pDLElBQUksR0FBRyxHQUFHLGlCQUFPLENBQUMsR0FBRyxFQUFFLENBQUE7SUFDdkIsT0FBTyxDQUFDLHFCQUFVLENBQUMsV0FBSSxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFO1FBQzdDLE1BQU0sRUFBRSxHQUFHLGNBQU8sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUIsSUFBSSxFQUFFLEtBQUssR0FBRyxFQUFFO1lBQ2QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFBO1NBQzFEO1FBQ0QsR0FBRyxHQUFHLEVBQUUsQ0FBQTtLQUNUO0lBQ0QsT0FBTyxHQUFHLENBQUE7QUFDWixDQUFDLENBQUE7QUFWWSxRQUFBLGNBQWMsa0JBVTFCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgam9pbiwgcmVzb2x2ZSB9IGZyb20gXCIuL3BhdGhcIlxyXG5pbXBvcnQgcHJvY2VzcyBmcm9tIFwicHJvY2Vzc1wiXHJcbmltcG9ydCB7IGV4aXN0c1N5bmMgfSBmcm9tIFwiZnMtZXh0cmFcIlxyXG5cclxuZXhwb3J0IGNvbnN0IGdldEFwcFJvb3RQYXRoID0gKCk6IHN0cmluZyA9PiB7XHJcbiAgbGV0IGN3ZCA9IHByb2Nlc3MuY3dkKClcclxuICB3aGlsZSAoIWV4aXN0c1N5bmMoam9pbihjd2QsIFwicGFja2FnZS5qc29uXCIpKSkge1xyXG4gICAgY29uc3QgdXAgPSByZXNvbHZlKGN3ZCwgXCIuLi9cIilcclxuICAgIGlmICh1cCA9PT0gY3dkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vIHBhY2thZ2UuanNvbiBmb3VuZCBmb3IgdGhpcyBwcm9qZWN0XCIpXHJcbiAgICB9XHJcbiAgICBjd2QgPSB1cFxyXG4gIH1cclxuICByZXR1cm4gY3dkXHJcbn1cclxuIl19
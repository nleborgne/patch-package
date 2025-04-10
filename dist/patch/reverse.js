"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reversePatch = void 0;
const parse_1 = require("./parse");
const assertNever_1 = require("../assertNever");
function reverseHunk(hunk) {
    const header = {
        original: hunk.header.patched,
        patched: hunk.header.original,
    };
    const parts = [];
    for (const part of hunk.parts) {
        switch (part.type) {
            case "context":
                parts.push(part);
                break;
            case "deletion":
                parts.push({
                    type: "insertion",
                    lines: part.lines,
                    noNewlineAtEndOfFile: part.noNewlineAtEndOfFile,
                });
                break;
            case "insertion":
                parts.push({
                    type: "deletion",
                    lines: part.lines,
                    noNewlineAtEndOfFile: part.noNewlineAtEndOfFile,
                });
                break;
            default:
                assertNever_1.assertNever(part.type);
        }
    }
    // swap insertions and deletions over so deletions always come first
    for (let i = 0; i < parts.length - 1; i++) {
        if (parts[i].type === "insertion" && parts[i + 1].type === "deletion") {
            const tmp = parts[i];
            parts[i] = parts[i + 1];
            parts[i + 1] = tmp;
            i += 1;
        }
    }
    const result = {
        header,
        parts,
        source: hunk.source,
    };
    parse_1.verifyHunkIntegrity(result);
    return result;
}
function reversePatchPart(part) {
    switch (part.type) {
        case "file creation":
            return {
                type: "file deletion",
                path: part.path,
                hash: part.hash,
                hunk: part.hunk && reverseHunk(part.hunk),
                mode: part.mode,
            };
        case "file deletion":
            return {
                type: "file creation",
                path: part.path,
                hunk: part.hunk && reverseHunk(part.hunk),
                mode: part.mode,
                hash: part.hash,
            };
        case "rename":
            return {
                type: "rename",
                fromPath: part.toPath,
                toPath: part.fromPath,
            };
        case "patch":
            return {
                type: "patch",
                path: part.path,
                hunks: part.hunks.map(reverseHunk),
                beforeHash: part.afterHash,
                afterHash: part.beforeHash,
            };
        case "mode change":
            return {
                type: "mode change",
                path: part.path,
                newMode: part.oldMode,
                oldMode: part.newMode,
            };
    }
}
const reversePatch = (patch) => {
    return patch.map(reversePatchPart).reverse();
};
exports.reversePatch = reversePatch;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV2ZXJzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9wYXRjaC9yZXZlcnNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQU1nQjtBQUNoQixnREFBNEM7QUFFNUMsU0FBUyxXQUFXLENBQUMsSUFBVTtJQUM3QixNQUFNLE1BQU0sR0FBZTtRQUN6QixRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPO1FBQzdCLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVE7S0FDOUIsQ0FBQTtJQUNELE1BQU0sS0FBSyxHQUFrQixFQUFFLENBQUE7SUFFL0IsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFO1FBQzdCLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRTtZQUNqQixLQUFLLFNBQVM7Z0JBQ1osS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDaEIsTUFBSztZQUNQLEtBQUssVUFBVTtnQkFDYixLQUFLLENBQUMsSUFBSSxDQUFDO29CQUNULElBQUksRUFBRSxXQUFXO29CQUNqQixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUs7b0JBQ2pCLG9CQUFvQixFQUFFLElBQUksQ0FBQyxvQkFBb0I7aUJBQ2hELENBQUMsQ0FBQTtnQkFDRixNQUFLO1lBQ1AsS0FBSyxXQUFXO2dCQUNkLEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ1QsSUFBSSxFQUFFLFVBQVU7b0JBQ2hCLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztvQkFDakIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLG9CQUFvQjtpQkFDaEQsQ0FBQyxDQUFBO2dCQUNGLE1BQUs7WUFDUDtnQkFDRSx5QkFBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUN6QjtLQUNGO0lBRUQsb0VBQW9FO0lBQ3BFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUN6QyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssV0FBVyxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRTtZQUNyRSxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDcEIsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDdkIsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUE7WUFDbEIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtTQUNQO0tBQ0Y7SUFFRCxNQUFNLE1BQU0sR0FBUztRQUNuQixNQUFNO1FBQ04sS0FBSztRQUNMLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtLQUNwQixDQUFBO0lBRUQsMkJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUE7SUFFM0IsT0FBTyxNQUFNLENBQUE7QUFDZixDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFtQjtJQUMzQyxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUU7UUFDakIsS0FBSyxlQUFlO1lBQ2xCLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ3pDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTthQUNoQixDQUFBO1FBQ0gsS0FBSyxlQUFlO1lBQ2xCLE9BQU87Z0JBQ0wsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDekMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTthQUNoQixDQUFBO1FBQ0gsS0FBSyxRQUFRO1lBQ1gsT0FBTztnQkFDTCxJQUFJLEVBQUUsUUFBUTtnQkFDZCxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ3JCLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUTthQUN0QixDQUFBO1FBQ0gsS0FBSyxPQUFPO1lBQ1YsT0FBTztnQkFDTCxJQUFJLEVBQUUsT0FBTztnQkFDYixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztnQkFDbEMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTO2dCQUMxQixTQUFTLEVBQUUsSUFBSSxDQUFDLFVBQVU7YUFDM0IsQ0FBQTtRQUNILEtBQUssYUFBYTtZQUNoQixPQUFPO2dCQUNMLElBQUksRUFBRSxhQUFhO2dCQUNuQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0JBQ2YsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87YUFDdEIsQ0FBQTtLQUNKO0FBQ0gsQ0FBQztBQUVNLE1BQU0sWUFBWSxHQUFHLENBQUMsS0FBc0IsRUFBbUIsRUFBRTtJQUN0RSxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUM5QyxDQUFDLENBQUE7QUFGWSxRQUFBLFlBQVksZ0JBRXhCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcclxuICBQYXJzZWRQYXRjaEZpbGUsXHJcbiAgUGF0Y2hGaWxlUGFydCxcclxuICBIdW5rLFxyXG4gIEh1bmtIZWFkZXIsXHJcbiAgdmVyaWZ5SHVua0ludGVncml0eSxcclxufSBmcm9tIFwiLi9wYXJzZVwiXHJcbmltcG9ydCB7IGFzc2VydE5ldmVyIH0gZnJvbSBcIi4uL2Fzc2VydE5ldmVyXCJcclxuXHJcbmZ1bmN0aW9uIHJldmVyc2VIdW5rKGh1bms6IEh1bmspOiBIdW5rIHtcclxuICBjb25zdCBoZWFkZXI6IEh1bmtIZWFkZXIgPSB7XHJcbiAgICBvcmlnaW5hbDogaHVuay5oZWFkZXIucGF0Y2hlZCxcclxuICAgIHBhdGNoZWQ6IGh1bmsuaGVhZGVyLm9yaWdpbmFsLFxyXG4gIH1cclxuICBjb25zdCBwYXJ0czogSHVua1tcInBhcnRzXCJdID0gW11cclxuXHJcbiAgZm9yIChjb25zdCBwYXJ0IG9mIGh1bmsucGFydHMpIHtcclxuICAgIHN3aXRjaCAocGFydC50eXBlKSB7XHJcbiAgICAgIGNhc2UgXCJjb250ZXh0XCI6XHJcbiAgICAgICAgcGFydHMucHVzaChwYXJ0KVxyXG4gICAgICAgIGJyZWFrXHJcbiAgICAgIGNhc2UgXCJkZWxldGlvblwiOlxyXG4gICAgICAgIHBhcnRzLnB1c2goe1xyXG4gICAgICAgICAgdHlwZTogXCJpbnNlcnRpb25cIixcclxuICAgICAgICAgIGxpbmVzOiBwYXJ0LmxpbmVzLFxyXG4gICAgICAgICAgbm9OZXdsaW5lQXRFbmRPZkZpbGU6IHBhcnQubm9OZXdsaW5lQXRFbmRPZkZpbGUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICBicmVha1xyXG4gICAgICBjYXNlIFwiaW5zZXJ0aW9uXCI6XHJcbiAgICAgICAgcGFydHMucHVzaCh7XHJcbiAgICAgICAgICB0eXBlOiBcImRlbGV0aW9uXCIsXHJcbiAgICAgICAgICBsaW5lczogcGFydC5saW5lcyxcclxuICAgICAgICAgIG5vTmV3bGluZUF0RW5kT2ZGaWxlOiBwYXJ0Lm5vTmV3bGluZUF0RW5kT2ZGaWxlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgYnJlYWtcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICBhc3NlcnROZXZlcihwYXJ0LnR5cGUpXHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBzd2FwIGluc2VydGlvbnMgYW5kIGRlbGV0aW9ucyBvdmVyIHNvIGRlbGV0aW9ucyBhbHdheXMgY29tZSBmaXJzdFxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoIC0gMTsgaSsrKSB7XHJcbiAgICBpZiAocGFydHNbaV0udHlwZSA9PT0gXCJpbnNlcnRpb25cIiAmJiBwYXJ0c1tpICsgMV0udHlwZSA9PT0gXCJkZWxldGlvblwiKSB7XHJcbiAgICAgIGNvbnN0IHRtcCA9IHBhcnRzW2ldXHJcbiAgICAgIHBhcnRzW2ldID0gcGFydHNbaSArIDFdXHJcbiAgICAgIHBhcnRzW2kgKyAxXSA9IHRtcFxyXG4gICAgICBpICs9IDFcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNvbnN0IHJlc3VsdDogSHVuayA9IHtcclxuICAgIGhlYWRlcixcclxuICAgIHBhcnRzLFxyXG4gICAgc291cmNlOiBodW5rLnNvdXJjZSxcclxuICB9XHJcblxyXG4gIHZlcmlmeUh1bmtJbnRlZ3JpdHkocmVzdWx0KVxyXG5cclxuICByZXR1cm4gcmVzdWx0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJldmVyc2VQYXRjaFBhcnQocGFydDogUGF0Y2hGaWxlUGFydCk6IFBhdGNoRmlsZVBhcnQge1xyXG4gIHN3aXRjaCAocGFydC50eXBlKSB7XHJcbiAgICBjYXNlIFwiZmlsZSBjcmVhdGlvblwiOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHR5cGU6IFwiZmlsZSBkZWxldGlvblwiLFxyXG4gICAgICAgIHBhdGg6IHBhcnQucGF0aCxcclxuICAgICAgICBoYXNoOiBwYXJ0Lmhhc2gsXHJcbiAgICAgICAgaHVuazogcGFydC5odW5rICYmIHJldmVyc2VIdW5rKHBhcnQuaHVuayksXHJcbiAgICAgICAgbW9kZTogcGFydC5tb2RlLFxyXG4gICAgICB9XHJcbiAgICBjYXNlIFwiZmlsZSBkZWxldGlvblwiOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHR5cGU6IFwiZmlsZSBjcmVhdGlvblwiLFxyXG4gICAgICAgIHBhdGg6IHBhcnQucGF0aCxcclxuICAgICAgICBodW5rOiBwYXJ0Lmh1bmsgJiYgcmV2ZXJzZUh1bmsocGFydC5odW5rKSxcclxuICAgICAgICBtb2RlOiBwYXJ0Lm1vZGUsXHJcbiAgICAgICAgaGFzaDogcGFydC5oYXNoLFxyXG4gICAgICB9XHJcbiAgICBjYXNlIFwicmVuYW1lXCI6XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdHlwZTogXCJyZW5hbWVcIixcclxuICAgICAgICBmcm9tUGF0aDogcGFydC50b1BhdGgsXHJcbiAgICAgICAgdG9QYXRoOiBwYXJ0LmZyb21QYXRoLFxyXG4gICAgICB9XHJcbiAgICBjYXNlIFwicGF0Y2hcIjpcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0eXBlOiBcInBhdGNoXCIsXHJcbiAgICAgICAgcGF0aDogcGFydC5wYXRoLFxyXG4gICAgICAgIGh1bmtzOiBwYXJ0Lmh1bmtzLm1hcChyZXZlcnNlSHVuayksXHJcbiAgICAgICAgYmVmb3JlSGFzaDogcGFydC5hZnRlckhhc2gsXHJcbiAgICAgICAgYWZ0ZXJIYXNoOiBwYXJ0LmJlZm9yZUhhc2gsXHJcbiAgICAgIH1cclxuICAgIGNhc2UgXCJtb2RlIGNoYW5nZVwiOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHR5cGU6IFwibW9kZSBjaGFuZ2VcIixcclxuICAgICAgICBwYXRoOiBwYXJ0LnBhdGgsXHJcbiAgICAgICAgbmV3TW9kZTogcGFydC5vbGRNb2RlLFxyXG4gICAgICAgIG9sZE1vZGU6IHBhcnQubmV3TW9kZSxcclxuICAgICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IHJldmVyc2VQYXRjaCA9IChwYXRjaDogUGFyc2VkUGF0Y2hGaWxlKTogUGFyc2VkUGF0Y2hGaWxlID0+IHtcclxuICByZXR1cm4gcGF0Y2gubWFwKHJldmVyc2VQYXRjaFBhcnQpLnJldmVyc2UoKVxyXG59XHJcbiJdfQ==
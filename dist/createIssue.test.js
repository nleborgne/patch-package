"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const createIssue_1 = require("./createIssue");
describe(createIssue_1.shouldRecommendIssue, () => {
    it("Allows most repos", () => {
        const eigen = createIssue_1.shouldRecommendIssue({
            org: "artsy",
            repo: "eigen",
            provider: "GitHub",
        });
        expect(eigen).toBeTruthy();
        const typescript = createIssue_1.shouldRecommendIssue({
            org: "Microsoft",
            repo: "TypeScript",
            provider: "GitHub",
        });
        expect(typescript).toBeTruthy();
    });
    it("does not recommend DefinitelyTyped", () => {
        const typescript = createIssue_1.shouldRecommendIssue({
            org: "DefinitelyTyped",
            repo: "DefinitelyTyped",
            provider: "GitHub",
        });
        expect(typescript).toBeFalsy();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlSXNzdWUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jcmVhdGVJc3N1ZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0NBQW9EO0FBRXBELFFBQVEsQ0FBQyxrQ0FBb0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtRQUMzQixNQUFNLEtBQUssR0FBRyxrQ0FBb0IsQ0FBQztZQUNqQyxHQUFHLEVBQUUsT0FBTztZQUNaLElBQUksRUFBRSxPQUFPO1lBQ2IsUUFBUSxFQUFFLFFBQVE7U0FDbkIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBRTFCLE1BQU0sVUFBVSxHQUFHLGtDQUFvQixDQUFDO1lBQ3RDLEdBQUcsRUFBRSxXQUFXO1lBQ2hCLElBQUksRUFBRSxZQUFZO1lBQ2xCLFFBQVEsRUFBRSxRQUFRO1NBQ25CLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLEVBQUUsQ0FBQyxvQ0FBb0MsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxVQUFVLEdBQUcsa0NBQW9CLENBQUM7WUFDdEMsR0FBRyxFQUFFLGlCQUFpQjtZQUN0QixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLFFBQVEsRUFBRSxRQUFRO1NBQ25CLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNoQyxDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgc2hvdWxkUmVjb21tZW5kSXNzdWUgfSBmcm9tIFwiLi9jcmVhdGVJc3N1ZVwiXHJcblxyXG5kZXNjcmliZShzaG91bGRSZWNvbW1lbmRJc3N1ZSwgKCkgPT4ge1xyXG4gIGl0KFwiQWxsb3dzIG1vc3QgcmVwb3NcIiwgKCkgPT4ge1xyXG4gICAgY29uc3QgZWlnZW4gPSBzaG91bGRSZWNvbW1lbmRJc3N1ZSh7XHJcbiAgICAgIG9yZzogXCJhcnRzeVwiLFxyXG4gICAgICByZXBvOiBcImVpZ2VuXCIsXHJcbiAgICAgIHByb3ZpZGVyOiBcIkdpdEh1YlwiLFxyXG4gICAgfSlcclxuICAgIGV4cGVjdChlaWdlbikudG9CZVRydXRoeSgpXHJcblxyXG4gICAgY29uc3QgdHlwZXNjcmlwdCA9IHNob3VsZFJlY29tbWVuZElzc3VlKHtcclxuICAgICAgb3JnOiBcIk1pY3Jvc29mdFwiLFxyXG4gICAgICByZXBvOiBcIlR5cGVTY3JpcHRcIixcclxuICAgICAgcHJvdmlkZXI6IFwiR2l0SHViXCIsXHJcbiAgICB9KVxyXG4gICAgZXhwZWN0KHR5cGVzY3JpcHQpLnRvQmVUcnV0aHkoKVxyXG4gIH0pXHJcblxyXG4gIGl0KFwiZG9lcyBub3QgcmVjb21tZW5kIERlZmluaXRlbHlUeXBlZFwiLCAoKSA9PiB7XHJcbiAgICBjb25zdCB0eXBlc2NyaXB0ID0gc2hvdWxkUmVjb21tZW5kSXNzdWUoe1xyXG4gICAgICBvcmc6IFwiRGVmaW5pdGVseVR5cGVkXCIsXHJcbiAgICAgIHJlcG86IFwiRGVmaW5pdGVseVR5cGVkXCIsXHJcbiAgICAgIHByb3ZpZGVyOiBcIkdpdEh1YlwiLFxyXG4gICAgfSlcclxuICAgIGV4cGVjdCh0eXBlc2NyaXB0KS50b0JlRmFsc3koKVxyXG4gIH0pXHJcbn0pXHJcbiJdfQ==
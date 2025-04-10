"use strict";
// tslint:disable
Object.defineProperty(exports, "__esModule", { value: true });
const parse_1 = require("../patch/parse");
const patch = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,5 @@
 this
 is
 
-a
+
 file
`;
const invalidHeaders1 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,4 @@
 this
 is
 
-a
+
 file
`;
const invalidHeaders2 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,4 +1,5 @@
 this
 is
 
-a
+
 file
`;
const invalidHeaders3 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,0 +1,5 @@
 this
 is
 
-a
+
 file
`;
const invalidHeaders4 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,0 @@
 this
 is
 
-a
+
 file
`;
const invalidHeaders5 = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,5@@
 this
 is
 
-a
+
 file
`;
const accidentalBlankLine = `diff --git a/banana.ts b/banana.ts
index 2de83dd..842652c 100644
--- a/banana.ts
+++ b/banana.ts
@@ -1,5 +1,5 @@
 this
 is

-a
+
 file
`;
const crlfLineBreaks = `diff --git a/banana.ts b/banana.ts
new file mode 100644
index 0000000..3e1267f
--- /dev/null
+++ b/banana.ts
@@ -0,0 +1 @@
+this is a new file
`.replace(/\n/g, "\r\n");
const modeChangeAndModifyAndRename = `diff --git a/numbers.txt b/banana.txt
old mode 100644
new mode 100755
similarity index 96%
rename from numbers.txt
rename to banana.txt
index fbf1785..92d2c5f
--- a/numbers.txt
+++ b/banana.txt
@@ -1,4 +1,4 @@
-one
+ne
 
 two
 
`;
const oldStylePatch = `patch-package
--- a/node_modules/graphql/utilities/assertValidName.js
+++ b/node_modules/graphql/utilities/assertValidName.js
@@ -41,10 +41,11 @@ function assertValidName(name) {
  */
 function isValidNameError(name, node) {
   !(typeof name === 'string') ? (0, _invariant2.default)(0, 'Expected string') : void 0;
-  if (name.length > 1 && name[0] === '_' && name[1] === '_') {
-    return new _GraphQLError.GraphQLError('Name "' + name + '" must not begin with "__", which is reserved by ' + 'GraphQL introspection.', node);
-  }
+  // if (name.length > 1 && name[0] === '_' && name[1] === '_') {
+  //   return new _GraphQLError.GraphQLError('Name "' + name + '" must not begin with "__", which is reserved by ' + 'GraphQL introspection.', node);
+  // }
   if (!NAME_RX.test(name)) {
     return new _GraphQLError.GraphQLError('Names must match /^[_a-zA-Z][_a-zA-Z0-9]*$/ but "' + name + '" does not.', node);
   }
+
 }
\\ No newline at end of file
--- a/node_modules/graphql/utilities/assertValidName.mjs
+++ b/node_modules/graphql/utilities/assertValidName.mjs
@@ -29,9 +29,9 @@ export function assertValidName(name) {
  */
 export function isValidNameError(name, node) {
   !(typeof name === 'string') ? invariant(0, 'Expected string') : void 0;
-  if (name.length > 1 && name[0] === '_' && name[1] === '_') {
-    return new GraphQLError('Name "' + name + '" must not begin with "__", which is reserved by ' + 'GraphQL introspection.', node);
-  }
+  // if (name.length > 1 && name[0] === '_' && name[1] === '_') {
+  //   return new GraphQLError('Name "' + name + '" must not begin with "__", which is reserved by ' + 'GraphQL introspection.', node);
+  // }
   if (!NAME_RX.test(name)) {
     return new GraphQLError('Names must match /^[_a-zA-Z][_a-zA-Z0-9]*$/ but "' + name + '" does not.', node);
   }
`;
describe("the patch parser", () => {
    it("works for a simple case", () => {
        expect(parse_1.parsePatchFile(patch)).toMatchSnapshot();
    });
    it("fails when the patch file has invalid headers", () => {
        expect(() => parse_1.parsePatchFile(invalidHeaders1)).toThrow();
        expect(() => parse_1.parsePatchFile(invalidHeaders2)).toThrow();
        expect(() => parse_1.parsePatchFile(invalidHeaders3)).toThrow();
        expect(() => parse_1.parsePatchFile(invalidHeaders4)).toThrow();
        expect(() => parse_1.parsePatchFile(invalidHeaders5)).toThrow();
    });
    it("is OK when blank lines are accidentally created", () => {
        expect(parse_1.parsePatchFile(accidentalBlankLine)).toEqual(parse_1.parsePatchFile(patch));
    });
    it(`can handle files with CRLF line breaks`, () => {
        expect(parse_1.parsePatchFile(crlfLineBreaks)).toMatchSnapshot();
    });
    it("works", () => {
        expect(parse_1.parsePatchFile(modeChangeAndModifyAndRename)).toMatchSnapshot();
        expect(parse_1.parsePatchFile(accidentalBlankLine)).toMatchSnapshot();
        expect(parse_1.parsePatchFile(modeChangeAndModifyAndRename)).toMatchSnapshot();
    });
    it.only("parses old-style patches", () => {
        expect(parse_1.parsePatchFile(oldStylePatch)).toMatchSnapshot();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyc2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9wYXRjaC9wYXJzZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxpQkFBaUI7O0FBRWpCLDBDQUErQztBQUUvQyxNQUFNLEtBQUssR0FBRzs7Ozs7Ozs7Ozs7Q0FXYixDQUFBO0FBQ0QsTUFBTSxlQUFlLEdBQUc7Ozs7Ozs7Ozs7O0NBV3ZCLENBQUE7QUFFRCxNQUFNLGVBQWUsR0FBRzs7Ozs7Ozs7Ozs7Q0FXdkIsQ0FBQTtBQUVELE1BQU0sZUFBZSxHQUFHOzs7Ozs7Ozs7OztDQVd2QixDQUFBO0FBQ0QsTUFBTSxlQUFlLEdBQUc7Ozs7Ozs7Ozs7O0NBV3ZCLENBQUE7QUFFRCxNQUFNLGVBQWUsR0FBRzs7Ozs7Ozs7Ozs7Q0FXdkIsQ0FBQTtBQUVELE1BQU0sbUJBQW1CLEdBQUc7Ozs7Ozs7Ozs7O0NBVzNCLENBQUE7QUFFRCxNQUFNLGNBQWMsR0FBRzs7Ozs7OztDQU90QixDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7QUFFeEIsTUFBTSw0QkFBNEIsR0FBRzs7Ozs7Ozs7Ozs7Ozs7O0NBZXBDLENBQUE7QUFFRCxNQUFNLGFBQWEsR0FBRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQWtDckIsQ0FBQTtBQUVELFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsRUFBRSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtRQUNqQyxNQUFNLENBQUMsc0JBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQ2pELENBQUMsQ0FBQyxDQUFBO0lBQ0YsRUFBRSxDQUFDLCtDQUErQyxFQUFFLEdBQUcsRUFBRTtRQUN2RCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsc0JBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxzQkFBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDdkQsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLHNCQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUN2RCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsc0JBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3ZELE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxzQkFBYyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDekQsQ0FBQyxDQUFDLENBQUE7SUFDRixFQUFFLENBQUMsaURBQWlELEVBQUUsR0FBRyxFQUFFO1FBQ3pELE1BQU0sQ0FBQyxzQkFBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsc0JBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQzVFLENBQUMsQ0FBQyxDQUFBO0lBQ0YsRUFBRSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtRQUNoRCxNQUFNLENBQUMsc0JBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFBO0lBQzFELENBQUMsQ0FBQyxDQUFBO0lBRUYsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7UUFDZixNQUFNLENBQUMsc0JBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUE7UUFFdEUsTUFBTSxDQUFDLHNCQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQzdELE1BQU0sQ0FBQyxzQkFBYyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQTtJQUN4RSxDQUFDLENBQUMsQ0FBQTtJQUVGLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLE1BQU0sQ0FBQyxzQkFBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUE7SUFDekQsQ0FBQyxDQUFDLENBQUE7QUFDSixDQUFDLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlXHJcblxyXG5pbXBvcnQgeyBwYXJzZVBhdGNoRmlsZSB9IGZyb20gXCIuLi9wYXRjaC9wYXJzZVwiXHJcblxyXG5jb25zdCBwYXRjaCA9IGBkaWZmIC0tZ2l0IGEvYmFuYW5hLnRzIGIvYmFuYW5hLnRzXHJcbmluZGV4IDJkZTgzZGQuLjg0MjY1MmMgMTAwNjQ0XHJcbi0tLSBhL2JhbmFuYS50c1xyXG4rKysgYi9iYW5hbmEudHNcclxuQEAgLTEsNSArMSw1IEBAXHJcbiB0aGlzXHJcbiBpc1xyXG4gXHJcbi1hXHJcbitcclxuIGZpbGVcclxuYFxyXG5jb25zdCBpbnZhbGlkSGVhZGVyczEgPSBgZGlmZiAtLWdpdCBhL2JhbmFuYS50cyBiL2JhbmFuYS50c1xyXG5pbmRleCAyZGU4M2RkLi44NDI2NTJjIDEwMDY0NFxyXG4tLS0gYS9iYW5hbmEudHNcclxuKysrIGIvYmFuYW5hLnRzXHJcbkBAIC0xLDUgKzEsNCBAQFxyXG4gdGhpc1xyXG4gaXNcclxuIFxyXG4tYVxyXG4rXHJcbiBmaWxlXHJcbmBcclxuXHJcbmNvbnN0IGludmFsaWRIZWFkZXJzMiA9IGBkaWZmIC0tZ2l0IGEvYmFuYW5hLnRzIGIvYmFuYW5hLnRzXHJcbmluZGV4IDJkZTgzZGQuLjg0MjY1MmMgMTAwNjQ0XHJcbi0tLSBhL2JhbmFuYS50c1xyXG4rKysgYi9iYW5hbmEudHNcclxuQEAgLTEsNCArMSw1IEBAXHJcbiB0aGlzXHJcbiBpc1xyXG4gXHJcbi1hXHJcbitcclxuIGZpbGVcclxuYFxyXG5cclxuY29uc3QgaW52YWxpZEhlYWRlcnMzID0gYGRpZmYgLS1naXQgYS9iYW5hbmEudHMgYi9iYW5hbmEudHNcclxuaW5kZXggMmRlODNkZC4uODQyNjUyYyAxMDA2NDRcclxuLS0tIGEvYmFuYW5hLnRzXHJcbisrKyBiL2JhbmFuYS50c1xyXG5AQCAtMSwwICsxLDUgQEBcclxuIHRoaXNcclxuIGlzXHJcbiBcclxuLWFcclxuK1xyXG4gZmlsZVxyXG5gXHJcbmNvbnN0IGludmFsaWRIZWFkZXJzNCA9IGBkaWZmIC0tZ2l0IGEvYmFuYW5hLnRzIGIvYmFuYW5hLnRzXHJcbmluZGV4IDJkZTgzZGQuLjg0MjY1MmMgMTAwNjQ0XHJcbi0tLSBhL2JhbmFuYS50c1xyXG4rKysgYi9iYW5hbmEudHNcclxuQEAgLTEsNSArMSwwIEBAXHJcbiB0aGlzXHJcbiBpc1xyXG4gXHJcbi1hXHJcbitcclxuIGZpbGVcclxuYFxyXG5cclxuY29uc3QgaW52YWxpZEhlYWRlcnM1ID0gYGRpZmYgLS1naXQgYS9iYW5hbmEudHMgYi9iYW5hbmEudHNcclxuaW5kZXggMmRlODNkZC4uODQyNjUyYyAxMDA2NDRcclxuLS0tIGEvYmFuYW5hLnRzXHJcbisrKyBiL2JhbmFuYS50c1xyXG5AQCAtMSw1ICsxLDVAQFxyXG4gdGhpc1xyXG4gaXNcclxuIFxyXG4tYVxyXG4rXHJcbiBmaWxlXHJcbmBcclxuXHJcbmNvbnN0IGFjY2lkZW50YWxCbGFua0xpbmUgPSBgZGlmZiAtLWdpdCBhL2JhbmFuYS50cyBiL2JhbmFuYS50c1xyXG5pbmRleCAyZGU4M2RkLi44NDI2NTJjIDEwMDY0NFxyXG4tLS0gYS9iYW5hbmEudHNcclxuKysrIGIvYmFuYW5hLnRzXHJcbkBAIC0xLDUgKzEsNSBAQFxyXG4gdGhpc1xyXG4gaXNcclxuXHJcbi1hXHJcbitcclxuIGZpbGVcclxuYFxyXG5cclxuY29uc3QgY3JsZkxpbmVCcmVha3MgPSBgZGlmZiAtLWdpdCBhL2JhbmFuYS50cyBiL2JhbmFuYS50c1xyXG5uZXcgZmlsZSBtb2RlIDEwMDY0NFxyXG5pbmRleCAwMDAwMDAwLi4zZTEyNjdmXHJcbi0tLSAvZGV2L251bGxcclxuKysrIGIvYmFuYW5hLnRzXHJcbkBAIC0wLDAgKzEgQEBcclxuK3RoaXMgaXMgYSBuZXcgZmlsZVxyXG5gLnJlcGxhY2UoL1xcbi9nLCBcIlxcclxcblwiKVxyXG5cclxuY29uc3QgbW9kZUNoYW5nZUFuZE1vZGlmeUFuZFJlbmFtZSA9IGBkaWZmIC0tZ2l0IGEvbnVtYmVycy50eHQgYi9iYW5hbmEudHh0XHJcbm9sZCBtb2RlIDEwMDY0NFxyXG5uZXcgbW9kZSAxMDA3NTVcclxuc2ltaWxhcml0eSBpbmRleCA5NiVcclxucmVuYW1lIGZyb20gbnVtYmVycy50eHRcclxucmVuYW1lIHRvIGJhbmFuYS50eHRcclxuaW5kZXggZmJmMTc4NS4uOTJkMmM1ZlxyXG4tLS0gYS9udW1iZXJzLnR4dFxyXG4rKysgYi9iYW5hbmEudHh0XHJcbkBAIC0xLDQgKzEsNCBAQFxyXG4tb25lXHJcbituZVxyXG4gXHJcbiB0d29cclxuIFxyXG5gXHJcblxyXG5jb25zdCBvbGRTdHlsZVBhdGNoID0gYHBhdGNoLXBhY2thZ2VcclxuLS0tIGEvbm9kZV9tb2R1bGVzL2dyYXBocWwvdXRpbGl0aWVzL2Fzc2VydFZhbGlkTmFtZS5qc1xyXG4rKysgYi9ub2RlX21vZHVsZXMvZ3JhcGhxbC91dGlsaXRpZXMvYXNzZXJ0VmFsaWROYW1lLmpzXHJcbkBAIC00MSwxMCArNDEsMTEgQEAgZnVuY3Rpb24gYXNzZXJ0VmFsaWROYW1lKG5hbWUpIHtcclxuICAqL1xyXG4gZnVuY3Rpb24gaXNWYWxpZE5hbWVFcnJvcihuYW1lLCBub2RlKSB7XHJcbiAgICEodHlwZW9mIG5hbWUgPT09ICdzdHJpbmcnKSA/ICgwLCBfaW52YXJpYW50Mi5kZWZhdWx0KSgwLCAnRXhwZWN0ZWQgc3RyaW5nJykgOiB2b2lkIDA7XHJcbi0gIGlmIChuYW1lLmxlbmd0aCA+IDEgJiYgbmFtZVswXSA9PT0gJ18nICYmIG5hbWVbMV0gPT09ICdfJykge1xyXG4tICAgIHJldHVybiBuZXcgX0dyYXBoUUxFcnJvci5HcmFwaFFMRXJyb3IoJ05hbWUgXCInICsgbmFtZSArICdcIiBtdXN0IG5vdCBiZWdpbiB3aXRoIFwiX19cIiwgd2hpY2ggaXMgcmVzZXJ2ZWQgYnkgJyArICdHcmFwaFFMIGludHJvc3BlY3Rpb24uJywgbm9kZSk7XHJcbi0gIH1cclxuKyAgLy8gaWYgKG5hbWUubGVuZ3RoID4gMSAmJiBuYW1lWzBdID09PSAnXycgJiYgbmFtZVsxXSA9PT0gJ18nKSB7XHJcbisgIC8vICAgcmV0dXJuIG5ldyBfR3JhcGhRTEVycm9yLkdyYXBoUUxFcnJvcignTmFtZSBcIicgKyBuYW1lICsgJ1wiIG11c3Qgbm90IGJlZ2luIHdpdGggXCJfX1wiLCB3aGljaCBpcyByZXNlcnZlZCBieSAnICsgJ0dyYXBoUUwgaW50cm9zcGVjdGlvbi4nLCBub2RlKTtcclxuKyAgLy8gfVxyXG4gICBpZiAoIU5BTUVfUlgudGVzdChuYW1lKSkge1xyXG4gICAgIHJldHVybiBuZXcgX0dyYXBoUUxFcnJvci5HcmFwaFFMRXJyb3IoJ05hbWVzIG11c3QgbWF0Y2ggL15bX2EtekEtWl1bX2EtekEtWjAtOV0qJC8gYnV0IFwiJyArIG5hbWUgKyAnXCIgZG9lcyBub3QuJywgbm9kZSk7XHJcbiAgIH1cclxuK1xyXG4gfVxyXG5cXFxcIE5vIG5ld2xpbmUgYXQgZW5kIG9mIGZpbGVcclxuLS0tIGEvbm9kZV9tb2R1bGVzL2dyYXBocWwvdXRpbGl0aWVzL2Fzc2VydFZhbGlkTmFtZS5tanNcclxuKysrIGIvbm9kZV9tb2R1bGVzL2dyYXBocWwvdXRpbGl0aWVzL2Fzc2VydFZhbGlkTmFtZS5tanNcclxuQEAgLTI5LDkgKzI5LDkgQEAgZXhwb3J0IGZ1bmN0aW9uIGFzc2VydFZhbGlkTmFtZShuYW1lKSB7XHJcbiAgKi9cclxuIGV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkTmFtZUVycm9yKG5hbWUsIG5vZGUpIHtcclxuICAgISh0eXBlb2YgbmFtZSA9PT0gJ3N0cmluZycpID8gaW52YXJpYW50KDAsICdFeHBlY3RlZCBzdHJpbmcnKSA6IHZvaWQgMDtcclxuLSAgaWYgKG5hbWUubGVuZ3RoID4gMSAmJiBuYW1lWzBdID09PSAnXycgJiYgbmFtZVsxXSA9PT0gJ18nKSB7XHJcbi0gICAgcmV0dXJuIG5ldyBHcmFwaFFMRXJyb3IoJ05hbWUgXCInICsgbmFtZSArICdcIiBtdXN0IG5vdCBiZWdpbiB3aXRoIFwiX19cIiwgd2hpY2ggaXMgcmVzZXJ2ZWQgYnkgJyArICdHcmFwaFFMIGludHJvc3BlY3Rpb24uJywgbm9kZSk7XHJcbi0gIH1cclxuKyAgLy8gaWYgKG5hbWUubGVuZ3RoID4gMSAmJiBuYW1lWzBdID09PSAnXycgJiYgbmFtZVsxXSA9PT0gJ18nKSB7XHJcbisgIC8vICAgcmV0dXJuIG5ldyBHcmFwaFFMRXJyb3IoJ05hbWUgXCInICsgbmFtZSArICdcIiBtdXN0IG5vdCBiZWdpbiB3aXRoIFwiX19cIiwgd2hpY2ggaXMgcmVzZXJ2ZWQgYnkgJyArICdHcmFwaFFMIGludHJvc3BlY3Rpb24uJywgbm9kZSk7XHJcbisgIC8vIH1cclxuICAgaWYgKCFOQU1FX1JYLnRlc3QobmFtZSkpIHtcclxuICAgICByZXR1cm4gbmV3IEdyYXBoUUxFcnJvcignTmFtZXMgbXVzdCBtYXRjaCAvXltfYS16QS1aXVtfYS16QS1aMC05XSokLyBidXQgXCInICsgbmFtZSArICdcIiBkb2VzIG5vdC4nLCBub2RlKTtcclxuICAgfVxyXG5gXHJcblxyXG5kZXNjcmliZShcInRoZSBwYXRjaCBwYXJzZXJcIiwgKCkgPT4ge1xyXG4gIGl0KFwid29ya3MgZm9yIGEgc2ltcGxlIGNhc2VcIiwgKCkgPT4ge1xyXG4gICAgZXhwZWN0KHBhcnNlUGF0Y2hGaWxlKHBhdGNoKSkudG9NYXRjaFNuYXBzaG90KClcclxuICB9KVxyXG4gIGl0KFwiZmFpbHMgd2hlbiB0aGUgcGF0Y2ggZmlsZSBoYXMgaW52YWxpZCBoZWFkZXJzXCIsICgpID0+IHtcclxuICAgIGV4cGVjdCgoKSA9PiBwYXJzZVBhdGNoRmlsZShpbnZhbGlkSGVhZGVyczEpKS50b1Rocm93KClcclxuICAgIGV4cGVjdCgoKSA9PiBwYXJzZVBhdGNoRmlsZShpbnZhbGlkSGVhZGVyczIpKS50b1Rocm93KClcclxuICAgIGV4cGVjdCgoKSA9PiBwYXJzZVBhdGNoRmlsZShpbnZhbGlkSGVhZGVyczMpKS50b1Rocm93KClcclxuICAgIGV4cGVjdCgoKSA9PiBwYXJzZVBhdGNoRmlsZShpbnZhbGlkSGVhZGVyczQpKS50b1Rocm93KClcclxuICAgIGV4cGVjdCgoKSA9PiBwYXJzZVBhdGNoRmlsZShpbnZhbGlkSGVhZGVyczUpKS50b1Rocm93KClcclxuICB9KVxyXG4gIGl0KFwiaXMgT0sgd2hlbiBibGFuayBsaW5lcyBhcmUgYWNjaWRlbnRhbGx5IGNyZWF0ZWRcIiwgKCkgPT4ge1xyXG4gICAgZXhwZWN0KHBhcnNlUGF0Y2hGaWxlKGFjY2lkZW50YWxCbGFua0xpbmUpKS50b0VxdWFsKHBhcnNlUGF0Y2hGaWxlKHBhdGNoKSlcclxuICB9KVxyXG4gIGl0KGBjYW4gaGFuZGxlIGZpbGVzIHdpdGggQ1JMRiBsaW5lIGJyZWFrc2AsICgpID0+IHtcclxuICAgIGV4cGVjdChwYXJzZVBhdGNoRmlsZShjcmxmTGluZUJyZWFrcykpLnRvTWF0Y2hTbmFwc2hvdCgpXHJcbiAgfSlcclxuXHJcbiAgaXQoXCJ3b3Jrc1wiLCAoKSA9PiB7XHJcbiAgICBleHBlY3QocGFyc2VQYXRjaEZpbGUobW9kZUNoYW5nZUFuZE1vZGlmeUFuZFJlbmFtZSkpLnRvTWF0Y2hTbmFwc2hvdCgpXHJcblxyXG4gICAgZXhwZWN0KHBhcnNlUGF0Y2hGaWxlKGFjY2lkZW50YWxCbGFua0xpbmUpKS50b01hdGNoU25hcHNob3QoKVxyXG4gICAgZXhwZWN0KHBhcnNlUGF0Y2hGaWxlKG1vZGVDaGFuZ2VBbmRNb2RpZnlBbmRSZW5hbWUpKS50b01hdGNoU25hcHNob3QoKVxyXG4gIH0pXHJcblxyXG4gIGl0Lm9ubHkoXCJwYXJzZXMgb2xkLXN0eWxlIHBhdGNoZXNcIiwgKCkgPT4ge1xyXG4gICAgZXhwZWN0KHBhcnNlUGF0Y2hGaWxlKG9sZFN0eWxlUGF0Y2gpKS50b01hdGNoU25hcHNob3QoKVxyXG4gIH0pXHJcbn0pXHJcbiJdfQ==
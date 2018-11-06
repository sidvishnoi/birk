const { readFileSync } = require("fs");
const { join } = require("path");

module.exports.getFixtures = function getFixtures(filename) {
  const file = join(process.cwd(), filename);
  const lines = readFileSync(file, "utf8").split("\n");

  const fixtures = [];
  let testId = 0;

  for (let i = 0; i < lines.length; ) {
    const testStart = i;
    if (!lines[testStart].startsWith("### ")) {
      throw new Error(`Malformed fixtures. line: ${i}`);
    }
    const title = lines[testStart].replace("### ", "").trim();

    i += 1;

    const optionsStart = lines.indexOf("``` json", i);
    const optionsEnd = lines.indexOf("```", optionsStart + 1);
    const options = JSON.parse(
      lines.slice(optionsStart + 1, optionsEnd).join("\n")
    );

    const inputStart = lines.indexOf("``` birk", optionsEnd + 1);
    const inputEnd = lines.indexOf("```", inputStart + 1);
    const input = lines.slice(inputStart + 1, inputEnd).join("\n");

    const expectedStart = lines.indexOf("``` html", inputEnd + 1);
    const expectedEnd = lines.indexOf("```", expectedStart + 1);
    const expected = lines.slice(expectedStart + 1, expectedEnd).join("\n");

    ++testId;

    i = lines.indexOf("---", expectedEnd);

    fixtures.push({
      title,
      testId,
      line: testStart,
      input,
      options,
      expected
    });

    if (i === -1) break;
    i += 1;

    if (testId > 200) {
      // failsafe
      console.log(Object.keys(fixtures));
      throw new Error("Some error in fixture parsing");
    }
  }

  return fixtures;
};

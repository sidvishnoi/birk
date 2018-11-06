const Table = require("easy-table");

const colors = {
  bgRed: "\x1b[41m",
  fgRed: "\x1b[31m",
  fgWhite: "\x1b[37m",
  fgGreen: "\x1b[32m",
  fgYellow: "\x1b[33m",
  reset: "\x1b[0m"
};

module.exports.displayFailure = function displayFailure(fixture) {
  const expected = fixture.expected.split("\n");
  const reality = fixture.actual.split("\n");

  // make both havee equal number of lines
  if (reality.length !== expected.length) {
    const maxLen = Math.max(expected.length, reality.length);
    reality.push(..." ".repeat(maxLen - reality.length).split(" "));
    expected.push(..." ".repeat(maxLen - expected.length).split(" "));
  }

  const table = new Table();

  let printLen = 0;
  let printLen1 = 0;
  let printLen2 = 0;
  expected.forEach((_, i) => {
    const color =
      expected[i] !== reality[i] ? colors.bgRed + colors.fgWhite : "";
    table.cell("Expectation", color + expected[i] + colors.reset);
    table.cell("Reality", color + reality[i] + colors.reset);
    printLen1 = Math.max(printLen1, expected[i].length);
    printLen2 = Math.max(printLen2, reality[i].length);
    printLen = Math.max(printLen, printLen1 + printLen2 + 2);
    table.newRow();
  });

  const style1 = "-".repeat(printLen);
  const style2 = "=".repeat(printLen);

  const str = [
    "",
    colors.fgRed + style2,
    `>> supported.txt #${fixture.line} (test #${fixture.testId})`,
    ` @ ${fixture.title}`,
    style1 + colors.reset,
    "Input:",
    colors.fgYellow + fixture.input + colors.reset,
    style1,
    table.toString(),
    colors.fgRed + style2 + colors.reset
  ].join("\n");

  console.log(str);
};

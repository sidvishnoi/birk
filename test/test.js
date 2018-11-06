const { getFixtures } = require("./support/get-fixtures");
const { displayFailure } = require("./support/display-failure");

const breakOnFail = process.argv.includes("--break");
// const { render } = require("../src/");

const fixtures = getFixtures("./test/fixtures/render.md");

const stats = { total: fixtures.length, passed: 0, failed: 0 };
const failing = [];

for (const fixture of fixtures) {
  const output = render(fixture.input);
  if (output.trim() === fixture.expected.trim()) {
    ++stats.passed;
    console.log(`✔  ${fixture.title}`);
  } else {
    ++stats.failed;
    fixture.actual = output;
    failing.push(fixture);
    console.log(`❌  ${fixture.title}`);
    if (breakOnFail) break;
  }
}

failing.forEach(displayFailure);
console.log(stats);
if (stats.failed !== 0) {
  process.exit(1);
}

module.exports = {
  collectCoverage: true,
  coverageDirectory: "./__test__/coverage",
  collectCoverageFrom: ["**/build/node.js"],
  testEnvironment: "node",
  watchPathIgnorePatterns: ["node_modules/", "src/"]
};

module.exports = {
  collectCoverage: true,
  coverageDirectory: "./__test__/coverage",
  collectCoverageFrom: ["**/build/index.js"],
  testEnvironment: "node",
  watchPathIgnorePatterns: ["node_modules/", "src/"]
};

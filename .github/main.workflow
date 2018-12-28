workflow "Test" {
  on = "push"
  resolves = ["Run tests"]
}

action "Install dependencies" {
  uses = "actions/npm@e7aaefe"
  args = "install"
}

action "Build" {
  uses = "actions/npm@e7aaefe"
  needs = ["Install dependencies"]
  args = "run build:dev"
}

action "Run tests" {
  uses = "actions/npm@e7aaefe"
  needs = ["Build"]
  args = "test"
}

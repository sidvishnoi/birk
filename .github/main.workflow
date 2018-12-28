workflow "Test" {
  on = "push"
  resolves = ["test"]
}

action "install" {
  uses = "actions/npm@e7aaefe"
  runs = "install"
}

action "build" {
  uses = "actions/npm@e7aaefe"
  runs = "build:dev"
  needs = ["install"]
}

action "test" {
  uses = "actions/npm@e7aaefe"
  needs = ["build"]
  runs = "test"
}

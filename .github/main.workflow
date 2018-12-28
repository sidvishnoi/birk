workflow "Test" {
  on = "push"
  resolves = [
    "Run tests",
    "Check if branch is master",
  ]
}

action "Install dependencies" {
  uses = "actions/npm@e7aaefe"
  needs = ["Check if branch is master"]
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

action "Check if branch is master" {
  uses = "actions/bin/filter@b2bea07"
  args = "branch master"
}

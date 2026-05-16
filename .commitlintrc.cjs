const ignoredLinePrefixes = ["Agent-Logs-Url:"];

const hasIgnoredPrefix = (line) =>
  ignoredLinePrefixes.some((prefix) => line.startsWith(prefix));

const isWithinMaxLength = (value = "", max = 100) =>
  value
    .split(/\r?\n/)
    .filter((line) => !hasIgnoredPrefix(line))
    .every((line) => line.length <= max);

const createLineLengthRule = (part) => (parsed, _when = "always", max = 100) => {
  const value = parsed[part] ?? "";

  return [
    isWithinMaxLength(value, max),
    `${part}'s lines must not be longer than ${max} characters`,
  ];
};

module.exports = {
  extends: ["@commitlint/config-conventional"],
  plugins: [
    {
      rules: {
        "body-max-line-length-ignore-agent-logs": createLineLengthRule("body"),
        "footer-max-line-length-ignore-agent-logs": createLineLengthRule("footer"),
      },
    },
  ],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "refactor",
        "perf",
        "test",
        "docs",
        "chore",
        "ci",
        "revert",
      ],
    ],
    "type-empty": [1, "never"],
    "subject-empty": [1, "never"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
    "subject-case": [0, "always"],
    "body-max-line-length": [0, "always", 100],
    "body-max-line-length-ignore-agent-logs": [2, "always", 100],
    "footer-max-line-length": [0, "always", 100],
    "footer-max-line-length-ignore-agent-logs": [2, "always", 100],
  },
};

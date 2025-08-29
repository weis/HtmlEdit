function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error((message ? message + ' - ' : '') + `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

module.exports = { assert, equal };


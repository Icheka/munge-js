import {
  isDigit,
  isIdentifier,
  isNewLine,
  isReservedToken,
  isSpace,
} from "../../src/lexer";

describe("isDigit", () => {
  it("should accurately recognise digits", () => {
    const tests = [
      { value: "1", expected: true },
      { value: "0", expected: true },
      { value: "a", expected: false },
      { value: "", expected: false },
      { value: ".", expected: false },
      { value: "_", expected: false },
    ];

    tests.forEach(({ expected, value }) => {
      expect(isDigit(value)).toBe(expected);
    });
  });
});

describe("isIdentifier", () => {
  it("should accurately recognise identifiers", () => {
    const tests = [
      { value: "1", expected: true },
      { value: "a", expected: true },
      { value: "_", expected: true },
      { value: "+", expected: true },
      { value: "-", expected: true },
      { value: ";", expected: true },
      { value: ",", expected: false },
      { value: "=", expected: false },
      { value: "(", expected: false },
      { value: ")", expected: false },
    ];

    tests.forEach(({ expected, value }) => {
      expect(isIdentifier(value)).toBe(expected);
    });
  });
});

describe("isReservedToken", () => {
  it("should accurately recognise reserved tokens", () => {
    const tests = [
      { value: "1", expected: false },
      { value: "a", expected: false },
      { value: "_", expected: false },
      { value: "+", expected: false },
      { value: "-", expected: false },
      { value: ";", expected: false },
      { value: ",", expected: true },
      { value: "=", expected: true },
      { value: "(", expected: true },
      { value: ")", expected: true },
    ];

    tests.forEach(({ expected, value }) => {
      expect(isReservedToken(value)).toBe(expected);
    });
  });
});

describe("isSpace", () => {
  it("should accurately recognise spaces", () => {
    const tests = [
      { value: "1", expected: false },
      { value: "\n", expected: false },
      { value: "\t", expected: true },
      { value: "s", expected: false },
      { value: "a", expected: false },
      { value: "", expected: false },
      { value: " ", expected: true },
    ];

    tests.forEach(({ expected, value }) => {
      expect(isSpace(value)).toBe(expected);
    });
  });
});

describe("isNewLine", () => {
  it("should accurately recognise newlines", () => {
    const tests = [
      { value: "1", expected: false },
      { value: "\n", expected: true },
      { value: "\t", expected: true },
      { value: "s", expected: false },
      { value: "a", expected: false },
      { value: "", expected: false },
      { value: " ", expected: true },
    ];

    tests.forEach(({ expected, value }) => {
      expect(isNewLine(value)).toBe(expected);
    });
  });
});

import Lexer, { ReservedTokens } from "../../src/lexer";
import Parser, { AssignmentStatement } from "../../src/parser";

describe("parseRangeStatement", () => {
  it("correctly parses an index statement", () => {
    const node = new Parser(new Lexer("(0)")).parseRangeStatement();

    expect(node.start).toBe("0");
    expect(node.end).toBe("0");
  });

  it("correctly parses an indefinite range statement", () => {
    const node = new Parser(new Lexer("(2,)")).parseRangeStatement();

    expect(node.start).toBe("2");
    expect(node.end).toBe(undefined);
  });

  it("correctly parses a definite range statement", () => {
    const node = new Parser(new Lexer("(2,4)")).parseRangeStatement();

    expect(node.start).toBe("2");
    expect(node.end).toBe("4");
  });

  it("expects an integer after the LPAREN", () => {
    const tests = [
      {
        input: "()",
        error: "Unexpected token. Expected INTEGER, got RPAREN",
      },
      {
        input: "(,)",
        error: "Unexpected token. Expected INTEGER, got DELIMITER",
      },
      {
        input: "(",
        error: "Unexpected token. Expected INTEGER, got EOF",
      },
    ];

    tests.forEach(({ error, input }) => {
      expect(() => {
        new Parser(new Lexer(input)).parseRangeStatement();
      }).toThrowError(error);
    });
  });
});

describe("advanceAndAssertThatNextTokenIs", () => {
  it("advances the lexer to the next token", () => {
    const parser = new Parser(new Lexer("intro = div#intro"));

    parser.advanceAndAssertThatNextTokenIs("EQUALS");

    expect(parser.currentToken.type).toBe("EQUALS");
    expect(parser.currentToken.value).toBe(ReservedTokens.EQUALS);
  });
});

describe("parseStatement", () => {
  const tests = [
    {
      input: "intro = div#intro",
      identifier: "intro",
      selector: "div#intro",
      start: undefined,
      end: undefined,
    },
    {
      input: "intro = div#intro (0)",
      identifier: "intro",
      selector: "div#intro",
      start: "0",
      end: "0",
    },
    {
      input: "intro = div#intro (0,)",
      identifier: "intro",
      selector: "div#intro",
      start: "0",
      end: undefined,
    },
    {
      input: "intro = div#intro (0,1)",
      identifier: "intro",
      selector: "div#intro",
      start: "0",
      end: "1",
    },
    {
      input: "intro = div#intro {text}",
      identifier: "intro",
      selector: "div#intro",
      start: undefined,
      end: undefined,
      attributes: ["text"],
    },
    {
      input: "intro = div#intro {text} (0)",
      identifier: "intro",
      selector: "div#intro",
      start: "0",
      end: "0",
      attributes: ["text"],
    },
    {
      input: "intro = div#intro {text} (0, 1)",
      identifier: "intro",
      selector: "div#intro",
      start: "0",
      end: "1",
      attributes: ["text"],
    },
    {
      input: "intro = div#intro {text} (0,)",
      identifier: "intro",
      selector: "div#intro",
      start: "0",
      end: undefined,
      attributes: ["text"],
    },
    {
      input: "intro = div#intro {text, class} (0,)",
      identifier: "intro",
      selector: "div#intro",
      start: "0",
      end: undefined,
      attributes: ["text", "class"],
    },
  ];

  tests.forEach(({ input, ...args }) => {
    testParseStatement(input, {
      ...args,
    });
  });
});

describe("parse", () => {
  it("returns an AST of tokens", () => {
    const input = `
    intro = div#intro (0)
    twitterLink = a.social-links (1,)
    `;
    const chunks = input.split("\n").slice(1, -1);

    testParseStatement(chunks[0], {
      identifier: "intro",
      selector: "div#intro",
      start: "0",
      end: "0",
    });
    testParseStatement(chunks[1], {
      identifier: "twitterLink",
      selector: "a.social-links",
      start: "1",
      end: undefined,
    });
  });
});

function testParseStatement(
  input: string,
  {
    end,
    identifier,
    selector,
    start,
    attributes,
  }: {
    identifier: string;
    selector: string;
    start?: string;
    end?: string;
    attributes?: Array<string>;
  }
) {
  const parser = new Parser(new Lexer(input));
  const statement = parser.parseStatement();

  expect(statement instanceof AssignmentStatement).toBeTruthy();
  expect((statement as AssignmentStatement).identifier).toBe(identifier);
  expect((statement as AssignmentStatement).selection.selector).toBe(selector);
  expect((statement as AssignmentStatement).selection.range.start).toBe(start);
  expect((statement as AssignmentStatement).selection.range.end).toBe(end);

  if (attributes) {
    expect(
      Array.isArray((statement as AssignmentStatement).selection.attributes)
    ).toBeTruthy();
    expect(
      (statement as AssignmentStatement).selection.attributes?.sort()
    ).toEqual(attributes.sort());
  }
}

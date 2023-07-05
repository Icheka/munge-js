export enum ReservedTokens {
  LPAREN = "(",
  RPAREN = ")",
  DELIMITER = ",",
  EQUALS = "=",
  NEWLINE = "\n",
}

export enum TokenTypes {
  IDENTIFIER = "IDENTIFIER",
  RESERVED = "RESERVED  ",
  INTEGER = "INTEGER",
  EOF = "EOF",
}

const reservedTokens: Record<string, ReservedTokens> = Object.entries(
  ReservedTokens
).reduce(
  (curr, [v, k]) => ({
    ...curr,
    [k]: v,
  }),
  {}
);

export function isDigit(value: string) {
  return /\d/.test(value);
}

export function isIdentifier(value: string) {
  return (
    isDigit(value) ||
    (!isSpace(value) && !isNewLine(value) && !isReservedToken(value))
  );
}

export function isReservedToken(value: string) {
  const tokens = Object.values(ReservedTokens);
  return tokens.includes(value as any);
}

export function isSpace(value: string) {
  return /\s/.test(value) && !isNewLine(value);
}

export function isNewLine(value: string) {
  return value === "\n";
}

export class Token {
  type: string;
  value: string;

  constructor(type: string, value: string) {
    this.type = type;
    this.value = value;
  }
}

export default class Lexer {
  private input: string;
  public currentCh!: string;
  private currentIndex!: number;
  public isEof: boolean;

  constructor(input: string) {
    this.input = input.trim();
    this.isEof = false;

    this.advanceToNextToken();
  }

  processNextToken(): Token {
    while (!!this.currentCh) {
      if (isSpace(this.currentCh)) {
        this.skipWhitespace();
        continue;
      }

      if (isDigit(this.currentCh)) {
        return new Token(TokenTypes.INTEGER, this.readInteger());
      }

      if (isIdentifier(this.currentCh)) {
        return new Token(TokenTypes.IDENTIFIER, this.readIdentifier());
      }

      if (isReservedToken(this.currentCh)) {
        const t = new Token(reservedTokens[this.currentCh], this.currentCh);
        this.advanceToNextToken();
        return t;
      }

      throw new Error(`Encountered an unexpected token: ${this.currentCh}`);
    }
    this.isEof = true;
    return new Token(TokenTypes.EOF, "");
  }

  private skipWhitespace() {
    while (!this.isEof && isSpace(this.currentCh)) this.advanceToNextToken();
  }

  private advanceToNextToken() {
    this.currentIndex =
      this.currentIndex !== undefined ? this.currentIndex + 1 : 0;
    this.currentCh = this.input[this.currentIndex];
  }

  private readInteger() {
    const integers: Array<string> = [];
    while (isDigit(this.currentCh)) {
      integers.push(this.currentCh);
      this.advanceToNextToken();
    }
    return integers.join("");
  }

  private previousCharacterIsIdentifier() {
    return isIdentifier(this.input[this.currentIndex - 1]);
  }

  private readIdentifier() {
    const id: Array<string> = [];
    while (
      this.currentCh !== undefined &&
      (isIdentifier(this.currentCh) ||
        (this.currentCh === ReservedTokens.EQUALS &&
          this.previousCharacterIsIdentifier()) ||
        (isSpace(this.currentCh) &&
          this.previousCharacterIsIdentifier() &&
          this.input[this.currentIndex + 1] !== ReservedTokens.EQUALS))
    ) {
      id.push(this.currentCh);
      this.advanceToNextToken();
    }
    return id.join("");
  }
}

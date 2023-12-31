export enum ReservedTokens {
  LPAREN = "(",
  RPAREN = ")",
  DELIMITER = ",",
  EQUALS = "=",
  NEWLINE = "\n",
  LBRACE = "{",
  RBRACE = "}",
  DEF = "def",
  RETURN = "return",
  DO = "do",
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

      if (isReservedToken(this.currentCh)) {
        const t = new Token(reservedTokens[this.currentCh], this.currentCh);
        this.advanceToNextToken();
        return t;
      }

      const nextSpace = this.input.slice(this.currentIndex).indexOf(" ");
      if (nextSpace) {
        const id = this.input.slice(this.currentIndex, nextSpace + 1);
        if (reservedTokens[id]) {
          this.currentCh = id;
          this.currentIndex += id.length - 1;
          const t = new Token(reservedTokens[this.currentCh], this.currentCh);
          this.advanceToNextToken();
          return t;
        }
      }

      if (isIdentifier(this.currentCh)) {
        return new Token(TokenTypes.IDENTIFIER, this.readIdentifier());
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

  /**
   * Returns the next token, without advancing to it.
   */
  public peek(index?: number) {
    index ??= this.currentIndex + 1;
    return this.input[index];
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
    const grabPreviousTokenGroup = () => {
      const sub = this.input.slice(0, this.currentIndex).split(" ").pop();
      if (sub?.split('\n')?.length ?? 0 >= 3) return sub?.split('\n').pop();
      return sub;
    };

    const id: Array<string> = [];
    while (
      (this.currentCh !== undefined &&
        (isIdentifier(this.currentCh) ||
          (this.currentCh === ReservedTokens.EQUALS &&
            this.previousCharacterIsIdentifier()) ||
          (isSpace(this.currentCh) &&
            !isReservedToken(grabPreviousTokenGroup() ?? "") &&
            this.previousCharacterIsIdentifier() &&
            !isReservedToken(this.input[this.currentIndex + 1])))) ||
      ((this.currentCh === ReservedTokens.LPAREN ||
        this.currentCh === TokenTypes.INTEGER ||
        this.currentCh === ReservedTokens.RPAREN) &&
        this.previousCharacterIsIdentifier())
    ) {
      id.push(this.currentCh);
      this.advanceToNextToken();
    }
    return id.join("");
  }
}

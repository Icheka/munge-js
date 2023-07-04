import Lexer, { ReservedTokens, Token, TokenTypes } from "./lexer";

interface Statement {}

type AstNode = Statement; // will extend to include 'statements' like macros

type Ast = Array<AstNode>;

class RangeStatement {
  start?: string;
  end?: string;

  constructor(start?: string, end?: string) {
    if (start === undefined) return;
    if (start !== undefined) this.start = start;
    if (end !== undefined) this.end = end;
  }
}

class SelectionStatement {
  selector: string;
  range: RangeStatement;

  constructor(selector: string, range: RangeStatement) {
    this.selector = selector;
    this.range = range;
  }
}

class AssignmentStatement {
  identifier: string;
  selection: SelectionStatement;

  constructor(identifier: string, selection: SelectionStatement) {
    this.identifier = identifier;
    this.selection = selection;
  }
}

class UnexpectedTokenError extends Error {
  constructor(expected: string, got?: string) {
    if (got) super(`Unexpected token. Expected ${expected}, got ${got}`);
    else super(`Unexpected token. Expected ${expected}.`);
  }
}

export default class Parser {
  private lexer: Lexer;
  private currentToken: Token;

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.currentToken = lexer.processNextToken();
  }

  public parse(): Ast {
    const statements: Array<Statement> = [];
    while (!!this.lexer.currentCh) {
      statements.push(this.parseStatement());
      this.advanceToNextToken();
      //   console.log(this.currentToken);
    }

    return statements;
  }

  private parseStatement(): Statement {
    // console.log(this.currentToken);
    if (this.currentToken.type !== TokenTypes.IDENTIFIER)
      throw new UnexpectedTokenError(
        TokenTypes.IDENTIFIER,
        this.currentToken.type
      );

    const identifier = this.currentToken.value;

    this.advanceAndAssertThatNextTokenIs("EQUALS");
    this.advanceAndAssertThatNextTokenIs(TokenTypes.IDENTIFIER);

    const selector = this.currentToken.value;

    this.advanceToNextToken();

    const statement = new AssignmentStatement(
      identifier,
      new SelectionStatement(selector, new RangeStatement())
    );

    if (this.currentToken.value === ReservedTokens.NEWLINE) return statement;
    if (this.currentToken.value === ReservedTokens.LPAREN) {
      statement.selection.range = this.parseRangeStatement();
      return statement;
    }

    throw new UnexpectedTokenError(
      ReservedTokens.LPAREN,
      this.currentToken.value
    );
  }

  private parseRangeStatement(): RangeStatement {
    this.advanceAndAssertThatNextTokenIs(TokenTypes.INTEGER);
    const start = this.currentToken.value;

    this.advanceToNextToken();

    if (this.currentToken.type === "DELIMITER") {
      // this is a range operation
      this.advanceToNextToken();

      if (this.currentToken.value === ReservedTokens.RPAREN.toString())
        return new RangeStatement(start);
      if (this.currentToken.type === TokenTypes.INTEGER.toString()) {
        const end = this.currentToken.value;
        this.advanceAndAssertThatNextTokenIs("RPAREN");
        return new RangeStatement(start, end);
      }

      throw new UnexpectedTokenError(
        `${TokenTypes.INTEGER} or ${ReservedTokens.RPAREN}`,
        this.currentToken.value
      );
    } else if (this.currentToken.value === ReservedTokens.RPAREN) {
      // this is an index operation
      return new RangeStatement(start, start);
    }

    throw new UnexpectedTokenError(
      `${ReservedTokens.DELIMITER} or ${TokenTypes.INTEGER}`,
      this.currentToken.value
    );
  }

  private advanceAndAssertThatNextTokenIs(tokenType: string) {
    this.advanceToNextToken();
    if (this.currentToken.type !== tokenType)
      throw new UnexpectedTokenError(tokenType, this.currentToken.type);
  }

  private advanceToNextToken() {
    this.currentToken = this.lexer.processNextToken();
  }
}

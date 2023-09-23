import Lexer, {
  ReservedTokens,
  Token,
  TokenTypes,
} from "./lexer";

interface Statement {}

export type AstNode = Statement; // will extend to include 'statements' like macros

export type Ast = Array<AstNode>;

export type AttributesArray = Array<string>;

export class FunctionStatement implements Statement {
  constructor(
    public identifier: string,
    public statements: Array<Statement>,
    public returnExpression: ReturnStatement
  ) {}
}

class ReturnStatement implements Statement {
  /**
   *
   * @param expressionsList array of identifiers
   */
  constructor(public expressionsList: AttributesArray) {}
}

class RangeStatement implements Statement {
  start?: string;
  end?: string;

  constructor(start?: string, end?: string) {
    if (start === undefined) return;
    if (start !== undefined) this.start = start;
    if (end !== undefined) this.end = end;
  }
}

class SelectionExpression implements Statement {
  selector: string;
  range: RangeStatement;
  attributes?: AttributesArray;

  constructor(
    selector: string,
    range: RangeStatement,
    attributes?: AttributesArray
  ) {
    this.selector = selector;
    this.range = range;
    this.attributes = attributes;
  }
}

export class AssignmentStatement implements Statement {
  identifier: string;
  selection: SelectionExpression;

  constructor(identifier: string, selection: SelectionExpression) {
    this.identifier = identifier;
    this.selection = selection;
  }
}

export class FunctionInvocationStatement implements Statement {
  constructor(public identifier: string, public functionName: string) {}
}

class UnexpectedTokenError extends Error {
  constructor(expected: string, got?: string) {
    if (got) super(`Unexpected token. Expected ${expected}, got ${got}`);
    else super(`Unexpected token. Expected ${expected}.`);
  }
}

export default class Parser {
  private lexer: Lexer;
  public currentToken: Token;

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.currentToken = lexer.processNextToken();
  }

  public parse(): Ast {
    const statements: Array<Statement> = [];
    while (!this.lexer.isEof) {
      statements.push(this.parseStatement());
      this.advanceToNextToken();
    }

    return statements;
  }

  public parseStatement(): Statement {
    if (this.currentToken.value === ReservedTokens.NEWLINE) {
      this.advanceToNextToken();
      return this.parseStatement();
    }

    if (this.currentToken.type !== TokenTypes.IDENTIFIER)
      throw new UnexpectedTokenError(
        TokenTypes.IDENTIFIER,
        this.currentToken.type
      );

    const identifier = this.currentToken.value;

    if (identifier === ReservedTokens.DEF) return this.parseFunction();
    if (identifier === ReservedTokens.RETURN)
      return this.parseReturnStatement();

    this.advanceAndAssertThatNextTokenIs("EQUALS");
    this.advanceAndAssertThatNextTokenIs("IDENTIFIER");

    switch (this.currentToken.value) {
      case ReservedTokens.DO:
        return this.parseFunctionInvocation(identifier);

      default:
        const selection = this.parseSelectionExpression();
        return new AssignmentStatement(identifier, selection);
    }
  }

  public parseReturnStatement(): ReturnStatement {
    this.advanceAndAssertThatNextTokenIs("LBRACE");
    const expressions = this.parseAttributesArray();
    return new ReturnStatement(expressions);
  }

  public parseFunctionInvocation(identifier: string): FunctionInvocationStatement {
    this.advanceAndAssertThatNextTokenIs("IDENTIFIER");
    return new FunctionInvocationStatement(identifier, this.currentToken.value);
  }

  public parseFunction(): FunctionStatement {
    this.advanceAndAssertThatNextTokenIs("IDENTIFIER");

    const identifier = this.currentToken.value;
    const statements: Array<Statement> = [];

    this.advanceToNextToken();

    while (this.currentToken.value !== ReservedTokens.RETURN) {
      if (this.currentToken.type === TokenTypes.EOF)
        throw new UnexpectedTokenError(
          ReservedTokens.RETURN,
          this.currentToken.type
        );

      statements.push(this.parseStatement());

      this.advanceToNextToken();
    }

    const returnExpr = this.parseReturnStatement();

    return new FunctionStatement(identifier, statements, returnExpr);
  }

  private parseSelectionExpression(): SelectionExpression {
    if (this.currentToken.type !== TokenTypes.IDENTIFIER)
      throw new UnexpectedTokenError(
        TokenTypes.IDENTIFIER,
        this.currentToken.type
      );

    const selector = this.currentToken.value;
    const expression = new SelectionExpression(selector, new RangeStatement());

    this.advanceToNextToken();

    if (this.currentToken.value === ReservedTokens.NEWLINE) return expression;
    if (this.currentToken.value === ReservedTokens.LPAREN) {
      expression.range = this.parseRangeStatement();
      return expression;
    }
    if (this.currentToken.value === ReservedTokens.LBRACE) {
      expression.attributes = this.parseAttributesArray();
      this.advanceToNextToken();

      if (this.currentToken.value === ReservedTokens.NEWLINE.toString())
        return expression;
      if (this.currentToken.value === ReservedTokens.LPAREN.toString()) {
        expression.range = this.parseRangeStatement();
        return expression;
      }
    }

    if (this.currentToken.type === TokenTypes.EOF.toString()) return expression;

    throw new UnexpectedTokenError(
      ReservedTokens.LPAREN,
      this.currentToken.value
    );
  }

  public parseAttributesArray(): AttributesArray {
    const attributes: AttributesArray = [];

    while (this.currentToken.value !== ReservedTokens.RBRACE) {
      this.advanceAndAssertThatNextTokenIs(TokenTypes.IDENTIFIER);

      attributes.push(this.currentToken.value);

      this.advanceToNextToken();
      if (this.currentToken.value === ReservedTokens.DELIMITER) continue;
      if (this.currentToken.value === ReservedTokens.RBRACE) break;

      throw new UnexpectedTokenError(
        `${ReservedTokens.DELIMITER} or ${ReservedTokens.RBRACE}`,
        this.currentToken.value
      );
    }

    return attributes;
  }

  public parseRangeStatement(): RangeStatement {
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
      this.currentToken.type === TokenTypes.EOF.toString()
        ? this.currentToken.type
        : this.currentToken.value
    );
  }

  public advanceAndAssertThatNextTokenIs(tokenType: string) {
    this.advanceToNextToken();
    if (this.currentToken.type !== tokenType)
      throw new UnexpectedTokenError(tokenType, this.currentToken.type);
  }

  private advanceToNextToken() {
    this.currentToken = this.lexer.processNextToken();
  }
}

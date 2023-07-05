import Executor, { DefaultResultShape } from "./executor";
import Lexer from "./lexer";
import Parser, { Ast } from "./parser";

export default class Munger<TResult extends DefaultResultShape> {
  private ast: Ast;

  constructor(dslCode: string) {
    this.ast = new Parser(new Lexer(dslCode)).parse();
  }

  public munge(html: string) {
    return new Executor<TResult>(this.ast, html).results;
  }
}

export { Element } from "./executor";

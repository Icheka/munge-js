import Executor, { DefaultResultShape } from "./executor";
import Lexer from "./lexer";
import Parser, { Ast } from "./parser";

export default class Munger<TResult extends DefaultResultShape> {
  private ast: Ast;

  constructor(dslCode: string) {
    console.log({ lex: new Lexer(dslCode) });
    this.ast = new Parser(new Lexer(dslCode)).parse();
    console.log({ ast: this.ast });
  }

  public munge(html: string) {
    return new Executor<TResult>(this.ast, html).results;
  }
}

export { Element } from "./executor";

const result = new Munger(`

def function
  x = #viewport
  y = #viewport > canvas
  return {x, y}

div, canvas = do function
`).munge("<div id=viewport><canvas></canvas></div>");

console.log({ result });

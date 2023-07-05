import { Ast, AssignmentStatement } from "./parser";
import { parse as parseHTML, HTMLElement } from "node-html-parser";

export type Element = HTMLElement;

export interface DefaultResultShape {
  [x: string]: Element | Element[];
}

export default class Executor<TResult extends DefaultResultShape> {
  public ast: Ast;
  private $: Element;
  public results: TResult;

  constructor(ast: Ast, html: string) {
    this.ast = ast;
    this.$ = parseHTML(html);
    this.results = {} as TResult;

    this.execute();
  }

  private execute() {
    for (const node of this.ast as Array<AssignmentStatement>) {
      const {
        identifier,
        selection: { range, selector },
      } = node;
      if (!range.start && !range.end) {
        (this.results as any)[identifier] =
          this.executeNonRangedSelection(selector);
        continue;
      }
      if (range.start && range.start === range.end) {
        (this.results as any)[identifier] = this.executeIndexSelection(
          selector,
          parseInt(range.start)
        );
        continue;
      }
      if (range.start && range.end === undefined) {
        (this.results as any)[identifier] = this.executeIndefiniteSelection(
          selector,
          parseInt(range.start)
        );
        continue;
      }
      if (range.start && range.end) {
        (this.results as any)[identifier] = this.executeDefiniteSelection(
          selector,
          parseInt(range.start),
          parseInt(range.end)
        );
        continue;
      }

      throw new Error(`Invalid AST. ${JSON.stringify(node)}`);
    }
  }

  private executeDefiniteSelection(
    selector: string,
    start: number,
    end: number
  ) {
    return this.querySelectorAll(selector)?.slice(start, end) ?? [];
  }

  private executeIndefiniteSelection(selector: string, start: number) {
    return this.querySelectorAll(selector)?.slice(start) ?? [];
  }

  private executeIndexSelection(selector: string, index: number) {
    return this.querySelectorAll(selector)?.[index] ?? null;
  }

  private executeNonRangedSelection(selector: string) {
    return this.querySelector(selector)!;
  }

  private querySelector(selector: string) {
    return this.$?.querySelector(selector) ?? null;
  }

  private querySelectorAll(selector: string) {
    return this.$?.querySelectorAll(selector) ?? [];
  }
}

import {
  Ast,
  AssignmentStatement,
  AttributesArray,
  AstNode,
  FunctionStatement,
} from "./parser";
import { parse as parseHTML, HTMLElement } from "node-html-parser";

export type Element = HTMLElement;

export interface DefaultResultShape {
  [x: string]: Element | Element[] | string | Array<string>;
}

export default class Executor<TResult extends DefaultResultShape> {
  public ast: Ast;
  private $: Element;
  public results: TResult;
  public functions: Record<string, any>;

  constructor(ast: Ast, private html: string) {
    this.ast = ast;
    this.$ = parseHTML(html);
    this.results = {} as TResult;
    this.functions = {};

    this.execute();
  }

  private isAssignmentNode(node: any): node is AssignmentStatement {
    return node.identifier && node.selection;
  }

  private isFunctionNode(node: any): node is FunctionStatement {
    return node.identifier && node.statements && node.returnExpression;
  }

  private execute(ast?: Array<AstNode>) {
    ast ??= this.ast;

    for (const node of this.ast) {
      if (this.isAssignmentNode(node)) {
        const {
          identifier,
          selection: { range, selector, attributes },
        } = node;
        if (!range.start && !range.end) {
          (this.results as any)[identifier] = this.executeNonRangedSelection(
            selector,
            attributes
          );
          continue;
        }
        if (range.start && range.start === range.end) {
          (this.results as any)[identifier] = this.executeIndexSelection(
            selector,
            parseInt(range.start),
            attributes
          );
          continue;
        }
        if (range.start && range.end === undefined) {
          (this.results as any)[identifier] = this.executeIndefiniteSelection(
            selector,
            parseInt(range.start),
            attributes
          );
          continue;
        }
        if (range.start && range.end) {
          (this.results as any)[identifier] = this.executeDefiniteSelection(
            selector,
            parseInt(range.start),
            parseInt(range.end),
            attributes
          );
          continue;
        }

        throw new Error(`Invalid AST. ${JSON.stringify(node)}`);
      }

      if (this.isFunctionNode(node)) {
        const executorContext = new Executor(node.statements, this.html);
        executorContext.execute(node.statements);

        const variables = executorContext.results;
        const results = node.returnExpression.expressionsList.reduce(
          (prev, curr) => ({
            ...prev,
            [curr]: variables[curr],
          }),
          {}
        );

        // hoist function scope
        (this.results as any)[node.identifier] = results;

        continue;
      }

      throw new Error(`Invalid AST. ${JSON.stringify(node)}`);
    }
  }

  private executeDefiniteSelection(
    selector: string,
    start: number,
    end: number,
    attributes?: AttributesArray
  ) {
    return this.querySelectorAll(selector, attributes)?.slice(start, end) ?? [];
  }

  private executeIndefiniteSelection(
    selector: string,
    start: number,
    attributes?: AttributesArray
  ) {
    return this.querySelectorAll(selector, attributes)?.slice(start) ?? [];
  }

  private executeIndexSelection(
    selector: string,
    index: number,
    attributes?: AttributesArray
  ) {
    return this.querySelectorAll(selector, attributes)?.[index] ?? null;
  }

  private executeNonRangedSelection(
    selector: string,
    attributes?: AttributesArray
  ) {
    return this.querySelector(selector, attributes);
  }

  private getAttributes(element: HTMLElement, attributes?: AttributesArray) {
    attributes = attributes ?? [];

    if (attributes.length === 0) return element;

    const hydratedAttributes = {
      ...element.attributes,
      text: element.innerText,
      html: element.innerHTML,
      outer: element.outerHTML,
    };

    if (attributes.length === 1)
      return hydratedAttributes[attributes[0]] ?? null;
    return attributes.map((attribute) => hydratedAttributes[attribute] ?? null);
  }

  private querySelector(selector: string, attributes?: AttributesArray) {
    const element = this.$?.querySelector(selector) ?? null;
    if (!element) return element;
    return this.getAttributes(element, attributes);
  }

  private querySelectorAll(selector: string, attributes?: AttributesArray) {
    const elements = this.$?.querySelectorAll(selector) ?? [];
    if (!attributes) return elements;
    return elements.map((element) => this.getAttributes(element, attributes));
  }
}

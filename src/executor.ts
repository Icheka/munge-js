import {
  Ast,
  AssignmentStatement,
  AttributesArray,
  AstNode,
  FunctionStatement,
  FunctionInvocationStatement,
  Statement,
  ReturnStatement,
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
  public functions: Record<
    string,
    {
      results: Record<string, any>;
      statements: Array<Statement>;
      returnExpression: ReturnStatement;
    }
  >;

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

  private isFunctionInvocationNode(
    node: any
  ): node is FunctionInvocationStatement {
    return node.identifiers && node.functionName;
  }

  private execute(ast?: Array<AstNode>) {
    ast ??= this.ast;
    console.log({ ast });

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
        if (this.functions[node.identifier])
          throw new Error(
            `Function ${node.identifier} has already been defined`
          );
        this.functions[node.identifier] = {
          results: {},
          statements: node.statements,
          returnExpression: node.returnExpression,
        };
        continue;
      }

      if (this.isFunctionInvocationNode(node)) {
        const { functionName, identifiers } = node;
        const func = this.functions[functionName];

        if (!func) throw new Error(`Function ${functionName} is undefined`);

        if (!Object.keys(func.results).length) {
          func.results = this.executeFunction(
            func.statements,
            func.returnExpression
          );
        }

        const functionReturnIdentifiers = Object.values(
          this.functions[functionName].results
        );

        if (functionReturnIdentifiers.length < identifiers.length)
          throw new Error(
            `Function ${functionName} does not return enough variables to unpack. Function returns ${functionReturnIdentifiers.length}, you expected ${identifiers.length}`
          );

        identifiers.forEach((identifier, i) => {
          (this.results as any)[identifier] = functionReturnIdentifiers[i];
        });

        continue;
      }

      throw new Error(`Invalid AST. ${JSON.stringify(node)}`);
    }
  }

  private executeFunction(
    statements: Array<Statement>,
    returnExpression: ReturnStatement
  ) {
    const executorContext = new Executor(statements, this.html);
    executorContext.execute(statements);

    const variables = executorContext.results;
    return returnExpression.expressionsList.reduce(
      (prev, curr) => ({
        ...prev,
        [curr]: variables[curr],
      }),
      {}
    );
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

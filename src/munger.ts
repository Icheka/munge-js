import Lexer from "./lexer";
import Parser from "./parser";

const input = `
twitterLink = a.social-links[data-name="twitter"]
`;

const lexer = new Lexer(input);
const parser = new Parser(lexer);
const ast = parser.parse();
console.log(JSON.stringify(ast));

import Lexer from "./lexer";
import Parser from "./parser";

const input = `
intro = div#intro (0)
twitterLink = a.social-links (1)
`;

const lexer = new Lexer(input);
const parser = new Parser(lexer);
const ast = parser.parse();
console.log(JSON.stringify(ast));

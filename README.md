# munge-js

```
pageTitle = header > h1
pageDescription = header > p
products = table.products > tbody > tr (0,)
```

**Author:** [@icheka](https://github.com/icheka)

MungeJS is a powerful DSL for representing web scraping logic as code that can be stored anywhere -- as text files in a file system, as strings in code, even as textual data in a database. MungeJS separates the representation of web-scraping logic from its execution, allowing you to do never-before-done wizardry like storing that logic and only culling it when you actually need it; or representing your scraper in a code-agnostic way that allows you to re-use your scraper across different programming languages (see the section on [Using the JavaScript Interpreter](https://github.com/Icheka/munge-js#using-the-javascript-interpreter)).


No installation is required to start using Munge.

## Features
- **⚛️ Simple, expressive and declarative syntax.**
- **🌏 Code-agnostic DSL:** Anybody can scrape the web: no technical expertise needed. Large product/sales/R&D teams will benefit from this: there's no need to risk pestering the tech folk anymore.
- **💻 Performant:** Under the hood, Munge implements a recursive-descent parser that generates an Abstract Syntax Tree that is loaded once per Munge instance (`new Munge(munge_code)`). Subsequent Munge operations on the same instance re-use the AST. This allows Munge to be instantiated during a "setup" stage (e.g when spinning up an Express server, or in a React useEffect hook) and re-used for scraping different web pages.
```javascript
// express-app.ts
const dsl = `
products = table.products td.product-name {text} (0,)
`
export const productsMunger = new Munge(dsl)

// products-controller.ts
import { productsMunger } from "./express-app.ts"

async function webHookThatUpdatesProductsTable(data) {
    const html = await fetch(data.url).then((res) => res.text())
    const products = productsMunger.munge(html)
    // update database with products 
}
```
- **⚡️ Blazingly fast:** Shipping without the bloat that comes with libraries like Cheerio and Pupeteer means that your web scrapers can now run much faster, with reduced memory footprints.

## Syntax
Munge is an expressive, declarative Domain-Specific Language where the "domain" is simply "HTML/XHTML parsing". The actual implementation of the Munge interpreter in any language is of no consequence to the user (although you are free to take a look at the source code for this JavaScript interpreter, as well as write your own implementations in other languages), so this section will focus on the syntax of the DSL itself.

### Selection Expressions
Selections are the core of Munge syntax. A selection can comprise three parts:
1. A **base** that is essentially a **CSS selector** (e.g `section#team ul.members li`). The base is the only required part of a Munge selection.
2. An optional **attribute-array** that specifies which attributes to extract from the elements captured by the *base*.

    We can extract the URLs of the avatars of team members captured by the base in (1) like so:
    ```
    section#team ul.members li > img {src}
    ```
    To extract both the URL and the alt-text for each avatar, we simply specify both attributes in the attribute-array. This will return an array of the shape: `[url string, alt-text]`
    ```
    section#team ul.members li > img {src, alt}
    ```

    <quote>
    In addition to the usual CSS attributes (class, id, src, alt, etc), Munge also supports the following attributes:
    
    - **text:** this is the value you would get if you executed `document.querySelector(selector).innerText`
    
        For example:

        ```javascript
        // html
        <div class="introduction">
            Welcome to MungeJS
        </div>

        // munge
        intro = div.introduction {text}

        // result
        'Welcome to MungeJS'
        ```

    - **html:** this is the value you would get if you executed `document.querySelector(selector).innerHTML`
    
        For example:

        ```javascript
        // html
        <div class="introduction">
            Welcome to MungeJS
            <hr />
        </div>

        // munge
        intro = div.introduction {text}

        // result
        'Welcome to MungeJS <hr>'
        ```

    - **outer:** this is the value you would get if you executed `document.querySelector(selector).outerHTML`
    
        For example:

        ```javascript
        // html
        <div class="introduction">
            Welcome to MungeJS
            <hr />
        </div>

        // munge
        intro = div.introduction {outer}

        // result
        '<div class="introduction">Welcome to MungeJS <hr></div>'
        ```
    </quote>
    
3. An optional **range expression** that specifies the "range" of elements to capture. Munge indexes are zero-based (i.e '0' means 'the first element', '1' means 'the second element', etc). When a range expression is not provided, Munge only captures the first matching element.
    
    Munge supports three kinds of range expressions:
    - **Index expressions:** If we wanted to capture **ONLY the second paragraph** in a web page, we would use an index expression like so:
        ```
        p (1)
        ```
        These Munge selection statements are identical and will produce the same result:
        - `header > p`
        - `header > p (0)`
    - **Indefinite range expressions:** Indefinite range expressions begin capturing at the "start index" provided, and capture until there are no more matching elements. Indefinite range expressions take the format: `(start_index,)` (with a trailing comma).

        For example, the Munge code `section#team ul.members li > img` will capture ONLY the first `img` element that matches the selector; to capture all matching `img` elements, we'd write `section#team ul.members li > img (0,)`. This simply means, "capture all elements that match this selector, beginning with the first element".

        If we wanted to capture all `span` elements, beginning from the *5th* `span` element, we would write:
        ```
        span (4,)
        ```
    - **Definite range expressions:** Definite range expressions will capture all matching elements between the `start` and `end` indexes. It takes the format: `(start_index, end_index)`.

        We can capture the *3rd* to *6th* rows in a table like so:
        ```
        table#upcoming-events > tbody > tr (2, 5)
        ```

    The three parts of a Munge selection can be used together to create more powerful selections:
    ```
    section#team ul.members li > img {src} (0,3)
    ```

### Assignment Statements
Munge works by capturing elements (and their attributes) and assigning them to variables that map to properties in the Munge result. Selections MUST ALWAYS be assigned to variables.

Assignment in Munge is as simple as writing an identifier for your variable, followed by an equals sign `=`, followed by the selection statement.

```
avatarUrls = section#team ul.members li > img {src} (0,)
```

### Functions (coming soon)

Functions promote modularity and code-reusability by allowing you to encapsulate code and assign its "return value" to variables. Functions are declared using the `def` keyword, followed by the "function identifier". Functions may return some value (elements captured by a selection statement) using the `return` keyword, but this is not a requirement.

Functions are used (or "invoked") like so: `do function_name`. They must be declared before they can be invoked.

**Correct**
```javascript
def get_avatar_urls
    return section#team ul.members li > img {src} (0,)

avatarUrls = do get_avatar_urls
```

**Incorrect (will throw an error because get_avatar_urls is used before it is declared)**
```javascript
avatarUrls = do get_avatar_urls

def get_avatar_urls
    return section#team ul.members li > img {src} (0,)
```

### Modules (coming soon)
Modules also promote modularity and code-reusability. They accomplish this by allowing Munge code to be "imported" and used in other Munge code. This can be used by large teams to, for example, create a library of shared Munge functions that can be created by different members of the team and used by any member.

In an R/D team, Abe might create a module encapsulating code for scraping the titles of companies on Crunchbase:

```javascript
def get_company_titles
    return a[itemprop="name"] {text} (0,)
```

Alice and Bob can use the `get_company_titles` function Abe created (which can be stored in a separate file, or in a database table, or even on the Internet -- in a website) by importing it and invoking it like so:

```javascript
import ./path-or-url-of-module as CrunchbaseFunctions

titles = do CrunchbaseFunctions.get_company_titles
```

## Using the JavaScript Interpreter

One benefit Munge provides is that it allows you to store your web scraping logic in a medium that best fits your requirements. Munge code can be stored in repositories, alongside your other code; but Munge code can also be stored in databases or S3 buckets or on Content Delivery Networks -- it's all up to you to determine your technical and security requirements.

To execute Munge code, you'll need the Munge Interpreter. The Munge interpreter loads your Munge code and the HTML document you want to scrape, applies your Munge code to the HTML, and outputs a "result" object with the results of your scraper.

At the moment, only the JavaScript interpeter has been implemented (so you can use Munge in your JavaScript/TypeScript projects, on both the client-side and the server-side). Support for Python and Go will come in the coming months. Feel free to contribute to, extend, and even create your own implementation of, these interpreters.

### Installation
**NPM:** `npm install munge-js`

**Yarn:** `yarn add munge-js`

**PNPM:** `pnpm --filter <package-filter> install munge-js`

### Usage
To execute your Munge code, create a Munge instance with your Munge code:
```javascript
import Munger from "munge-js"

const dsl = `
title = #firstHeading {text}
description = .mw-parser-output p:first-of-type {text}
`
const munger = new Munger(dsl)
```

Then call the `munge()` instance method with your HTML code:

```javascript
const html = await fetch('https://en.wikipedia.org/wiki/Web_scraping').then((res) => res.text())

const results = munger.munge(html)

console.log(results.title)
// Web scraping
```

### With TypeScript
The `Munger` class is a generic class that can be used to "type" the `Munger.munge()` result for intellisense/autocomplete, etc.

```typescript
import Munger from "munge-js"

type WikipediaPage = {
    title: string;
    description: string;
}

const dsl = `
title = #firstHeading {text}
description = .mw-parser-output p:first-of-type {text}
`
const munger = new Munger<WikipediaPage>(dsl)

const html = await fetch('https://en.wikipedia.org/wiki/Web_scraping').then((res) => res.text())

const results = munger.munge(html)

console.log(results.title)
// Web scraping
```

## Special Thanks
MungeJS would probably not exist without inspiration from:
- [@mrnugget](https://github.com/mrnugget), whose work on both *Writing an Interpreter In Go* and *Writing a Compiler In Go* set me up for a study in programming linguistics and interpreter/compiler design.
- [@tj](https://github.com/tj), whose dedication to crafting excellent open-source software has been an inspiration for several years. The impact of his work on commander.js has been felt by JavaScript developers all around the world.
- [@douglascrockford](https://github.com/douglascrockford), whose paper on *Top-down Operator Precedence* helped bring Vaughan's paper of the same name to life for me.

## License
MIT
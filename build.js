const ACORN = require("acorn");
const FS = require("fs");

//
const AST_CONSTS = require("./ast.consts.json")

const SCRIPT = './src/index.js';
const ACORN_OPTIONS = {
    ecmaVersion: 7,
    sourceType: 'module'
}

function PrettyPrint(json) {
    console.log( JSON.stringify(json, null, 2) );
}

FS.readFile(SCRIPT, (err, data) => {
    if (err) throw err;
    const ast = ACORN.parse(data, ACORN_OPTIONS);
    // PrettyPrint(ast);
});

/**
 * 1) Went through nodes
 */
function Walk(ast) {
    switch(ast.type) {
        case "Program": ast.body.forEach( (element, idx, arr) => {
            arr[idx] = Walk(element);
        }); break;
        // import
        case "ImportDeclaration": ast = AST_CONSTS; break;
        // case "ImportDefaultSpecifier": Walk(ast.local); break;
    }
    // console.log('Walk complete!');
    return ast;
}

function TestPoC(){
    const ast = ACORN.parse("import A from './a.js';", ACORN_OPTIONS);
    PrettyPrint(Walk(ast));
}
TestPoC();
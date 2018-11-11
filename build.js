const ACORN = require("acorn");
const FS = require("fs");
const PATH = require("path");
//
const AST_CONST = require("./ast/ast.const.json");
const AST_CONSTS_SPREAD = require("./ast/ast.consts.spread.json");
const AST_OBJ_PROP = require("./ast/ast.object-property.json");
const AST_FUNC_IIFE = require("./ast/ast.ii-func.json");
const AST_FUNC_NAMED = require("./ast/ast.named-func.json")
const AST_FUNC_EXPRESSION = require("./ast/ast.func-expression.json");
const AST_STATEMENTS = require("./ast/ast.statements.json");
const AST_MISC = require("./ast/ast.misc.json");



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
async function Walk(ast, dependenciesPlainGraph, scriptPath) {
    switch(ast.type) {
        case "Program": for(let i = 0; i < ast.body.length; i++) {
            ast.body[i] = await Walk(ast.body[i], dependenciesPlainGraph, scriptPath);
        }; break;
        // import
        case "ImportDeclaration": {
            const mod = await HandleImportDeclaration(ast, dependenciesPlainGraph, scriptPath) ;
            dependenciesPlainGraph[ mod.name ] = mod.funcs;
            const constDef = Object.assign({},AST_CONST); // TO DO implement handler of several funcs [currently assumption is that default export only used]
                constDef.declarations = [
                    Object.assign({},AST_MISC.variable)
                ] // TO DO Refactor AST_CONST
            Object.keys(mod.funcs).forEach(funcName=>{
                // setup constants
                constDef.declarations[0].id= {
                    type: "Identifier",
                    name: funcName
                };
                // initialize
                constDef.declarations[0].init = {
                    "type": "CallExpression",
                    "callee": Object.assign({},mod.funcs[funcName]),
                    "arguments": []
                };
            });
            return constDef;
        }
        break;
        // case "ImportDefaultSpecifier": Walk(ast.local); break;
    }
    // console.log('Walk complete!');
    return Promise.resolve(ast);
}

async function TestPoC(){
    const ast = ACORN.parse("import A from './tests/bundler/export_default_afunc.js';", ACORN_OPTIONS);
    const dependenciesPlainGraph = {};
    PrettyPrint(await Walk(ast,dependenciesPlainGraph,__dirname));
}
TestPoC();

/**
 * ImportDeclaration
 *   .specifiers [
 *     {ImportDefaultSpecifier} | {ImportSpecifier},..
 *   ]
 *   .source.type: "Literal"
 *   .source.value: "./app/App.mjs"  //also avaliable .source.raw: "'./app/App.mjs'"
 * - ImportDefaultSpecifier
 *   .local.type: "Identifier"
 *   .locall.name: String
 * - ImportSpecifier
 *   .imported.type: "Identifier"
 *   .imported.name: String
  @param {} ast 
 */
async function HandleImportDeclaration(ast, dependenciesPlainGraph, scriptPath) {
    const specifiers = ast.specifiers;
    if(ast.source.type.toUpperCase() !== "LITERAL") throw `${specifier.type} source type handler is not supported <yet>.`
    const filePath = ast.source.value;
    const fileName = PATH.basename(filePath);
    const folderPath = filePath.indexOf('./') === 0 ? 
        PATH.resolve( scriptPath, filePath.replace('./','').substring(0, filePath.replace('./','').lastIndexOf("/")) ) :
        filePath.substring(0, filePath.lastIndexOf("/"));
    const mod = {
        name : `${filePath.replace(/[./\\]/g,'_')}`, // TO DO use relative path to project root
        funcs : {}
    };
    for(let i = 0; i < specifiers.length; i++) {
        const specifier = specifiers[i];
        switch(specifier.type) {
            case "ImportDefaultSpecifier": {               
                const name = `${specifier.local.name}`;
                const codeStr = await ReadFile(PATH.resolve( folderPath, fileName ));
                const ast = ACORN.parse(codeStr, ACORN_OPTIONS);
                const body = ast.body; //2
                for(let i=0; i < body.length; i++ ) { //3
                    const e = body[i];
                    if(e.type==='ExportDefaultDeclaration') { // 4
                        if(e.declaration.type === 'AssignmentExpression') { // handle cases like `export default b = 'value'` to avoid creation of global variables
                        body[i] = {
                            type: "ReturnStatement",
                            argument: Object.assign({}, e.declaration.right, {start: undefined, end: undefined})
                        }
                        } else {
                            body[i] = {
                                type: "ReturnStatement",
                                argument: Object.assign({}, e.declaration, {start: undefined, end: undefined})
                            }
                        }
                    } else {
                        body[i] = await Walk(e, dependenciesPlainGraph, folderPath);
                    }
                };
                // 5
                mod.funcs[name] = Object.assign({},AST_FUNC_EXPRESSION);
                mod.funcs[name].body = Object.assign({},AST_STATEMENTS.block);
                // mod.funcs[name].id = {name};
                mod.funcs[name].body.body = [...body];
            }; break;
            case "ImportSpecifier": throw `${specifier.type} specifier type handler is not implemented <yet>.`
        }
    }
    return Promise.resolve(mod);
}

// import App from './app/App.mjs'; 
//// replace by 
// const {App} = dependencies['__app_App_mjs|App']
/// but first:
// 1) read ./app/App.mjs
// 2) get Program."body"
// 3) find ExportDefaultDeclaration and get its "declaration"
// 4) replace ExportDefaultDeclaration with "ReturnStatement" "argument" of which contains saved ExportDefaultDeclaration."declaration"
// 5) place everything into FunctionDeclaration."body" and assign to dependencies['__app_App_mjs|App']

function ReadFile(path) {
    return new Promise((resolve,reject) => {
        // console.log(path);
        FS.readFile(path, (err, data) => {
            if (err) throw reject(err);
            resolve(data);
        })
    }) 
}
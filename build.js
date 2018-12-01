const ACORN = require("acorn");
const FS = require("fs");
const PATH = require("path");
//
const AST_CONST = require("./ast/ast.const.json");
const AST_CONSTS_SPREAD = require("./ast/ast.consts.spread.json");
const AST_OBJ_PROP = require("./ast/ast.object-property.json");
const AST_FUNC_IIFE = require("./ast/ast.ii-func.json");
const AST_FUNC_NAMED = require("./ast/ast.named-func.json");
const AST_EXPRESSIONS = require("./ast/ast.expressions.json");
const AST_STATEMENTS = require("./ast/ast.statements.json");
const AST_MISC = require("./ast/ast.misc.json");

const ____rv4EXPORT____ = '____rv4EXPORT____';
const ____rv4DEFEXPORT_ = '____rv4DEFEXPORT_';

const SCRIPT = './src/index.js';
const ROOT = __dirname;
const ACORN_OPTIONS = {
    ecmaVersion: 7,
    sourceType: 'module'
};

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
async function Walk(ast, deps, scriptPath) {
    switch(ast.type) {
        case "Program": for(let i = 0; i < ast.body.length; i++) {
            const dep2const = await Walk(ast.body[i], deps, scriptPath);
            ast.body[i] = dep2const;
        }; break;
        // import
        case "ImportDeclaration": 
            return await HandleImportDeclaration(ast, deps, scriptPath) ;
    }
    // console.log('Walk complete!');
    return Promise.resolve(ast);
}

async function TestPoC(){
    const ast = ACORN.parse("import A from './tests/bundler/export_default_afunc.js';", ACORN_OPTIONS);
    const deps = {
        '$order': []
    };
    const processedAst = await Walk(ast,deps,__dirname);

    const modules = [];
    modules.push({ // const ____rv4EXPORT____={}
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": ____rv4EXPORT____
                },
                "init": {
                    "type": "ObjectExpression",
                    "properties": []
                }
            }
        ],
        "kind": "const"
        
    });
    for(dep of deps.$order) {
        // TO DO implement init of ____rv4EXPORT____[path] on first assignment of dependency initialization function
        modules.push(deps[dep.path][dep.name]);
    }
    processedAst.body = modules.concat(processedAst.body);

    PrettyPrint(processedAst);
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
 * - ImportNamespaceSpecifier
 *   .local.type: "Identifier"
 *   .locall.name: String
 * - ImportSpecifier
 *   .imported.type: "Identifier"
 *   .imported.name: String
  @param {} ast 
 */
async function HandleImportDeclaration(ast, deps, scriptPath) {
    const specifiers = ast.specifiers;
    if(ast.source.type.toUpperCase() !== "LITERAL") throw `${specifier.type} source type handler is not supported <yet>.`;
    const filePath = ast.source.value;
    const fileName = PATH.basename(filePath);
    const folderPath = filePath.indexOf('./') === 0 ?
        PATH.resolve( scriptPath, filePath.replace('./','').substring(0, filePath.replace('./','').lastIndexOf("/")) ) :
        filePath.substring(0, filePath.lastIndexOf("/"));

    const relativeFilePath = `${filePath.replace(ROOT,'')}`;
    const alreadyResolved = !!deps[relativeFilePath];
    deps[relativeFilePath] = alreadyResolved ? deps[relativeFilePath] : {};

    for(let i = 0; i < specifiers.length; i++) {
        const specifier = specifiers[i];
        switch(specifier.type) {
        case "ImportDefaultSpecifier": {
            const name = `${specifier.local.name}`;
            //> const `name` = ...
            const constAst = Object.assign({}, AST_CONST);
                constAst.declarations = [];
                constAst.declarations[0] = Object.assign({}, AST_MISC.variable)
                constAst.declarations[0].id = {"type": "Identifier", "name": name};
                constAst.declarations[0].init = null; // populated below depending on the state of dependency
                
            //> ____rv4EXPORT____[`scriptPath`][____rv4DEFEXPORT_]
            const dependencyAst = Object.assign({}, AST_EXPRESSIONS.member);
                dependencyAst.object =             Object.assign({}, AST_EXPRESSIONS.member);
                dependencyAst.object.object   =    { "type": "Identifier", "name": ____rv4EXPORT____};
                dependencyAst.object.property =    { "type": "Literal", "value": relativeFilePath, "raw": `"'${relativeFilePath}'"`}
                dependencyAst.property =   { "type": "Literal", "value": ____rv4DEFEXPORT_, "raw": `"'${____rv4DEFEXPORT_}'"`}
            //> const `name` = ____rv4EXPORT____[`scriptPath`][____rv4DEFEXPORT_];
            constAst.declarations[0].init = dependencyAst;
            // DEPENDENCY
            if(!alreadyResolved) {                                                    // IS NOT RESOLVED                                                           
                const depExportExprAst = Object.assign({},  AST_EXPRESSIONS.expression);
                depExportExprAst.expression = Object.assign({}, AST_EXPRESSIONS.assignment);
                depExportExprAst.expression.left = dependencyAst;
                depExportExprAst.expression.right = null; // TO BE CONTINUED

                const codeStr = await ReadFile(PATH.resolve( folderPath, fileName ));
                const moduleAst = ACORN.parse(codeStr, ACORN_OPTIONS);

                for(let i=0; i < moduleAst.body.length; i++ ) { //3
                    const e = moduleAst.body[i];
                    if(e.type==='ExportDefaultDeclaration') { // 4
                        if(e.declaration.type === 'AssignmentExpression') { // handle cases like `export default b = 'value'` to avoid creation of global variables
                            depExportExprAst.expression.right = e.declaration.right;
                        } else {
                            depExportExprAst.expression.right = e.declaration;
                        }
                        moduleAst.body[i] = depExportExprAst;
                    } else {
                        moduleAst.body[i] = await Walk(e, deps, folderPath);
                    }
                };

                //> ____rv4EXPORT____[`scriptPath`][____rv4DEFEXPORT_] = (function(){moduleBody})()
                const depInitExprAst = Object.assign({},  AST_EXPRESSIONS.expression);
                depInitExprAst.expression = {
                    "type": "CallExpression",
                    "callee": Object.assign({}, Object.assign({},AST_EXPRESSIONS.function)),
                    "arguments": []
                };
                depInitExprAst.expression.callee.body = Object.assign({},AST_STATEMENTS.block);
                depInitExprAst.expression.callee.body.body = moduleAst.body;
                
                deps[relativeFilePath][____rv4DEFEXPORT_] = depInitExprAst;
                deps.$order.push({path: relativeFilePath, name : ____rv4DEFEXPORT_});
            }
            return Promise.resolve(constAst);
        }; break;
        case "ImportNamespaceSpecifier": 
        case "ImportSpecifier": throw `${specifier.type} specifier type handler is not implemented <yet>.`;
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
        });
    }) ;
}

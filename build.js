const ACORN = require("acorn");
const FS = require("fs");
const PATH = require("path");
//
const AST_FUNC_NAMED = require("./ast/ast.named-func.json");
const AST_EXPRESSIONS = require("./ast/ast.expressions.json");
const AST_STATEMENTS = require("./ast/ast.statements.json");
const AST_MISC = require("./ast/ast.misc.json");

const {MemberExpression, ObjectExpression, Identifier, Literal, Property, $constant, $constants} = require("./ast/astUtils.js");

const ____rv4EXPORT____ = '____rv4EXPORT____';
const ____rv4DEFEXPORT_ = '____rv4DEFEXPORT_';
const ____rv4SET_EXPORT____ = '____rv4SET_EXPORT____';

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
    // const ast = ACORN.parse("import A from './tests/bundler/export_default_afunc.js';", ACORN_OPTIONS);
    const ast = ACORN.parse("import {h} from './src/libs/preact.mjs';", ACORN_OPTIONS);

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
                "id": Identifier(____rv4EXPORT____),
                "init": ObjectExpression()
            }
        ],
        "kind": "const"
        
    });
    // "function ____rv4SET_EXPORT____(path,name,value) {
    //    ____rv4EXPORT____[path] = ____rv4EXPORT____[path] ? ____rv4EXPORT____[path] : {};
    //    ____rv4EXPORT____[path][name] = value;
    // }"
    modules.push(Object.assign({},AST_FUNC_NAMED,{
        "id": { "type": "Identifier", "name": "____rv4SET_EXPORT____"},
        "params": [
            Identifier("path"),
            Identifier("name"),
            Identifier("value")
        ],
        "body": Object.assign({}, AST_STATEMENTS.block, {
            "body": [
                Object.assign({}, AST_STATEMENTS.expression, {
                    "expression": Object.assign({}, AST_EXPRESSIONS.assignment, {
                        "left": MemberExpression( Identifier(____rv4EXPORT____), Identifier("path") ),
                        "right": Object.assign({}, AST_EXPRESSIONS.conditional, {
                            "test": MemberExpression( Identifier(____rv4EXPORT____), Identifier("path") ),
                            "consequent": MemberExpression( Identifier(____rv4EXPORT____), Identifier("path") ),
                            "alternate":  ObjectExpression()
                        })
                    })
                }),
                Object.assign({}, AST_STATEMENTS.expression, {
                    "expression": Object.assign({}, AST_EXPRESSIONS.assignment, {
                        "left": MemberExpression( 
                            MemberExpression( 
                                Identifier(____rv4EXPORT____), 
                                Identifier("path") ),
                            Identifier("name") 
                        ),
                        "right": Identifier("value")
                    })
                })
            ]
        })
    }));
    for(dep of deps.$order) {
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
    const impPath = ast.source.value;
    const impFileName = PATH.basename(impPath);
    const impFolderPath = impPath.indexOf('./') === 0 ?
        PATH.resolve( scriptPath, impPath.replace('./','').substring(0, impPath.replace('./','').lastIndexOf('/')) ) :
        impPath.substring(0, impPath.lastIndexOf("/"));

    const relImpPath = PATH.join( impFolderPath + impPath.substring( impPath.lastIndexOf('/') ) ).replace(ROOT + '\\','');
    const alreadyResolved = !!deps[relImpPath];
    deps[relImpPath] = alreadyResolved ? deps[relImpPath] : {};

    const constIds = [],
        constInits = [];
    for(let i = 0; i < specifiers.length; i++) {
        const specifier = specifiers[i];
        switch(specifier.type) {
        case "ImportDefaultSpecifier": {
            const name = `${specifier.local.name}`;
            //> ____rv4EXPORT____[`scriptPath`][____rv4DEFEXPORT_]
            const dependencyAst = MemberExpression(
                MemberExpression(
                    Identifier(____rv4EXPORT____),
                    Literal(relImpPath)
                ),
                Literal(____rv4DEFEXPORT_)
            ); 
            // > const `name` = ____rv4EXPORT____[`scriptPath`][____rv4DEFEXPORT_];
            // const constAst = $constant(Identifier(name), dependencyAst);
            constIds.push( Property(Identifier(name), Identifier(name), {shorthand: true}) );
            constInits.push( Property(Identifier(name), dependencyAst) );

            // DEPENDENCY
            if(!alreadyResolved) {                                                    // IS NOT RESOLVED                                                           
                deps[relImpPath][____rv4DEFEXPORT_] = await resolveDependency(relImpPath, ____rv4DEFEXPORT_, deps, impFolderPath, impFileName);
                deps.$order.push({path: relImpPath, name : ____rv4DEFEXPORT_});
            }
        }; break;
        case "ImportSpecifier": {
            const importedName = `${specifier.imported.name}`;
            const localName = `${specifier.local.name}`;
            //> ____rv4EXPORT____[`scriptPath`][importedName]
            const dependencyAst = MemberExpression(
                MemberExpression(
                    Identifier(____rv4EXPORT____),
                    Literal(relImpPath)
                ),
                Literal(importedName)
            ); 
            //> const `localName` = ____rv4EXPORT____[`scriptPath`][importedName];
            // const constAst = $constant(Identifier(localName), dependencyAst);
            constIds.push( Property(Identifier(localName), Identifier(localName), {shorthand: true}) );
            constInits.push( Property(Identifier(localName), dependencyAst) );
            // DEPENDENCY
            if(!alreadyResolved) {                                                    // IS NOT RESOLVED                                                           
                deps[relImpPath][importedName] = await resolveDependency(relImpPath, importedName, deps, impFolderPath, impFileName);
                deps.$order.push({path: relImpPath, name : importedName});
            }
        }; break;
        case "ImportNamespaceSpecifier": throw `${specifier.type} specifier type handler is not implemented <yet>.`;
        }
    }
    if(constIds.length === constInits.length && constIds.length > 0) {
        return Promise.resolve( $constants(constIds,constInits) );
    } else {
        return Promise.reject({error: "Unhandled Import Declaration case!"});
    }
}

async function resolveDependency(path, name, deps, folderPath, fileName) {
    // ____rv4EXPORT____(path, name, value);
    const getSetDependencyAst = (_name, _dependency) => {
        const arguments = [
            Literal(path),   // path
            Literal(_name), // depencency name
            _dependency
        ];
        return {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "CallExpression",
                    "callee": Identifier(____rv4SET_EXPORT____),
                    "arguments": arguments
            }
        }
    };

    const codeStr = await ReadFile(PATH.resolve( folderPath, fileName ));
    const moduleAst = ACORN.parse(codeStr, ACORN_OPTIONS);

    for(let i=0; i < moduleAst.body.length; i++ ) { //3
        const e = moduleAst.body[i];
        if(e.type==='ExportDefaultDeclaration') { // 4
            let dependencyFuncCallAst;
            if(e.declaration.type === 'AssignmentExpression') { // handle cases like `export default b = 'value'` to avoid creation of global variables
                dependencyFuncCallAst = getSetDependencyAst(name, e.declaration.right);
            } else {
                dependencyFuncCallAst = getSetDependencyAst(name, e.declaration);
            }
            moduleAst.body[i] = dependencyFuncCallAst;
        } else if(e.type==='ExportNamedDeclaration') { 
            if(e.specifiers.length) {
                const body = [];
                for(let i = 0; i < e.specifiers.length; i++) {
                    const specifier = e.specifiers[i];
                    body.push(getSetDependencyAst(specifier.exported.name, specifier.local))
                }
                moduleAst.body[i] = Object.assign({},AST_STATEMENTS.block, {body});
            } else if(ast.declarations !== null) {
                throw new Error('ExportNamedDeclaration.declarations handling not yet implemented!');
            }
        }else {
            moduleAst.body[i] = await Walk(e, deps, folderPath);
        }
    };

    //> ____rv4EXPORT____[`scriptPath`][name] = (function(){moduleBody})()
    const depInitExprAst = Object.assign({},  AST_EXPRESSIONS.expression);
    depInitExprAst.expression = {
        "type": "CallExpression",
        "callee": Object.assign({}, Object.assign({},AST_EXPRESSIONS.function)),
        "arguments": []
    };
    depInitExprAst.expression.callee.body = Object.assign({},AST_STATEMENTS.block);
    depInitExprAst.expression.callee.body.body = moduleAst.body;
    
    return Promise.resolve(depInitExprAst);
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

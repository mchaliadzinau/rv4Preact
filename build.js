const ACORN = require("acorn");
const { generate } = require('astring');
const FS = require("fs");
const PATH = require("path");

const {
    TYPES,
    Empty,
    Assignment, CallExpression, Conditional,
    FunctionExpression,FunctionDeclaration,
    MemberExpression, ObjectExpression, Identifier, Literal, Property, 
    VariableDeclaration, VariableDeclarator, 
    Block,Return,Expression,
    $constants
} = require("./ast/astUtils.js");

const ARGS = process.argv.slice(2);
const SOURCE = ARGS[0],
        OUTPUT = ARGS[1],
        SOURCE_DIR = SOURCE ? SOURCE.substring(0,SOURCE.lastIndexOf('/')).replace('./','') : 'tests/bundler' ;

const ____rv4EXPORT____ = '____rv4EXPORT____';
const ____rv4DEFEXPORT_ = '____rv4DEFEXPORT_';
const ____rv4SET_EXPORT____ = '____rv4SET_EXPORT____';

const ACORN_OPTIONS = {
    sourceType: 'module'
};

if(SOURCE) {
    TestPoC(SOURCE);
} else {
    const src = './tests/bundler/export_default_afunc.js';
    // const src ='./src/libs/preact.mjs';
    TestPoC(src);
}

function PrettyPrint(json) {
    console.log( JSON.stringify(json, null, 2) );
}

/**
 * 1) Went through nodes
 */
function Walk(ast, deps, scriptPath) {
    switch(ast.type) {
        case "Program": for(let i = 0; i < ast.body.length; i++) {
            const dep2const = Walk(ast.body[i], deps, scriptPath);
            ast.body[i] = dep2const;
        }; break;
        // import
        case "ImportDeclaration": 
            return HandleImportDeclaration(ast, deps, scriptPath) ;
    }
    // console.log('Walk complete!');
    return ast;
}

function TestPoC(source){
    const ast = ACORN.parse(FS.readFileSync(source), ACORN_OPTIONS);

    const deps = {
        '$order': []
    };
    const processedAst = Walk(ast,deps,__dirname);

    const modules = [];
    modules.push(VariableDeclaration([
        VariableDeclarator( Identifier(____rv4EXPORT____), ObjectExpression() )
    ]));
    // "function ____rv4SET_EXPORT____(path,name,value) {
    //    ____rv4EXPORT____[path] = ____rv4EXPORT____[path] ? ____rv4EXPORT____[path] : {};
    //    ____rv4EXPORT____[path][name] = value;
    // }"
    modules.push(
        FunctionDeclaration(
            Identifier(____rv4SET_EXPORT____),
            [ Identifier("path"), Identifier("name"), Identifier("value") ],
            Block([
                Expression(
                    Assignment(
                        MemberExpression( Identifier(____rv4EXPORT____), Identifier("path") ),
                        Conditional(
                            MemberExpression( Identifier(____rv4EXPORT____), Identifier("path") ),
                            MemberExpression( Identifier(____rv4EXPORT____), Identifier("path") ),
                            ObjectExpression()
                        )
                    )
                ),
                Expression(
                    Assignment(
                        MemberExpression( 
                            MemberExpression( 
                                Identifier(____rv4EXPORT____), 
                                Identifier("path") ),
                            Identifier("name") 
                        ),
                        Identifier("value")
                    )
                )
            ])
        )
    );
    for(relImpPath of deps.$order) {
        modules.push(deps[relImpPath]);
    }
    processedAst.body = modules.concat(processedAst.body);

    if(OUTPUT) {
        console.log(generate(processedAst)); // TO DO
    } else {
        PrettyPrint(processedAst);
    }
}

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
function HandleImportDeclaration(ast, deps, scriptPath) {
    const specifiers = ast.specifiers;
    if(ast.source.type.toUpperCase() !== "LITERAL") throw `${specifier.type} source type handler is not supported <yet>.`;
    const impPath = ast.source.value;
    const impFileName = PATH.basename(impPath);
    const impFolderPath = getFullImportPath(scriptPath, impPath);

    const relImpPath = PATH.join( impFolderPath + impPath.substring( impPath.lastIndexOf('/') ) ).replace(__dirname + '\\','');
    const depName = makeDepName(relImpPath);

    if(specifiers.length === 0) { // import side effect
        if(checkIfNotResolved(deps, depName)) {
            deps[depName] = resolveDependency(depName, deps, impFolderPath, impFileName);
            deps.$order.push(depName);
        }
        return Empty();
    }

    const constIds = [],
        constInits = [];
    for(let i = 0; i < specifiers.length; i++) {
        const specifier = specifiers[i];
        switch(specifier.type) {
        case TYPES.IMPORT_DEFAULT_SPECIFIER: {
            const refAsts = handleDependencyReference(depName, ____rv4DEFEXPORT_, specifier.local.name, deps, impFolderPath, impFileName);
            constIds.push(refAsts.id);
            constInits.push(refAsts.init);
        }; break;
        case TYPES.IMPORT_SPECIFIER: {
            const refAsts = handleDependencyReference(depName, specifier.imported.name, specifier.local.name, deps, impFolderPath, impFileName);
            constIds.push(refAsts.id);
            constInits.push(refAsts.init);
        }; break;
        case TYPES.IMPORT_NAMESPACE_SPECIFIER: 
            throw `${specifier.type} specifier type handler is not implemented <yet>.`;
        }
    }

    // check for errors ///////////////////////////////////////////////////////////////////////////
    if(!deps[depName]) throw new Error("Dependency was not resolved!"); 

    if(constIds.length === constInits.length && constIds.length > 0) {
        return $constants(constIds,constInits);
    } else {
        throw new Error("Unhandled Import Declaration case!");
    }
}

function checkIfNotResolved(deps,name) {
    return !deps[name];
}

function handleDependencyReference(depName, exportedName, importedName, deps, impFolderPath, impFileName) {
    //> ____rv4EXPORT____[`depName`][exportedName]
    const dependencyAst = MemberExpression(
        MemberExpression(
            Identifier(____rv4EXPORT____),
            Literal(depName)
        ),
        Literal(exportedName)
    ); 

    // DEPENDENCY
    if(checkIfNotResolved(deps, depName)) {                                                    // IS NOT RESOLVED                                                           
        deps[depName] = resolveDependency(depName, deps, impFolderPath, impFileName);
        deps.$order.push(depName);
    }

    return {//> const `importedName` = ____rv4EXPORT____[`depName`][exportedName];
        id: Property(Identifier(importedName), Identifier(importedName), {shorthand: true}),
        init: Property(Identifier(importedName), dependencyAst)
    };
}

function resolveDependency(depRef, deps, folderPath, fileName) {
    // ____rv4SET_EXPORT____(depRef, name, value);
    const getSetDependencyAst = (_name, _dependency) => {
        const arguments = [
            Literal(depRef),   // dependency reference
            Literal(_name), // depencency name
            _dependency
        ];
        return Expression( 
            CallExpression(
                Identifier(____rv4SET_EXPORT____), 
                arguments
            ) 
        );
    };

    const codeStr = FS.readFileSync(PATH.resolve( folderPath, fileName ));
    const moduleAst = ACORN.parse(codeStr, ACORN_OPTIONS);

    for(let i=0; i < moduleAst.body.length; i++ ) { //3
        const e = moduleAst.body[i];
        switch (e.type) {
            case TYPES.EXPORT_DEFAULT_DECLARATION:
                moduleAst.body[i] = getSetDependencyAst(____rv4DEFEXPORT_, getDefaultExportDeclaration(e)); break;
            case TYPES.EXPORT_NAMED_DECLARATION: {
                if(e.specifiers.length) {
                    const setDependencyAsts = e.specifiers.map(s => getSetDependencyAst(s.exported.name, s.local) );
                    moduleAst.body.splice(i,1, ...setDependencyAsts);
                } else if(e.declaration !== null) {
                    const body = [e.declaration];
                    if(e.declaration.type === TYPES.VARIABLE_DECLARATION) {
                        const declarations = e.declaration.declarations;
                        body.push(...declarations.map( d=>getSetDependencyAst(d.id.name, Identifier(d.id.name)) ))
                    } else {
                        const declaration = e.declaration;
                        body.push(getSetDependencyAst(declaration.id.name, Identifier(declaration.id.name)))
                    }
                    moduleAst.body.splice(i,1, ...body);
                }
            }; break;
            default: moduleAst.body[i] = Walk(e, deps, folderPath);
        }
    };

    //> ____rv4EXPORT____[`depRef`][name] = (function(){moduleBody})()
    const depInitExprAst = Expression(
        CallExpression(
            FunctionExpression(
                null,
                [],
                Block(moduleAst.body)
            )
        )
    );

    return depInitExprAst;
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

function makeDepName(relImpPath) {
    return relImpPath.replace(/\\/g,'#');
}

function getDefaultExportDeclaration(e) { // handle cases like `export default b = 'value'` to avoid creation of global variables
    return (e.declaration.type === TYPES.ASSIGNMENT_EXPRESSION) ? e.declaration.right : e.declaration;
}

function getFullImportPath(scriptPath, impPath) {
    return impPath.indexOf('./') === 0 
        ? PATH.resolve( 
            scriptPath.indexOf( PATH.join(__dirname, SOURCE_DIR) ) == 0 ?  scriptPath : PATH.join(__dirname, SOURCE_DIR), 
            impPath.replace('./','').substring(0, impPath.replace('./','').lastIndexOf('/')) 
        )
        :(
            impPath.indexOf('/') === 0 
            ? PATH.join( SOURCE_DIR, impPath.substring(0, impPath.lastIndexOf("/")))
            : impPath.substring(0, impPath.lastIndexOf("/"))
        );
}
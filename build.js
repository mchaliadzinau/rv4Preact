const ACORN = require("acorn");
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
    const ast = ACORN.parse("import A from './tests/bundler/export_default_afunc.js';", ACORN_OPTIONS);
    // const ast = ACORN.parse("import {h} from './src/libs/preact.mjs';", ACORN_OPTIONS);

    const deps = {
        '$order': []
    };
    const processedAst = await Walk(ast,deps,__dirname);

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

    if(specifiers.length === 0) { // import side effect
        if(!alreadyResolved) {
            deps[relImpPath] = await resolveDependency(relImpPath, deps, impFolderPath, impFileName);
            deps.$order.push(relImpPath);
        }
        return Promise.resolve( Empty() );
    }

    const constIds = [],
        constInits = [];
    for(let i = 0; i < specifiers.length; i++) {
        const specifier = specifiers[i];
        switch(specifier.type) {
        case TYPES.IMPORT_DEFAULT_SPECIFIER: {
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
            constIds.push( Property(Identifier(name), Identifier(name), {shorthand: true}) );
            constInits.push( Property(Identifier(name), dependencyAst) );

            // DEPENDENCY
            if(!alreadyResolved) {                                                    // IS NOT RESOLVED                                                           
                deps[relImpPath] = await resolveDependency(relImpPath, deps, impFolderPath, impFileName);
                deps.$order.push(relImpPath);
            }
        }; break;
        case TYPES.IMPORT_SPECIFIER: {
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
            constIds.push( Property(Identifier(localName), Identifier(localName), {shorthand: true}) );
            constInits.push( Property(Identifier(localName), dependencyAst) );
            // DEPENDENCY
            if(!alreadyResolved) {                                                    // IS NOT RESOLVED                                                           
                deps[relImpPath] = await resolveDependency(relImpPath, deps, impFolderPath, impFileName);
                deps.$order.push(relImpPath);
            }
        }; break;
        case TYPES.IMPORT_NAMESPACE_SPECIFIER: 
            throw `${specifier.type} specifier type handler is not implemented <yet>.`;
        }
    }

    // check for errors ///////////////////////////////////////////////////////////////////////////
    if(!deps[relImpPath]) throw new Error("Dependency was not resolved!"); 

    if(constIds.length === constInits.length && constIds.length > 0) {
        return Promise.resolve( $constants(constIds,constInits) );
    } else {
        throw new Error("Unhandled Import Declaration case!");
    }
}

async function resolveDependency(path, deps, folderPath, fileName) {
    // ____rv4SET_EXPORT____(path, name, value);
    const getSetDependencyAst = (_name, _dependency) => {
        const arguments = [
            Literal(path),   // path
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

    const codeStr = await ReadFile(PATH.resolve( folderPath, fileName ));
    const moduleAst = ACORN.parse(codeStr, ACORN_OPTIONS);

    for(let i=0; i < moduleAst.body.length; i++ ) { //3
        const e = moduleAst.body[i];
        if(e.type=== TYPES.EXPORT_DEFAULT_DECLARATION) { // 4
            let dependencyFuncCallAst;
            if(e.declaration.type === TYPES.ASSIGNMENT_EXPRESSION) { // handle cases like `export default b = 'value'` to avoid creation of global variables
                dependencyFuncCallAst = getSetDependencyAst(____rv4DEFEXPORT_, e.declaration.right);
            } else {
                dependencyFuncCallAst = getSetDependencyAst(____rv4DEFEXPORT_, e.declaration);
            }
            moduleAst.body[i] = dependencyFuncCallAst;
        } else if(e.type===TYPES.EXPORT_NAMED_DECLARATION) { 
            if(e.specifiers.length) {
                const body = [];
                for(let i = 0; i < e.specifiers.length; i++) {
                    const specifier = e.specifiers[i];
                    body.push(getSetDependencyAst(specifier.exported.name, specifier.local))
                }
                moduleAst.body.splice(i,1, ...body);
            } else if(e.declaration !== null) {
                const body = [e.declaration];
                if(e.declaration.type === TYPES.VARIABLE_DECLARATION) {
                    const declarations = e.declaration.declarations;
                    const count = declarations.length;
                    for(let i = 0; i < count; i++) {
                        const declaration = declarations[i];
                        body.push(getSetDependencyAst(declaration.id.name, Identifier(declaration.id.name)))
                    }
                } else {
                    const declaration = e.declaration;
                    body.push(getSetDependencyAst(declaration.id.name, Identifier(declaration.id.name)))
                }
                moduleAst.body.splice(i,1, ...body);
            }
        }else {
            moduleAst.body[i] = await Walk(e, deps, folderPath);
        }
    };

    //> ____rv4EXPORT____[`scriptPath`][name] = (function(){moduleBody})()
    const depInitExprAst = Expression(
        CallExpression(
            FunctionExpression(
                null,
                [],
                Block(moduleAst.body)
            )
        )
    );

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

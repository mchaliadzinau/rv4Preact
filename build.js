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
        OUTPUT = ARGS[1];

const ____rv4EXPORT____ = '____rv4EXPORT____';
const ____rv4DEFEXPORT_ = '____rv4DEFEXPORT_';
const ____rv4SET_EXPORT____ = '____rv4SET_EXPORT____';

const ACORN_OPTIONS = {
    sourceType: 'module'
};

if(SOURCE && OUTPUT) {
    const bundledAst = Bundle(SOURCE);
    if(OUTPUT) {
        console.log(generate(bundledAst)); // TO DO
    } else {
        PrettyPrint(bundledAst);
    }

} else {
    console.error('SOURCE and OUTPUT are not specidied.');
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

function Bundle(source){
    const ast = ACORN.parse(FS.readFileSync(source), ACORN_OPTIONS);

    const deps = {
        '$order': []
    };
    const fullPathToSource = PATH.resolve(__dirname, source);
    const processedAst = Walk(ast,deps, PATH.dirname(fullPathToSource) );

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

    return processedAst;
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
    const impFolderPath = getFullImportDir(scriptPath, impPath, PATH.join( __dirname, PATH.dirname(SOURCE)) );

    const relImpPath = PATH.join( impFolderPath, impFileName).replace( PATH.join(__dirname, '/'),'');
    const depName = makeDepName(relImpPath);

    if(specifiers.length === 0) { // import side effect
        if(checkIfNotResolved(deps, depName)) {
            resolveDependency(depName, deps, impFolderPath, impFileName);
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
            case TYPES.IMPORT_NAMESPACE_SPECIFIER: {
                const refAsts = handleDependencyReference(depName, '*', specifier.local.name, deps, impFolderPath, impFileName);
                constIds.push(refAsts.id);
                constInits.push( // TO DO Refactor
                    Property(
                        Identifier(specifier.local.name),
                        ObjectExpression(
                            deps.$exportables[depName].map(exportedName => 
                                Property(
                                    Identifier(exportedName === ____rv4DEFEXPORT_ ? 'default' : exportedName),
                                    MemberExpression(
                                        MemberExpression(
                                            Identifier(____rv4EXPORT____),
                                            Literal(depName)
                                        ),
                                        Literal(exportedName)
                                    )
                                )
                            )
                        )
                    )
                );
            }; break;
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
        resolveDependency(depName, deps, impFolderPath, impFileName);
    }

    return {//> const `importedName` = ____rv4EXPORT____[`depName`][exportedName];
        id: Property(Identifier(importedName), Identifier(importedName), {shorthand: true}),
        init: Property(Identifier(importedName), dependencyAst)
    };
}

function resolveDependency(depRef, deps, folderPath, fileName) {
    const codeStr = FS.readFileSync(PATH.resolve( folderPath, fileName ));
    const moduleAst = ACORN.parse(codeStr, ACORN_OPTIONS);

    for(let i=0; i < moduleAst.body.length; i++ ) { //3
        const e = moduleAst.body[i];
        switch (e.type) {
            case TYPES.EXPORT_DEFAULT_DECLARATION: {
                addToExportableList(deps, depRef, ____rv4DEFEXPORT_);
                moduleAst.body[i] = createSetDependencyAst(depRef, ____rv4DEFEXPORT_, getDefaultExportDeclaration(e)); 
            } break;
            case TYPES.EXPORT_NAMED_DECLARATION: {
                if(e.specifiers.length) {
                    const setDependencyAsts = e.specifiers.map(s => {
                        addToExportableList(deps, depRef, s.exported.name);
                        return createSetDependencyAst(depRef, s.exported.name, s.local) 
                    });
                    moduleAst.body.splice(i,1, ...setDependencyAsts);
                } else if(e.declaration !== null) {
                    const body = [e.declaration];
                    if(e.declaration.type === TYPES.VARIABLE_DECLARATION) {
                        const declarations = e.declaration.declarations;
                        body.push(...declarations.map( d=> {
                            addToExportableList(deps, depRef, d.id.name);
                            return createSetDependencyAst(depRef, d.id.name, Identifier(d.id.name)) 
                        }));
                    } else {
                        const declaration = e.declaration;
                        addToExportableList(deps, depRef, declaration.id.name);
                        body.push(createSetDependencyAst(depRef, declaration.id.name, Identifier(declaration.id.name)))
                    }
                    moduleAst.body.splice(i,1, ...body);
                }
            }; break;
            case TYPES.EXPORT_ALL_DECLARATION: 
                throw `${e.type} specifier type handler is not implemented <yet>.`;

            default: moduleAst.body[i] = Walk(e, deps, folderPath);
        }
    };

    //> MODULES[`depRef`][name] = (function(){moduleBody})()
    deps[depRef] = Expression( 
        CallExpression(
            FunctionExpression(null, [], Block(moduleAst.body))
        )
    );
    deps.$order.push(depRef);
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

function getFullImportDir(consumerDir, impPath, absSrcDir) {
    const dirPath = PATH.dirname(impPath);
    if(impPath.indexOf('.') === 0) {
        return PATH.resolve(consumerDir, dirPath);
    } else if(impPath.indexOf('/') === 0) {
        return PATH.join( absSrcDir, dirPath);
    } else {
        throw new Error('Incorrect import path: ' + impPath);
    }
}

function createSetDependencyAst(depRef, name, dependency) {  // ____rv4SET_EXPORT____(depRef, name, value);
    const arguments = [
        Literal(depRef),   // dependency reference
        Literal(name), // depencency name
        dependency
    ];
    return Expression( 
        CallExpression(
            Identifier(____rv4SET_EXPORT____), 
            arguments
        ) 
    );
};

function addToExportableList(deps, depRef, exportableName) {
    deps.$exportables = deps.$exportables ? deps.$exportables : {};
    if(deps.$exportables[depRef]) {
        deps.$exportables[depRef].push(exportableName);
    } else {
        deps.$exportables[depRef] = [exportableName];
    }   
}

module.exports = {
    PrettyPrint,
    Walk,
    Bundle,
    HandleImportDeclaration,
    checkIfNotResolved,
    handleDependencyReference,
    resolveDependency,
    makeDepName,
    getDefaultExportDeclaration,
    getFullImportDir,
    createSetDependencyAst,
}
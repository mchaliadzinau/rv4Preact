const ACORN = require("acorn");
const FS = require("fs");

//
const AST_CONSTS = require("./ast.consts.json");
const AST_FUNC_NAMED = require("./ast.named-func.json")


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
async function Walk(ast, dependenciesPlainGraph) {
    switch(ast.type) {
        case "Program": for(let i = 0; i < ast.body.length; i++) {
            ast.body[i] = await Walk(ast.body[i], dependenciesPlainGraph);
        }; break;
        // import
        case "ImportDeclaration": {
            const mod = await HandleImportDeclaration(ast) ;
            dependenciesPlainGraph[ mod.name ] = mod.funcs;
            return mod.funcs;
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
    PrettyPrint(await Walk(ast,dependenciesPlainGraph));
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
 * @param {*} ast 
 */
async function HandleImportDeclaration(ast) {
    const specifiers = ast.specifiers;
    if(ast.source.type.toUpperCase() !== "LITERAL") throw `${specifier.type} source type handler is not supported <yet>.`
    const sourcePath = ast.source.value;
    const mod = {
        name : `${sourcePath.replace(/[./\\]/g,'_')}`,
        funcs : {}
    };
    for(let i = 0; i < specifiers.length; i++) {
        const specifier = specifiers[i];
        switch(specifier.type) {
            case "ImportDefaultSpecifier": {               
                const name = `${specifier.local.name}`;
                const codeStr = await ReadFile(sourcePath);
                const ast = ACORN.parse(codeStr, ACORN_OPTIONS);
                const body = ast.body; //2
                const moduleBody = body.map(e=>{ //3
                    if(e.type==='ExportDefaultDeclaration') { // 4
                        return {
                            type: "ReturnStatement",
                            argument: Object.assign({}, e.declaration, {start: undefined, end: undefined})
                        }
                    }
                    return e;
                });
                mod.funcs[name] = Object.assign({}, // 5
                    AST_FUNC_NAMED,
                    {
                        id:{name}, 
                        body:{
                            body: [...moduleBody]
                        }
                    }
                )
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
        FS.readFile(path, (err, data) => {
            if (err) throw reject(err);
            resolve(data);
        })
    }) 
}
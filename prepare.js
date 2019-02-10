/**
 * This script copies all dependencies into ./src/libs/ directory
 */
// REQUIREMENTS:
const FS = require('fs');
const path = require('path');
const ACORN = require("acorn");
const ASTRING = require('astring')
const { Transform } = require('stream');

const AST_EXPORT_DEFAULT = require('./ast/ast.export-default.json');
const package   = require('./package.json');

// ARGS:
const ARGS = process.argv.slice(2);
// GLOBAL DATA:
const PATH_LIBS = './src/libs/';
const PATH_MODULES = './node_modules/';
const ACORN_OPTIONS = {
    ecmaVersion: 7,
    sourceType: 'module'
}

ARGS.length && console.log(ARGS); // handle agruments to distinguish DEV & PROD

class Es6 extends Transform {
    constructor(options) {
      super(options);
      this.transform = this.transform.bind(this);
    }

    transform(chunk, encoding, callback) {
        var upperChunk = chunk.toString().toUpperCase();
        this.push(upperChunk);
        console.log(upperChunk);
        cb();
    }
  }

const importSourcesTransform = { 
    transform(chunk, encoding, callback){ 
        // TO DO Refactor
        const ast = ACORN.parse(chunk.toString(), ACORN_OPTIONS);
        const bodyLength = ast.body.length;
        let i = 0, souldContinue = true;
        while (i < bodyLength && souldContinue) {
            const line = ast.body[i];
            if(line.type === "ImportDeclaration") {
                if(line.source.type.toUpperCase() !== "LITERAL") throw `${line.source.type} source type handler is not supported <yet>.`;
                const depName = line.source.value;
                if(depName === 'preact') { // TO DO Refactor
                    line.source.value = '/libs/preact.mjs';
                    line.source.raw = `'${line.source.value}'`
                } else {
                    const extName = path.extname(depName);
                    switch(extName) {
                        case '' :   { line.source.value += '.mjs'; line.source.raw = `'${line.source.value}'`} break
                        case '.js': { line.source.value.replace(/\.js$/,'.mjs'); line.source.raw = `'${line.source.value}'`} break
                    }
                }
            } else {
                souldContinue = false;
            }
            i++;
        }
        callback(false, ASTRING.generate(ast))
        // callback(<error>, <result>) callback(false, <transformed-chunk>); 
    } 
};

const CJs2Es6Transform = { 
    transform(chunk, encoding, callback){ 
        // TO DO Refactor
        const ast = ACORN.parse(chunk.toString(), ACORN_OPTIONS);
        const bodyLength = ast.body.length;
        let i = 0;
        while (i < bodyLength) {
            const line = ast.body[i];
            if(line.type === "ExpressionStatement" 
                && line.expression.type === "AssignmentExpression" 
                && line.expression.left.type === "MemberExpression") {
            
                // handle module.exports case
                if(line.expression.left.object.type === "Identifier"
                    && line.expression.left.object.name === "module"
                    && line.expression.left.property.type === "Identifier"
                    && line.expression.left.property.name === "exports") {
                    const rightExpression = line.expression.right;
                    ast.body[i] = {
                        "type": "ExportDefaultDeclaration",
                        "declaration": rightExpression
                    };
                }

                // handle module.exports.x case
                if(line.expression.left.object.type === "MemberExpression"
                    && line.expression.left.object.object.type === "Identifier"
                    && line.expression.left.object.object.name === "module"
                    && line.expression.left.object.object.type === "Identifier"
                    && line.expression.left.object.property.type === "Identifier") {
                    
                    const propName = line.expression.left.object.property.name;
                    const rightExpression = line.expression.right;
                    ast.body[i] =     {
                        "type": "ExportNamedDeclaration",
                        "declaration": {
                          "type": "VariableDeclaration",
                          "declarations": [
                            {
                              "type": "VariableDeclarator",
                              "id": {
                                "type": "Identifier",
                                "name": propName
                              },
                              "init": rightExpression
                            }
                          ],
                          "kind": "const"
                        },
                        "specifiers": [],
                        "source": null
                    };
                }
            }
            i++;
        }
        callback(false, ASTRING.generate(ast))
        // callback(<error>, <result>) callback(false, <transformed-chunk>); 
    } 
};

const depNames  = Object.keys(package.dependencies);
const libsPath = path.resolve(__dirname, PATH_LIBS);
if (!FS.existsSync(libsPath)){
    FS.mkdirSync(libsPath);
}

const depCount = depNames.length;
for(let i = 0; i < depCount; i++) {
    const name = depNames[i];
    const packagePath = path.resolve(__dirname, PATH_MODULES, name);
    const packageJSON = require( path.resolve(packagePath, 'package.json') );
    
    const moduleDestPath = path.resolve(libsPath, `${name}.mjs`);
    if(packageJSON.module) {
        const moduleSourcePath = path.resolve(packagePath, packageJSON.module);
        try {
            switch (name) {
                case 'unistore' : {
                    const libsUnistorePath = path.resolve(libsPath,'unistore');
                    const libsUnistorePreactPath = path.resolve(libsUnistorePath,'integrations') ;
                    if ( !FS.existsSync(libsUnistorePath) ){
                        FS.mkdirSync(libsUnistorePath);
                        FS.mkdirSync(libsUnistorePreactPath);
                    }

                    FS.createReadStream( moduleSourcePath ).pipe(new Transform(importSourcesTransform))
                        .pipe( FS.createWriteStream( path.resolve(libsUnistorePath, `${name}.mjs`)) );
                    FS.createReadStream( 'node_modules/unistore/src/util.js' ).pipe(new Transform(importSourcesTransform))
                        .pipe( FS.createWriteStream( path.resolve(libsUnistorePath, `util.mjs`)) );
                    FS.createReadStream( 'node_modules/unistore/src/integrations/preact.js' ).pipe(new Transform(importSourcesTransform))
                        .pipe( FS.createWriteStream( path.resolve(libsUnistorePreactPath, `preact.mjs`)) );
                    FS.createReadStream( 'node_modules/unistore/devtools.js' ).pipe(new Transform(CJs2Es6Transform))
                        .pipe( FS.createWriteStream( path.resolve(libsUnistorePath, `devtools.mjs`)) );

                    // https://stackoverflow.com/a/40295288/4728612
                    // FS.createReadStream( 'node_modules/unistore/src/devtools.js' )
                    //     .pipe( FS.createWriteStream( path.resolve(libsUnistorePath, `devtools.mjs`)) );
                } break; 
                default : {
                    FS.createReadStream( moduleSourcePath )
                    .pipe(FS.createWriteStream( moduleDestPath ));
                }
            }

        } catch (e) {
            console.error(`ERROR:\t [${name + package.dependencies[name]}] Copying ${moduleSourcePath} to ${moduleDestPath} failed`, e);
        }
        
        console.log(`OK:\t [${name + package.dependencies[name]}] is copied to ${moduleDestPath}` );
    } else { // handle situations when package have no es6 module version
        switch (name) { // TO DO Rework to be able to use plugins instead hardcoded code
            case 'tree': { // example of converting IIFE to es6 module
                const scriptPath = path.resolve(packagePath, 'tree.js');
                try {
                    FS.writeFileSync( moduleDestPath, IIFE2MODULE(scriptPath) );
                } catch(e) {
                    console.error('ERROR:\t Cannot read ' + name, e);
                }
            }; break;
            default: 
                console.error('ERROR:\t ES6 module has not been found for ' + name);
        }    
        console.log(`OK:\t [${name + package.dependencies[name]}] is copied to ${moduleDestPath}` );
    }
    
}

function IIFE2MODULE(scriptPath) {
    const data = FS.readFileSync(scriptPath);
    const ast = ACORN.parse(data, ACORN_OPTIONS);
    if(ast.body.length && ast.body[0].type === 'ExpressionStatement' && ast.body[0].expression.type === 'CallExpression') {
        const moduleAST = Object.assign({}, AST_EXPORT_DEFAULT, {
            declaration: ast.body[0]
        });
        return ASTRING.generate(moduleAST);
    } else {
        throw new Error(`ERROR:\t IIFE not found in script ${scriptPath}`);
    }
}
/**
 * This script copies all dependencies into ./src/libs/ directory
 */
// REQUIREMENTS:
const FS = require('fs');
const path = require('path');
const ACORN = require("acorn");
const ASTRING = require('astring')

const AST_EXPORT_DEFAULT = require('./ast/ast.export-default.json');
const package   = require('./package.json');

// ARGS:
const ARGS = process.argv.slice(2);
// GLOBAL DATA:
const PATH_LIBS = './src/libs/';
const PATH_MODULES = './node_modules/';
const ACORN_OPTIONS = {
    ecmaVersion: 7
}

ARGS.length && console.log(ARGS); // handle agruments to distinguish DEV & PROD

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
                    FS.createReadStream( moduleSourcePath )
                    .pipe( FS.createWriteStream( path.resolve(libsUnistorePath, `${name}.mjs`)) );
                    FS.createReadStream( 'node_modules/unistore/src/util.js' )
                    .pipe( FS.createWriteStream( path.resolve(libsUnistorePath, `util.mjs`)) );
                    FS.createReadStream( 'node_modules/unistore/src/integrations/preact.js' )
                    .pipe( FS.createWriteStream( path.resolve(libsUnistorePreactPath, `preact.mjs`)) );
                    console.log(libsUnistorePath, libsUnistorePath, libsUnistorePreactPath)
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


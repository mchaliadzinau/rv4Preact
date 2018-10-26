/**
 * This script copies all dependencies into ./src/libs/ directory
 */
const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);

const PATH_LIBS = './src/libs/';
const PATH_MODULES = './node_modules/';

const package   = require('./package.json');
const depNames  = Object.keys(package.dependencies);

ARGS.length && console.log(ARGS); // handle agruments to distinguish DEV & PROD

const libsPath = path.resolve(__dirname, PATH_LIBS);
if (!fs.existsSync(libsPath)){
    fs.mkdirSync(libsPath);
}

const depCount = depNames.length;
for(let i = 0; i < depCount; i++) {
    const name = depNames[i];
    const packagePath = path.resolve(__dirname, PATH_MODULES, name);
    const packageJSON = require( path.resolve(packagePath, 'package.json') );
    
    if(packageJSON.module) {
        const moduleSourcePath = path.resolve(packagePath, packageJSON.module);
        const moduleDestPath = path.resolve(libsPath, `${name}.mjs`);
        fs.createReadStream( moduleSourcePath )
        .pipe(fs.createWriteStream( moduleDestPath ));
        
        console.log(`OK:\t ${name + package.dependencies[name]} is copied to ${moduleDestPath} directory.` );
    } else {
        switch (name) {
            default: console.error('ERROR:\t ES6 module has not been found for ' + name);
        }    
    }
    
}


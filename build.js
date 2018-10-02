const ACORN = require("acorn");
const FS = require("fs");

const SCRIPT = './src/index.js';
const ACORN_OPTIONS = {
    ecmaVersion: 7,
    sourceType: 'module'
}

function prettyPrint(json) {
    console.log( JSON.stringify(json, null, 2) );
}

FS.readFile(SCRIPT, (err, data) => {
    if (err) throw err;
    const ast = ACORN.parse(data, ACORN_OPTIONS);
    prettyPrint(ast);
});


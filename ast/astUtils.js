const AST_EXPRESSIONS = require("./ast.expressions.json");

function Literal(value, raw) {
    return {"type": "Literal",            value,      "raw": (raw ? raw : `"'${value}'"`) };
}
function Identifier(name) {
    return {"type": "Identifier",         name};
}
function Property(key,value, params = {}) {
    return Object.assign({
        "type": "Property",
        "method": false,
        "shorthand": false,
        "computed": false,
        "key": key,
        "kind": "init",
        "value": value
    }, params);
}
function ObjectExpression(properties) {
    properties = typeof properties === 'undefined' ? [] : properties;
    return {"type": "ObjectExpression",   properties};
}
function ObjectPattern(properties) {
    properties = typeof properties === 'undefined' ? [] : properties;
    return {"type": "ObjectPattern", "properties": properties};
}
function MemberExpression(object,property,computed = true) {
    return Object.assign({}, AST_EXPRESSIONS.member, {
        object,
        property,
        computed
    });
}
function VariableDeclaration(declarations, kind = 'const') {
    declarations = typeof declarations === 'undefined' ? [] : declarations;
    if(!Array.isArray(declarations)) throw new Error('VariableDeclaration expects declarations to be an array.');
    return {
        "type": "VariableDeclaration",
        "declarations": declarations,
        "kind": kind
    }
}
function VariableDeclarator(id,init) { 
    return {"type": "VariableDeclarator", id,         init};
}


module.exports = {
    Literal, Identifier, Property, ObjectExpression, MemberExpression, VariableDeclarator,
    $constant: (id, init) => VariableDeclaration([VariableDeclarator(id, init)]),
    $constants: (idProperties, initProperties) => VariableDeclaration([
        VariableDeclarator(
            ObjectPattern(idProperties), 
            ObjectExpression(initProperties)
        )
    ]),
    $destructuringAssignmentConst: (identifiers, props) => {
        const leftProps = identifiers.map(name =>
            Property(
                Identifier(name),
                Identifier(name),
                {"shorthand": true,}
            )             
        );
        const rightValues = props.map(prop => 
            Property(
                Identifier(prop.name),
                prop.valueAst
            )    
        );

        return VariableDeclaration([
            VariableDeclarator(
                ObjectPattern(leftProps),
                ObjectExpression(rightValues)
            )
        ]);
    }
}
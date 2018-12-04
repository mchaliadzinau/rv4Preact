const AST_EXPRESSIONS = require("./ast.expressions.json");

function Literal(value, raw) {
    return {"type": "Literal",            value,      "raw": (raw ? raw : `"'${value}'"`) };
}
function Identifier(name) {
    return {"type": "Identifier",         name};
}
function ObjectExpression(properties=[]) {
    return {"type": "ObjectExpression",   properties};
}
function MemberExpression(object,property,computed = true) {
    return Object.assign({}, AST_EXPRESSIONS.member, {
        object,
        property,
        computed
    });
}
function VariableDeclarator(id,init) { 
    return {"type": "VariableDeclarator", id,         init};
}


module.exports = {
    Literal, Identifier, ObjectExpression, MemberExpression, VariableDeclarator,
    $constant: (id, init) => ({
        "type": "VariableDeclaration",
        "declarations": [
            VariableDeclarator(id, init)
        ],
        "kind": "const"
    }),
    $destructuringAssignmentConst: (identifiers, props) => {

        const leftProps = identifiers.map(name => (                    {
            "type": "Property",
            "method": false,
            "shorthand": true,
            "computed": false,
            "key":      Identifier(name),
            "kind": "init",
            "value":    Identifier(name),
        }));
        const rightValues = props.map(prop => ({
            "type": "Property",
            "method": false,
            "shorthand": false,
            "computed": false,
            "key":      Identifier(prop.name),
            "value":    prop.valueAst,
            "kind": "init"
        }));

        return {
            "type": "VariableDeclaration",
            "declarations": [
                {
                    "type": "VariableDeclarator",
                    "id": {
                        "type": "ObjectPattern",
                        "properties": leftProps
                    },
                    "init": {
                        "type": "ObjectExpression",
                        "properties": rightValues
                    }
                }
            ],
            "kind": "const"
        };
    }
}
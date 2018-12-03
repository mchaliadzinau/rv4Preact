const AST_EXPRESSIONS = require("./ast.expressions.json");

module.exports = {
    Literal: (value, raw) =>                ({"type": "Literal",            value,      "raw": (raw ? raw : `"'${value}'"`) }),
    Identifier: (name) =>                   ({"type": "Identifier",         name}),
    ObjectExpression: (properties=[]) =>    ({"type": "ObjectExpression",   properties}),
    MemberExpression: (object,property,computed = true) => 
        Object.assign({}, AST_EXPRESSIONS.member, {
            object,
            property,
            computed
        }
    ),
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
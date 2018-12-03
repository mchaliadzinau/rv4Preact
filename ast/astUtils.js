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

}
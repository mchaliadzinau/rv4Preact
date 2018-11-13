# bundler

## Export 
  All modules converted to IIFE.
  Export statements are replaced with assignment to `EXPORT` object like:

    {__default, a, b, c...}

  At the end of module a `ReturnStatement` with argument `EXPORT` is placed.

### ExportNamedDeclaration
  * `if "specifiers" is defined`: replace `ExportNamedDeclaration` with assignment to `EXPORT` variable like:

        EXPORT.es1_exported_name = es1__local_name;
        EXPORT.es2_exported_name = es2__local_name;

  * `if "declaration" or "declarations"`: replace `VariableDeclaration` with assignment to `EXPORT` variable like:

        EXPORT.vd1_id_name = vd1_init;
        EXPORT.vd2_id_name = vd2_init;

### ExportDefaultDeclaration 
  * `if edd.declaration.type === 'AssignmentExpression'` it is replaced with assignment to `EXPORT` variable like:
        
        EXPORT.__default = e.declaration.right; // e.g. `export default b = 'value'`:

  * `else` it is replaced with assignment to `EXPORT` variable like:                
        
        EXPORT.__default = e.declaration;

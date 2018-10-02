set -x
mkdir -p src/lib/
cp node_modules/preact/dist/preact.mjs src/lib/preact.mjs
npm i -g http-server
set +x
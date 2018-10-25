set -x
mkdir -p src/libs/
cp node_modules/preact/dist/preact.mjs src/libs/preact.mjs
npm i -g http-server
set +x
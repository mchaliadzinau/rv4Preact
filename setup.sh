set -x
mkdir -p src/@/
cp node_modules/preact/dist/preact.mjs src/@/preact.mjs
npm i -g http-server
set +x
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('firebase.json', 'utf8'));

if (!config.emulators) {
  config.emulators = {};
}

config.emulators = {
  ...config.emulators,
  auth: { port: 9099 },
  firestore: { port: 8080 },
  database: { port: 9000 },
  hosting: { port: 5000 },
  functions: { port: 5001 },
  storage: { port: 9199 },
  ui: { enabled: true }
};

fs.writeFileSync('firebase.json', JSON.stringify(config, null, 2));

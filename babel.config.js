const fs = require('fs');
const path = require('path');

module.exports = function(api) {
  api.cache.using(() => {
    try {
      return String(fs.statSync(path.resolve(__dirname, '.env')).mtimeMs);
    } catch {
      return 'sin-env';
    }
  });

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env',
        allowUndefined: false,
      }]
    ],
  };
};

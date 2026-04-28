const path = require('path');

module.exports = {
  port: process.env.PORT || 3000,
  staticDir: path.join(__dirname, '..', 'public')
};

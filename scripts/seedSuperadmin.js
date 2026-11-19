// Kept at the repository root for the documented local workflow.
// The implementation lives beside the server code so it is also available
// inside the server container for the Docker quickstart.
const seedSuperadmin = require('../server/scripts/seedSuperadmin');

if (require.main === module) {
  seedSuperadmin();
}

module.exports = seedSuperadmin;

const activityRoutes = require('./activityRoutes');
const service = require('./activityService');

module.exports = {
  activityRoutes,
  recordActivity: service.record,
  recordActivityInBackground: service.recordInBackground,
  ...service
};

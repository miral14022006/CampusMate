/**
 * Client-side feature flags configuration.
 * Defaults to true for all active features, overridable by environment variables.
 */
export const features = {
  calendar: import.meta.env.VITE_FEATURE_CALENDAR !== 'false',
  calendarGoogleOAuth: import.meta.env.VITE_FEATURE_CALENDAR_GOOGLE_OAUTH === 'true', // off by default
  sceneSnap: import.meta.env.VITE_FEATURE_SCENE_SNAP === 'true' // default false
};

export default features;

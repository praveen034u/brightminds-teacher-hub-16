/**
 * Auth0 Action: Add Role to BrightMinds Token
 * 
 * This Action adds the user's role to the ID token and Access token
 * as a custom claim that can be read by the BrightMinds application.
 * 
 * Installation:
 * 1. Go to Auth0 Dashboard → Actions → Library
 * 2. Click "Build Custom"
 * 3. Name: "Add BrightMinds Role to Token"
 * 4. Trigger: Login / Post Login
 * 5. Copy and paste this code
 * 6. Click "Deploy"
 * 7. Go to Actions → Flows → Login
 * 8. Drag this action into the flow (after "Start")
 * 9. Click "Apply"
 */

/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Get the user's role from app_metadata
  // Default to 'teacher' if no role is set
  const role = event.user.app_metadata?.role || 'teacher';

  console.log(`Adding role to token for user ${event.user.email}: ${role}`);

  // Add role to ID token (used by frontend)
  // Using namespaced claim to avoid conflicts
  api.idToken.setCustomClaim('https://brightminds.ai4magic.com/role', role);

  // Also add to access token (used by API)
  api.accessToken.setCustomClaim('https://brightminds.ai4magic.com/role', role);

  // Optional: Add school_id if stored in app_metadata
  if (event.user.app_metadata?.school_id) {
    api.idToken.setCustomClaim('https://brightminds.ai4magic.com/school_id', event.user.app_metadata.school_id);
    api.accessToken.setCustomClaim('https://brightminds.ai4magic.com/school_id', event.user.app_metadata.school_id);
  }

  // Optional: Add other custom claims as needed
  // Example: Add permissions
  // const permissions = event.user.app_metadata?.permissions || [];
  // api.accessToken.setCustomClaim('https://brightminds/permissions', permissions);
};


/**
 * Handler that will be invoked when this action is resuming after an external redirect. If your
 * onExecutePostLogin function does not perform a redirect, this function can be safely ignored.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
// exports.onContinuePostLogin = async (event, api) => {
// };

// Auth0 Debug Utilities - Simplified to prevent console spam
export const testAuth0Configuration = async () => {
  const domain = "dev-jbrriuc5vyjmiwtx.us.auth0.com";
  
  try {
    const response = await fetch(`https://${domain}/.well-known/openid-configuration`, {
      method: 'GET',
      mode: 'cors'
    });
    
    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const debugAuth0State = () => {
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 URL Search Params:', window.location.search);
  console.log('🔍 URL Hash:', window.location.hash);
  console.log('🔍 Local Storage Keys:', Object.keys(localStorage));
  console.log('🔍 Session Storage Keys:', Object.keys(sessionStorage));
};
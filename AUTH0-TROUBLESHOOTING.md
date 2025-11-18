# Auth0 Configuration Troubleshooting Guide

## Current Configuration:
- **Domain**: `dev-jbrriuc5vyjmiwtx.us.auth0.com`
- **Client ID**: `hRgZXlSYVCedu8jYuTWadyoTA3T8EISD`
- **Redirect URI**: `http://localhost:8080` (and any other URLs you're using)

## Required Auth0 Dashboard Settings:

### 1. Application Type
- ✅ Must be set to **"Single Page Application (SPA)"**

### 2. Allowed Callback URLs
Add these URLs to your Auth0 application settings:
```
http://localhost:8080
http://localhost:8080/
http://localhost:3000
http://localhost:3000/
https://your-domain.com
https://your-domain.com/
```

### 3. Allowed Logout URLs
```
http://localhost:8080
http://localhost:3000
https://your-domain.com
```

### 4. Allowed Web Origins
```
http://localhost:8080
http://localhost:3000
https://your-domain.com
```

### 5. Allowed Origins (CORS)
```
http://localhost:8080
http://localhost:3000
https://your-domain.com
```

## Common Issues & Solutions:

### Issue 1: "Invalid redirect URI"
- **Solution**: Add your exact URL to "Allowed Callback URLs"
- **Check**: Make sure the URL matches exactly (including trailing slashes)

### Issue 2: CORS errors in console
- **Solution**: Add your domain to "Allowed Web Origins" and "Allowed Origins (CORS)"

### Issue 3: "Application not found" or "Unauthorized"
- **Solution**: Verify Domain and Client ID are correct
- **Check**: Domain should NOT include `https://` prefix

### Issue 4: Login button does nothing
- **Solution**: Check browser console for JavaScript errors
- **Check**: Network tab for failed requests to Auth0

## Debug Steps:

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Click "Sign In with Auth0" button
4. Look for error messages
5. Check Network tab for failed requests
6. Use the "🔧 Debug Auth0" button in the login page

## Manual Verification:

Visit this URL to test your Auth0 configuration:
```
https://dev-jbrriuc5vyjmiwtx.us.auth0.com/.well-known/openid-configuration
```

You should see a JSON response with Auth0 configuration details.
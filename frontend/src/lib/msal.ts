import { PublicClientApplication, Configuration, LogLevel } from '@azure/msal-browser';

const tenantId = import.meta.env.VITE_AZURE_TENANT_ID as string;
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID as string;

if (!tenantId || !clientId) {
  console.error(
    'Missing VITE_AZURE_TENANT_ID or VITE_AZURE_CLIENT_ID. Check frontend/.env'
  );
}

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: `${window.location.origin}/auth/callback`,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error('[MSAL]', message);
        if (level === LogLevel.Warning) console.warn('[MSAL]', message);
      },
    },
  },
};

// Scopes requested when acquiring an access token for the backend API.
// The custom API scope (api://<clientId>/access_as_user) is what makes MSAL
// issue an access token whose audience is *this app* rather than Microsoft
// Graph — the backend validates that audience against AZURE_CLIENT_ID.
// 'openid profile email' add the standard OIDC claims (oid, preferred_username).
export const loginRequest = {
  scopes: [`api://${clientId}/access_as_user`, 'openid', 'profile', 'email'],
};

export const msalInstance = new PublicClientApplication(msalConfig);

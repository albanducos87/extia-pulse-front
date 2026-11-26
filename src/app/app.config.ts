import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor, LogLevel, provideAuth } from 'angular-auth-oidc-client';
import { environment } from '../environments/environment';

registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideHttpClient(withInterceptors([authInterceptor()])),
    provideAuth({
      config: {
        authority: environment.cognito.authority,
        clientId: environment.cognito.clientId,
        redirectUrl: `${window.location.origin}/callback`,
        postLogoutRedirectUri: window.location.origin,
        scope: 'openid email profile',
        responseType: 'code',
        silentRenew: true,
        useRefreshToken: true,
        secureRoutes: [environment.apiUrl],
        logLevel: LogLevel.Debug,
        disableRefreshTokenOfflineAccessScopeWarning: true,
        customParamsAuthRequest: { lang: 'fr' }
      },
    }),
  ],
};

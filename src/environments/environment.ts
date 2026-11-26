export const environment = {
    production: false,
    apiUrl: 'http://localhost:8080/api',
    cognito: {
        authority: 'https://cognito-idp.ca-central-1.amazonaws.com/ca-central-1_ph7eMdOMf',
        clientId: '36kl03m24300oo99qe4snao52a',
        redirectUri: 'http://localhost:8080',
        logoutUri: 'http://localhost:8080',
        domain: 'https://ca-central-1ph7emdomf.auth.ca-central-1.amazoncognito.com'
    }
}
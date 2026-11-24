export const environment = {
    production: false,
    apiUrl: 'http://localhost:8080/api',
    cognito: {
        authority: 'https://cognito-idp.ca-central-1.amazonaws.com/ca-central-1_lOUPOdDIO',
        clientId: '1spqco37pa52324psklchsklbs',
        redirectUri: 'http://localhost:8080',
        logoutUri: 'http://localhost:8080',
        domain: 'https://ca-central-1loupoddio.auth.ca-central-1.amazoncognito.com'
    }
}
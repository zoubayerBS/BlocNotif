export default {
  providers: [
    {
      type: "customJwt",
      issuer: "https://glorious-crocodile-963.eu-west-1.convex.site",
      jwks: "https://glorious-crocodile-963.eu-west-1.convex.site/jwks.json",
      algorithm: "RS256",
      applicationID: "blocnotif",
    },
  ],
};

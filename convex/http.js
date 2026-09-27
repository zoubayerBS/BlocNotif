import { httpRouter, httpActionGeneric } from "convex/server";

const http = httpRouter();

// JWKS public : clé publique utilisée par Convex pour vérifier les JWT de session.
const JWKS = {
  keys: [
    {
      kty: "RSA",
      n: "tCw9iGT8H0FHS7pz2vfEP-AForpugfUPxJ51yUPKbDRh8ElZWTwA3Y0Eat3iOCFsI8NgpzUt2ACWqitLmjCp4u9K4OdaqWbm619sfEn0qoUzBoDNrrMkvoB8cJBZ8sZ7R4vZrlwj28RGi0b6hMUILoesBFmYtZxIjKBrLXOqYy2wn6yKgw97DeGqxryp8iP5Rg_BtAJu4LT6C0bM0t2xRANcGF_ZjeF-0SnLlCOwc1BpL4cKAoVVIA5Pfh4sWxVcPE7jqnoBsn54dCDLLjjd2fljGFJFZwmaBRdOCX53JGlNX3nSmE7XmP3CXY7EC_XmOP8bvjxjC-MtqDvmpsTIcQ",
      e: "AQAB",
      kid: "blocnotif-1",
      alg: "RS256",
      use: "sig",
    },
  ],
};

http.route({
  path: "/jwks.json",
  method: "GET",
  handler: httpActionGeneric(async () => {
    return new Response(JSON.stringify(JWKS), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }),
});

export default http;

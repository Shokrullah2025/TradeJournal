// Test OAuth URL generation
const testOAuthUrl = () => {
  const origin = "http://localhost:5173";
  const params = new URLSearchParams({
    client_id: "3239",
    redirect_uri: `${origin}/auth/callback/tradovate`,
    response_type: "code",
    scope: "read trade",
    state: JSON.stringify({ broker: "tradovate", timestamp: Date.now() }),
  });

  const oauthUrl = `https://trader.tradovate.com/oauth?${params.toString()}`;
  console.log("Generated OAuth URL:", oauthUrl);
  console.log(
    "Expected format: https://trader.tradovate.com/oauth?client_id=3239&redirect_uri=..."
  );

  return oauthUrl;
};

testOAuthUrl();

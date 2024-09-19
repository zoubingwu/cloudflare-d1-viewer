export const onRequest = async (context) => {
  const originUrl = new URL(context.request.url);
  const url = new URL(
    originUrl.toString().replace(originUrl.origin + "/api", ""),
    "https://api.cloudflare.com",
  );

  return await fetch(url, context.request);
};

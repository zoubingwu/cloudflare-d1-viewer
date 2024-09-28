async function downloadFileFromCloudflareStorage(url) {
  const s3Url = decodeURIComponent(url.searchParams.get("url"));
  if (!s3Url) {
    return new Response("No URL provided", { status: 400 });
  }
  try {
    const response = await fetch(s3Url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log(response);

    const headers = new Headers(response.headers);
    headers.set("Content-Disposition", "attachment");

    return new Response(response.body, {
      headers: headers,
      status: response.status,
      statusText: response.statusText,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response("Error fetching the file", { status: 500 });
  }
}

export const onRequest = async (context) => {
  const originUrl = new URL(context.request.url);
  if (originUrl.pathname === "/api/download") {
    console.log("download");
    return await downloadFileFromCloudflareStorage(originUrl);
  }

  const url = new URL(
    originUrl.toString().replace(originUrl.origin + "/api", ""),
    "https://api.cloudflare.com",
  );

  return await fetch(url, context.request);
};

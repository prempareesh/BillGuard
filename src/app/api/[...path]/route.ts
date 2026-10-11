import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_BASE_URL = (
  process.env.BACKEND_API_URL ||
  "http://billguard-api-prod.eba-szpxm8he.ap-southeast-2.elasticbeanstalk.com"
).replace(/\/+$/, "");

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

interface RouteContext {
  params: Promise<{
    path: string[];
  }>;
}

async function handleProxy(req: NextRequest, ctx: RouteContext): Promise<Response> {
  const startTime = Date.now();
  let targetUrl = "";

  try {
    const { path } = await ctx.params;
    const subPath = Array.isArray(path) ? path.join("/") : String(path || "");
    const search = req.nextUrl.search || "";
    targetUrl = `${UPSTREAM_BASE_URL}/api/${subPath}${search}`;

    // Filter headers (drop hop-by-hop)
    const forwardHeaders = new Headers();
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!HOP_BY_HOP_HEADERS.has(lower)) {
        forwardHeaders.set(key, value);
      }
    });

    // Provide client IP tracking if available
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
    if (clientIp) {
      forwardHeaders.set("x-forwarded-for", clientIp);
    }

    const hasBody = !["GET", "HEAD"].includes(req.method.toUpperCase());
    let bodyBytes: ArrayBuffer | undefined = undefined;

    if (hasBody) {
      try {
        const buffer = await req.arrayBuffer();
        if (buffer.byteLength > 0) {
          bodyBytes = buffer;
        }
      } catch {
        // No body stream or empty
      }
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: bodyBytes,
      signal: AbortSignal.timeout(45000), // 45s timeout for AI OCR / Gemini jobs
    });

    const responseBody = await upstreamRes.arrayBuffer();
    const responseHeaders = new Headers();

    upstreamRes.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (!HOP_BY_HOP_HEADERS.has(lower)) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(responseBody, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: responseHeaders,
    });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.message.includes("timeout") || error.name === "AbortError");

    console.error(
      `[Reverse Proxy Error] ${req.method} ${targetUrl || req.nextUrl.pathname} (${duration}ms):`,
      error instanceof Error ? error.message : String(error)
    );

    return NextResponse.json(
      {
        detail: isTimeout
          ? "Upstream Elastic Beanstalk backend timed out."
          : "Unable to reach upstream Elastic Beanstalk backend.",
        error: error instanceof Error ? error.message : "Proxy request failed",
        target: targetUrl || req.nextUrl.pathname,
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

export async function OPTIONS(req: NextRequest, ctx: RouteContext) {
  return handleProxy(req, ctx);
}

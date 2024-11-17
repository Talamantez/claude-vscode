// deno/main.ts
import { serve } from "https://deno.land/std@0.220.1/http/server.ts";

interface RequestCount {
  count: number;
  lastReset: number;
}

interface RateLimit {
  remaining: number;
  reset: number;
}

// Constants
const REQUESTS_PER_IP = 25; // Free requests per IP per day
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const REQUESTS_PER_WINDOW = 5; // 5 requests per minute

// Use Deno KV to track requests
const kv = await Deno.openKv();

async function getRequestCount(ip: string): Promise<RequestCount> {
  const key = ["requests", ip];
  const entry = await kv.get<RequestCount>(key);
  
  if (!entry.value) {
    return { count: 0, lastReset: Date.now() };
  }

  // Reset count if it's been more than a day
  if (Date.now() - entry.value.lastReset > MS_PER_DAY) {
    return { count: 0, lastReset: Date.now() };
  }

  return entry.value;
}

async function incrementRequestCount(ip: string): Promise<number> {
  const key = ["requests", ip];
  const count = await getRequestCount(ip);
  
  const newCount = {
    count: count.count + 1,
    lastReset: count.lastReset
  };
  
  await kv.set(key, newCount);
  return REQUESTS_PER_IP - newCount.count;
}

async function getRateLimit(ip: string): Promise<RateLimit> {
  const now = Date.now();
  const windowKey = ["ratelimit", ip, Math.floor(now / RATE_LIMIT_WINDOW)];
  const count = (await kv.get<number>(windowKey))?.value ?? 0;
  
  return {
    remaining: REQUESTS_PER_WINDOW - count,
    reset: Math.ceil((Math.floor(now / RATE_LIMIT_WINDOW) + 1) * RATE_LIMIT_WINDOW)
  };
}

async function updateRateLimit(ip: string): Promise<void> {
  const now = Date.now();
  const windowKey = ["ratelimit", ip, Math.floor(now / RATE_LIMIT_WINDOW)];
  const count = (await kv.get<number>(windowKey))?.value ?? 0;
  await kv.set(windowKey, count + 1, { expireIn: RATE_LIMIT_WINDOW });
}

async function askClaude(text: string, ip: string): Promise<Response> {
  try {
    // Check rate limits
    const rateLimit = await getRateLimit(ip);
    if (rateLimit.remaining <= 0) {
      return new Response(
        JSON.stringify({ 
          error: 'RATE_LIMIT_EXCEEDED',
          resetIn: Math.ceil((rateLimit.reset - Date.now()) / 1000),
          message: `Too many requests. Please try again in ${Math.ceil((rateLimit.reset - Date.now()) / 1000)} seconds.`
        }), 
        { 
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    // Check daily limits
    const count = await getRequestCount(ip);
    if (count.count >= REQUESTS_PER_IP) {
      const timeUntilReset = (count.lastReset + MS_PER_DAY) - Date.now();
      return new Response(
        JSON.stringify({ 
          error: 'DAILY_LIMIT_EXCEEDED',
          resetIn: Math.ceil(timeUntilReset / (60 * 1000)), // minutes
          message: `Daily limit reached. Resets in ${Math.ceil(timeUntilReset / (60 * 1000))} minutes.`
        }), 
        { 
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    // Update rate limit counter
    await updateRateLimit(ip);

    const apiKey = Deno.env.get("CLAUDE_API_KEY");
    if (!apiKey) {
      throw new Error("API key not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2024-01-01",
      },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: [{
            type: "text",
            text: text
          }]
        }],
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      let errorMessage = `API error: ${status}`;
      
      switch(status) {
        case 401:
          errorMessage = 'Invalid API key or authentication failed';
          break;
        case 429:
          errorMessage = 'Claude API rate limit exceeded. Please try again later.';
          break;
        case 500:
          errorMessage = 'Claude API server error. Please try again.';
          break;
        case 400:
          const errorData = await response.json();
          errorMessage = `Request error: ${errorData.error?.message || 'Unknown error'}`;
          break;
      }
      
      throw new Error(errorMessage);
    }

    const claudeResponse = await response.json();
    const remaining = await incrementRequestCount(ip);

    return new Response(
      JSON.stringify({ 
        ...claudeResponse,
        remaining,
        dailyLimit: REQUESTS_PER_IP
      }), 
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store"
        },
      }
    );
  } catch (error) {
    console.error('Error in askClaude:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRateLimit = errorMessage.includes('rate limit') || errorMessage.includes('limit exceeded');
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        type: 'error',
        timestamp: new Date().toISOString()
      }), 
      {
        status: isRateLimit ? 429 : 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

const handler = async (request: Request): Promise<Response> => {
  // Add health check endpoint
  if (request.method === "GET" && new URL(request.url).pathname === "/health") {
    return new Response(JSON.stringify({
      status: "healthy",
      version: "1.1.0",
      timestamp: new Date().toISOString()
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // Get client IP
  const ip = request.headers.get("x-forwarded-for")?.split(',')[0] || "unknown";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { 
      status: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      }
    });
  }

  try {
    const { prompt } = await request.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: prompt is required and must be a string' }), 
        { 
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          }
        }
      );
    }

    return await askClaude(prompt, ip);
  } catch (error) {
    console.error('Handler error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Invalid request format',
        type: 'error',
        timestamp: new Date().toISOString()
      }), 
      { 
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      }
    );
  }
};

console.log("Service starting on port 8000...");
serve(handler, { port: 8000 });
// deno/main.ts
import { serve } from "https://deno.land/std@0.220.1/http/server.ts";

interface RequestCount {
  count: number;
  lastReset: number;
}

// Use Deno KV to track requests
const kv = await Deno.openKv();
const REQUESTS_PER_IP = 25; // Free requests per IP per day
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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

async function askClaude(text: string, ip: string): Promise<Response> {
  try {
    // Check remaining requests
    const count = await getRequestCount(ip);
    if (count.count >= REQUESTS_PER_IP) {
      const timeUntilReset = (count.lastReset + MS_PER_DAY) - Date.now();
      return new Response(
        JSON.stringify({ 
          error: 'RATE_LIMIT_EXCEEDED',
          resetIn: Math.ceil(timeUntilReset / (60 * 1000)), // minutes
          message: `Free tier limit reached. Resets in ${Math.ceil(timeUntilReset / (60 * 1000))} minutes.`
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("CLAUDE_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        messages: [{
          role: "user",
          content: text,
        }],
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
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
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      {
        status: 500,
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
      version: "1.0.0",
      timestamp: new Date().toISOString()
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }

  // Get client IP
  const ip = request.headers.get("x-forwarded-for") || "unknown";

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
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
    return await askClaude(prompt, ip);
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
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

console.log("Service starting...");
serve(handler, { port: 8000 });
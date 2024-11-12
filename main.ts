// main.ts
import { serve } from "https://deno.land/std@0.220.1/http/server.ts";

const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");

let isServerReady = true;

if (!CLAUDE_API_KEY) {
  console.error("CLAUDE_API_KEY environment variable not set");
  isServerReady = false;
}

async function askClaude(text: string): Promise<Response> {
  try {
    if (!isServerReady) {
      throw new Error("Server is not properly configured: Missing API key");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CLAUDE_API_KEY!,
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
      const errorData = await response.text();
      throw new Error(`API error: ${response.status} - ${errorData}`);
    }

    return new Response(await response.body, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

const handler = async (request: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
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
    return await askClaude(prompt);
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });
  }
};

console.log("Server starting on http://localhost:8000");
serve(handler, { port: 8000 });
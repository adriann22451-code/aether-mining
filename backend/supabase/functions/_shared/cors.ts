// _shared/cors.ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten this to your Mini App's actual domain once deployed
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

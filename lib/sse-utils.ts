/**
 * Read an SSE stream from the chat API and update the assistant message
 * incrementally as tokens arrive. Falls back to JSON response if the
 * response is not SSE (e.g. error fallback from server).
 */
export async function readSSEStream(
  response: Response,
  onToken: (token: string, isReasoning?: boolean) => void,
  onDone: (fullText: string) => void,
  onError: (err: Error) => void
) {
  const contentType = response.headers.get("Content-Type") || "";

  // If the server returned JSON (error fallback), handle it directly
  if (contentType.includes("application/json")) {
    const data = await response.json();
    if (data.response) {
      onDone(data.response);
    } else {
      onError(new Error(data.error || "Unknown error"));
    }
    return;
  }

  // SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    onError(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let isDone = false;

  try {
    while (!isDone) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed === "data: [DONE]") {
          isDone = true;
          break;
        }

        if (trimmed.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.token !== undefined) {
              accumulated += parsed.token;
              onToken(parsed.token, parsed.isReasoning);
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }

    // Stream ended (either [DONE] or TCP close)
    if (accumulated) {
      // Parse any tool calls present in the AI response
      const toolCallRegex = /\[TOOL_CALL:\s*([a-zA-Z0-9_]+)\((.*?)\)\]/gi;
      let match;
      while ((match = toolCallRegex.exec(accumulated)) !== null) {
        const toolName = match[1];
        const argsStr = match[2];
        const argRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
        const args: Record<string, string> = {};
        let argMatch;
        while ((argMatch = argRegex.exec(argsStr)) !== null) {
          args[argMatch[1]] = argMatch[2];
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("ai-tool-call", {
              detail: { tool: toolName, args },
            })
          );
        }
      }

      // Clean tool call markup from final transcript text
      const cleanText = accumulated.replace(/\[TOOL_CALL:[\s\S]*?\]/gi, "").trim();
      onDone(cleanText || accumulated);
    } else {
      onDone(""); // Support empty responses just in case
    }
  } catch (err) {
    onError(err instanceof Error ? err : new Error("Stream read error"));
  }
}

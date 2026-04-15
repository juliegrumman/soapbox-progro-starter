/**
 * Shared agentic tool-use loop — used by all orchestrators and standalone agents.
 *
 * This is the core pattern: send a task to Claude with a specialized system prompt
 * and custom tools, execute tool calls locally, loop until Claude is done.
 */

import Anthropic from "@anthropic-ai/sdk";

export interface SubAgentConfig {
  name: string;
  system: string;
  tools: Anthropic.Messages.Tool[];
  toolHandlers: Record<string, (input: Record<string, unknown>) => Promise<string>>;
  task: string;
  model?: string;
  maxTokens?: number;
  maxIterations?: number;
}

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 10;

export async function runSubAgent(
  client: Anthropic,
  config: SubAgentConfig
): Promise<string> {
  const model = config.model ?? DEFAULT_MODEL;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;

  console.log(`\n🔄 Dispatching: ${config.name}`);
  console.log(`   Task: ${config.task.slice(0, 80)}...`);

  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: config.task },
  ];

  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: config.system,
      tools: config.tools,
      messages,
    });

    // If the agent is done, return its text output
    if (response.stop_reason === "end_turn") {
      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      console.log(
        `   ✅ ${config.name} complete (${iterations} iteration${iterations > 1 ? "s" : ""})`
      );
      return text;
    }

    // If tool use requested, execute tools and continue
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use"
      );

      console.log(
        `   🔧 Tools called: ${toolUseBlocks.map((b) => b.name).join(", ")}`
      );

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const handler = config.toolHandlers[block.name];
        if (!handler) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: Unknown tool "${block.name}"`,
            is_error: true,
          });
          continue;
        }
        try {
          const result = await handler(block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: `Error: ${err instanceof Error ? err.message : String(err)}`,
            is_error: true,
          });
        }
      }

      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }
  }

  console.log(`   ⚠️  ${config.name} hit max iterations`);
  return `[${config.name} reached maximum iterations without completing]`;
}

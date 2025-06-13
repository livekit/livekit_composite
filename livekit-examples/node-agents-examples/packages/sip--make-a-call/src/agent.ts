import {
  cli,
  defineAgent,
  type JobContext,
  llm,
  multimodal,
  WorkerOptions,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import {fileURLToPath} from 'url';

export const agentName = 'telephony-make-call-agent';

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    const participant = await ctx.waitForParticipant();

    const model = new openai.realtime.RealtimeModel({
      instructions: `
You are calling someone on the phone. Your goal is to know if they prefer 
chocolate or vanilla ice cream. That's the only question you should ask, and 
you should get right to the point. Say something like "Hello, I'm calling to 
ask you a question about ice cream. Do you prefer chocolate or vanilla?"
      `,
    });

    const agent = new multimodal.MultimodalAgent({model});
    const session = await agent
      .start(ctx.room, participant)
      .then(session => session as openai.realtime.RealtimeSession);

    session.conversation.item.create(
      llm.ChatMessage.create({
        role: llm.ChatRole.ASSISTANT,
        text: "Hello, I'm calling to ask you a question about ice cream. Do you prefer chocolate or vanilla?",
      }),
    );

    session.response.create();
  },
});

cli.runApp(
  new WorkerOptions({agent: fileURLToPath(import.meta.url), agentName}),
);

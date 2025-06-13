import {
  cli,
  defineAgent,
  type JobContext,
  type JobProcess,
  llm,
  pipeline,
  WorkerOptions,
} from '@livekit/agents';
import * as deepgram from '@livekit/agents-plugin-deepgram';
import * as openai from '@livekit/agents-plugin-openai';
import * as silero from '@livekit/agents-plugin-silero';
import {fileURLToPath} from 'url';

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    const participant = await ctx.waitForParticipant();

    const initialContext = new llm.ChatContext().append({
      role: llm.ChatRole.SYSTEM,
      text: 'You are a helpful agent. When the user speaks, you listen and respond.',
    });

    const agent = new pipeline.VoicePipelineAgent(
      ctx.proc.userData.vad! as silero.VAD,
      new deepgram.STT(),
      new openai.LLM({
        model: 'gpt-4o',
      }),
      new openai.TTS(),
      {
        chatCtx: initialContext,
      },
    );

    agent.start(ctx.room, participant);

    const llmStream = agent.llm.chat({
      chatCtx: new llm.ChatContext().append({
        role: llm.ChatRole.ASSISTANT,
        text: 'Introduce yourself as a helpful agent that will listen and respond.',
      }),
    });

    await agent.say(llmStream);
  },
});

cli.runApp(new WorkerOptions({agent: fileURLToPath(import.meta.url)}));

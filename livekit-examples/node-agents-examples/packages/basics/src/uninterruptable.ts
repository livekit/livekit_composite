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
      text: 'You are a helpful assistant communicating through voice who is not interruptable.',
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
        allowInterruptions: false,
      },
    );

    agent.start(ctx.room, participant);

    const llmStream = agent.llm.chat({
      chatCtx: new llm.ChatContext().append({
        role: llm.ChatRole.USER,
        text: "Say something somewhat long and boring so I can test if you're interruptable.",
      }),
    });

    await agent.say(llmStream, false);
  },
});

cli.runApp(new WorkerOptions({agent: fileURLToPath(import.meta.url)}));

import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  multimodal,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import {RoomServiceClient} from 'livekit-server-sdk';
import {fileURLToPath} from 'url';

import { verifyEnv } from './env.js';


const {
  LIVEKIT_API_KEY = '',
  LIVEKIT_API_SECRET = '',
  LIVEKIT_URL = '',
} = verifyEnv([
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'LIVEKIT_URL',
]);

const roomServiceClient = new RoomServiceClient(
  LIVEKIT_URL,
  LIVEKIT_API_KEY,
  LIVEKIT_API_SECRET,
);

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    console.log('waiting for participant');
    const participant = await ctx.waitForParticipant();
    console.log(`starting assistant example agent for ${participant.identity}`);
    let callerPoints = 0;
    let agentPoints = 0;

    const model = new openai.realtime.RealtimeModel({
      instructions: `You are Tike Mrapp, the original host and creator of 'Um, Actually.'
        Your mission is to deliver the quintessential 'Um, Actually' experience
        to people who call in to your show.

        You will provide a series of statements about various aspects of 'nerd'
        culture—video games, movies, comics, fantasy, sci-fi, etc. Each
        statement will contain exactly one factual inaccuracy.
        
        The caller must identify and correct that inaccuracy, starting their correction
        with a resounding 'Um, Actually...' to earn a point. If the caller's
        response does not begin with 'Um, Actually,' or if they provide an
        incorrect correction, you, Tike Mrapp, receive the point and the caller
        cannot attempt to correct that statement again.
        
        Emphasize this rule: 'Um, Actually' is not just a suggestion, it's a requirement!
        Maintain your signature enthusiastic, slightly chaotic, and pedantic hosting style.
        Embrace tangents, celebrate the minutiae, and deliver dramatic pauses before
        revealing the correct answers. Remember to use phrases like
        'That's a good correction' or 'Oh, that's a deep cut!' and lean into the
        and lean into the absurd joy of correcting fictional details.

        If the caller asks a question answer their question and then repeat the statement they need to correct.

        Here are some rules for you to follow:

        - Do not offer the caller a chance to correct their answer.
        - Do not offer the caller another round of the game.
        - If the caller asks about the points, call the pointsStatus function.
        - If the caller makes a correct correction, call the userPoints function.
        - If the caller earns a point, call the userPoints function.
        - If the caller makes an incorrect correction, you, Tike Mrapp, earn a point, call the systemPoints function.
        - If the caller fails to correct the statement, you, Tike Mrapp, earn a point, call the systemPoints function.
        - If the caller fails to say 'Um, Actually', you, Tike Mrapp, earn a point, call the systemPoints function.
        - If the caller says goodbye, or tries to end the call, call the gameEnd function.
        - If the caller accumulates three points, thank them for playing and then call the gameEnd function.
        - If you, Tike Mrapp, accumulates three correct points, thank them for playing and then call the gameEnd function.
        - If the caller says "Get in the comments!" ask if their name is "Brennan Lee Mulligan"`,
    });

    const fncCtx: llm.FunctionContext = {
      gameEnd: {
        description: 'End the game and delete the room',
        parameters: {},
        execute: async () => {
          console.log('Waiting for 20 seconds before deleting room...');

          // Schedule disconnection
          setTimeout(async () => {
            console.log('Deleting room...');
            await roomServiceClient.deleteRoom(ctx.room.name!);
          }, 20000);

          return 'Game over, thank you for playing. Goodbye!';
        },
      },
      userPoints: {
        description: 'When the caller gets a point, call this function',
        parameters: {},
        execute: async () => {
          callerPoints++;
          console.log(
            `callerPoints: ${callerPoints}, agentPoints: ${agentPoints}`,
          );
          return `That is correct. You currently have ${callerPoints} points.`;
        },
      },
      systemPoints: {
        description: 'When the system gets a point, call this function',
        parameters: {},
        execute: async () => {
          agentPoints++;
          console.log(
            `callerPoints: ${callerPoints}, agentPoints: ${agentPoints}`,
          );
          return `That is incorrect. I currently have ${agentPoints} points.`;
        },
      },
      pointsStatus: {
        description: 'When a caller asks about the points, call this function',
        parameters: {},
        execute: async () => {
          console.log('The user asked about the points.');
          return `You currently have ${callerPoints} points and I currently have ${agentPoints} points.`;
        },
      },
    };

    const agent = new multimodal.MultimodalAgent({model, fncCtx});
    const session = await agent
      .start(ctx.room, participant)
      .then(session => session as openai.realtime.RealtimeSession);

    session.conversation.item.create(
      new llm.ChatMessage({
        role: llm.ChatRole.ASSISTANT,
        content:
          'Greet the caller as Tike Mrapp, host of Um, Actually, and explain the rules of the game.',
      }),
    );
    session.response.create();
  },
});

cli.runApp(new WorkerOptions({agent: fileURLToPath(import.meta.url)}));

// import {
//   BedrockRuntimeClient,
//   InvokeModelWithResponseStreamCommand,
// } from '@aws-sdk/client-bedrock-runtime';
// import { AWSBedrockAnthropicStream, StreamingTextResponse } from 'ai';
// import { experimental_buildAnthropicPrompt } from 'ai/prompts';

// // IMPORTANT! Set the runtime to edge
// export const runtime = 'edge';
 
// const bedrockClient = new BedrockRuntimeClient({
//   region: process.env.AWS_REGION ?? 'us-east-1',
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
//   },
// });
 
// export async function POST(req: Request) {

//   // Extract the `prompt` from the body of the request
//   const { messages } = await req.json();


 
//   // // Ask Claude for a streaming chat completion given the prompt
//   const bedrockResponse = await bedrockClient.send(
//     new InvokeModelWithResponseStreamCommand({
//       modelId: 'anthropic.claude-v2',
//       contentType: 'application/json',
//       accept: 'application/json',
//       body: JSON.stringify({
//         prompt: experimental_buildAnthropicPrompt(messages),
//         max_tokens_to_sample: 300,
//       }),
//     }),
//   );

 
//   // Convert the response into a friendly text-stream
//   const stream = AWSBedrockAnthropicStream(bedrockResponse);
 
//   // Respond with the stream
//   return new StreamingTextResponse(stream);
// }


import { StreamingTextResponse } from 'ai';
import { Message as VercelChatMessage } from "ai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HttpResponseOutputParser } from "langchain/output_parsers";
import { BedrockChat } from "@langchain/community/chat_models/bedrock/web";


// IMPORTANT! Set the runtime to edge
export const runtime = 'edge';

const formatMessage = (message: VercelChatMessage) => {
  return `${message.role}: ${message.content}`;
};

const TEMPLATE = `You are a muliple developer.

Current conversation:
{chat_history}

User: {input}
AI:`;
 
export async function POST(req: Request) {

  // Extract the `prompt` from the body of the request
  // const { messages } = await req.json();

  const body = await req.json();
  const messages = body.messages ?? [];
  const formattedPreviousMessages = messages.slice(0, -1).map(formatMessage);
  const currentMessageContent = messages[messages.length - 1].content;
  const prompt = PromptTemplate.fromTemplate(TEMPLATE);

  const model = new BedrockChat({
    model: "anthropic.claude-v2",
  region: process.env.AWS_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  },
  });
    
  // const res = await model.invoke("Tell me a joke");
  // console.log(res);

  const outputParser = new HttpResponseOutputParser();
  const chain = prompt.pipe(model).pipe(outputParser);
  const stream = await chain.stream({
    chat_history: formattedPreviousMessages.join("\n"),
    input: currentMessageContent,
  });
 
  // Convert the response into a friendly text-stream
  // const stream = AWSBedrockAnthropicStream(bedrockResponse);
 
  // Respond with the stream
  return new StreamingTextResponse(stream);
}
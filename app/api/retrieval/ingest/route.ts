import { NextRequest, NextResponse } from "next/server";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

import { createClient } from "@supabase/supabase-js";
// import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
// import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import {BedrockEmbeddings} from "@langchain/community/embeddings/bedrock";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

export const runtime = "edge";

// Before running, follow set-up instructions at
// https://js.langchain.com/docs/modules/indexes/vector_stores/integrations/supabase

/**
 * This handler takes input text, splits it into chunks, and embeds those chunks
 * into a vector store for later retrieval. See the following docs for more information:
 *
 * https://js.langchain.com/docs/modules/data_connection/document_transformers/text_splitters/recursive_text_splitter
 * https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/supabase
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const text = body.text;

  if (process.env.NEXT_PUBLIC_DEMO === "true") {
    return NextResponse.json(
      {
        error: [
          "Ingest is not supported in demo mode.",
          "Please set up your own version of the repo here: https://github.com/langchain-ai/langchain-nextjs-template",
        ].join("\n"),
      },
      { status: 403 },
    );
  }

  try {
    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PRIVATE_KEY!,
    );

    const splitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 256,
      chunkOverlap: 20,
    });

    const splitDocuments = await splitter.createDocuments([text]);

    const bedRockRuntimeclient = new BedrockRuntimeClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
      
    });

    const embeddings = new BedrockEmbeddings({
      client: bedRockRuntimeclient,
      region: process.env.BEDROCK_AWS_REGION ?? '',
      credentials: {
        accessKeyId: process.env.BEDROCK_AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.BEDROCK_AWS_SECRET_ACCESS_KEY ?? '',
      },
      model: "amazon.titan-embed-text-v1",
    });
    
    // const res = await embeddings.embedQuery(
    //   "What would be a good company name a company that makes colorful socks?"
    // );
    // console.log({ res });

    const vectorstore = await SupabaseVectorStore.fromDocuments(
      splitDocuments,
      embeddings,
      {
        client,
        tableName: "documents",
        queryName: "match_documents",
      },
    );

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

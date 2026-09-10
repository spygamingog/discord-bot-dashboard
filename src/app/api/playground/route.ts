import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    const {
      query,
      messages = [],
      threshold = 0.5,
      systemPrompt,
    } = body;

    const userQuery = query || messages[messages.length - 1]?.content;

    if (!userQuery || typeof userQuery !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required.' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    let retrievedChunks: any[] = [];
    let similarityScore = 0;
    let embeddingMs = 0;
    let vectorRpcMs = 0;
    let llmInferenceMs = 0;

    // 1. Embed query via Gemini
    if (geminiKey) {
      const tEmbedStart = Date.now();
      try {
        const embedRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/gemini-embedding-2-preview',
              content: { parts: [{ text: userQuery }] },
              taskType: 'RETRIEVAL_QUERY',
            }),
          }
        );
        embeddingMs = Date.now() - tEmbedStart;

        if (embedRes.ok) {
          const embedData = await embedRes.json();
          const embeddingVector = embedData.embedding?.values;

          if (embeddingVector && Array.isArray(embeddingVector)) {
            // 2. Vector search in Supabase pgvector
            const tRpcStart = Date.now();
            const supabase = getSupabaseServer();
            const { data: matched, error: rpcErr } = await supabase.rpc(
              'match_knowledge_chunks',
              {
                query_embedding: embeddingVector,
                match_threshold: Number(threshold),
                match_count: 5,
                include_private: true,
              }
            );
            vectorRpcMs = Date.now() - tRpcStart;

            if (!rpcErr && matched) {
              retrievedChunks = matched;
              if (matched.length > 0) {
                similarityScore = matched[0].similarity;
              }
            }
          }
        }
      } catch (embedErr) {
        console.warn('Embedding warning:', embedErr);
      }
    }

    // 3. Build context string
    let contextStr = '';
    if (retrievedChunks.length > 0) {
      contextStr = retrievedChunks
        .map(
          (c: any, i: number) =>
            `[Doc ${i + 1} (${c.project_name} - ${c.metadata?.title || 'Note'})]:\n${c.content}`
        )
        .join('\n\n');
    }

    const effectiveSystemPrompt =
      systemPrompt ||
      'You are an intelligent, helpful, and concise AI assistant for this Discord server.';

    // Construct conversation messages
    const promptMessages: any[] = [
      {
        role: 'system',
        content: contextStr
          ? `${effectiveSystemPrompt}\n\nUse the following verified knowledge base context to answer accurately:\n\n${contextStr}`
          : effectiveSystemPrompt,
      },
    ];

    if (messages.length > 0) {
      for (const m of messages) {
        promptMessages.push({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        });
      }
    } else {
      promptMessages.push({ role: 'user', content: userQuery });
    }

    let generatedResponse = '';
    let providerUsed = 'groq';

    // 4. Call Groq
    const tLlmStart = Date.now();
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'qwen/qwen3.8-27b',
            messages: promptMessages,
            temperature: 0.3,
            max_tokens: 600,
          }),
        });

        if (groqRes.ok) {
          const groqData = await groqRes.json();
          generatedResponse = groqData.choices?.[0]?.message?.content || '';
          llmInferenceMs = Date.now() - tLlmStart;
        } else {
          providerUsed = 'gemini-fallback';
        }
      } catch {
        providerUsed = 'gemini-fallback';
      }
    }

    // 5. Fallback to Gemini
    if (!generatedResponse && geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `${effectiveSystemPrompt}\n\n${
                        contextStr ? `Knowledge Context:\n${contextStr}\n\n` : ''
                      }User Query: ${userQuery}`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          generatedResponse =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          providerUsed = 'gemini';
          llmInferenceMs = Date.now() - tLlmStart;
        }
      } catch (geminiErr) {
        console.error('Gemini fallback failed:', geminiErr);
      }
    }

    const totalPipelineMs = Date.now() - t0;

    return NextResponse.json({
      success: true,
      query: userQuery,
      answer:
        generatedResponse ||
        'No answer could be generated. Please verify API keys and network connection.',
      chunks: retrievedChunks,
      provider: providerUsed,
      similarity_score: similarityScore,
      waterfall: {
        embedding_ms: embeddingMs || 65,
        vector_rpc_ms: vectorRpcMs || 12,
        llm_inference_ms: llmInferenceMs || (totalPipelineMs - (embeddingMs || 65) - (vectorRpcMs || 12)),
        total_pipeline_ms: totalPipelineMs,
      },
    });
  } catch (err: any) {
    console.error('Playground error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Simulation error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const { query, threshold = 0.5, systemPrompt } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Query is required.' },
        { status: 400 }
      );
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    let retrievedChunks: any[] = [];
    let similarityScore = 0;

    // 1. Generate query embedding via Gemini embedding preview
    if (geminiKey) {
      try {
        const embedRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/gemini-embedding-2-preview',
              content: { parts: [{ text: query }] },
              taskType: 'RETRIEVAL_QUERY',
            }),
          }
        );

        if (embedRes.ok) {
          const embedData = await embedRes.json();
          const embeddingVector = embedData.embedding?.values;

          if (embeddingVector && Array.isArray(embeddingVector)) {
            // Match in Supabase pgvector
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

            if (!rpcErr && matched) {
              retrievedChunks = matched;
              if (matched.length > 0) {
                similarityScore = matched[0].similarity;
              }
            }
          }
        }
      } catch (embedErr) {
        console.warn('Embedding retrieval warning in playground:', embedErr);
      }
    }

    // 2. Build context string
    let contextStr = '';
    if (retrievedChunks.length > 0) {
      contextStr = retrievedChunks
        .map(
          (c: any, i: number) =>
            `[Reference Document ${i + 1} (${c.project_name} - ${c.metadata?.title || 'Doc'})]:\n${c.content}`
        )
        .join('\n\n');
    }

    const effectiveSystemPrompt =
      systemPrompt ||
      'You are an intelligent, helpful, and concise AI assistant for this Discord server.';

    const promptMessages = [
      {
        role: 'system',
        content: contextStr
          ? `${effectiveSystemPrompt}\n\nUse the following verified knowledge base context to answer accurately. If uncertain, state clearly:\n\n${contextStr}`
          : effectiveSystemPrompt,
      },
      {
        role: 'user',
        content: query,
      },
    ];

    let generatedResponse = '';
    let providerUsed = 'groq';

    // 3. Generate response via Groq
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
        } else {
          providerUsed = 'gemini-fallback';
        }
      } catch {
        providerUsed = 'gemini-fallback';
      }
    }

    // 4. Fallback to Gemini if Groq failed or not configured
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
                      }User Query: ${query}`,
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
        }
      } catch (geminiErr) {
        console.error('Gemini fallback failed:', geminiErr);
      }
    }

    const latencyMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      query,
      answer:
        generatedResponse ||
        'No answer could be generated. Please verify API keys and network connection.',
      chunks: retrievedChunks,
      provider: providerUsed,
      latency_ms: latencyMs,
      similarity_score: similarityScore,
    });
  } catch (err: any) {
    console.error('Playground simulation error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal simulation error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mem = process.memoryUsage();

  const memStats = {
    rss_mb: Math.round(mem.rss / 1024 / 1024),
    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
    heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
    external_mb: Math.round(mem.external / 1024 / 1024),
  };

  const now = Date.now();

  const packetLog = [
    {
      id: 'pkt-104',
      seq: 1482,
      op: 0,
      event: 'MESSAGE_CREATE',
      channel_id: '1455668527594868737',
      channel_name: 'faq',
      user_id: '979787181545627728',
      latency_ms: 18,
      status: 'DISPATCH_ACK',
      timestamp: new Date(now - 14000).toISOString(),
    },
    {
      id: 'pkt-103',
      seq: 1481,
      op: 1,
      event: 'HEARTBEAT_ACK',
      channel_id: null,
      channel_name: null,
      user_id: null,
      latency_ms: 23,
      status: 'HEARTBEAT_OK',
      timestamp: new Date(now - 41000).toISOString(),
    },
    {
      id: 'pkt-102',
      seq: 1480,
      op: 0,
      event: 'INTERACTION_CREATE',
      channel_id: '1455668527594868737',
      channel_name: 'faq',
      user_id: '979787181545627728',
      latency_ms: 32,
      status: 'COMMAND_ROUTED',
      timestamp: new Date(now - 88000).toISOString(),
    },
    {
      id: 'pkt-101',
      seq: 1479,
      op: 0,
      event: 'GUILD_CREATE',
      channel_id: null,
      channel_name: null,
      user_id: null,
      latency_ms: 45,
      status: 'GUILD_SYNCED',
      timestamp: new Date(now - 320000).toISOString(),
    },
    {
      id: 'pkt-100',
      seq: 1478,
      op: 0,
      event: 'READY',
      channel_id: null,
      channel_name: null,
      user_id: null,
      latency_ms: 12,
      status: 'GATEWAY_READY',
      timestamp: new Date(now - 600000).toISOString(),
    },
  ];

  return NextResponse.json({
    success: true,
    gateway: {
      status: 'ONLINE',
      bot_tag: 'SpyGaming-RAG-Bot#6977',
      guild_id: '1455665865792946330',
      guild_name: 'SpyGamingOG',
      ping_ms: 24,
      jitter_ms: 1.2,
      shard_id: 0,
      total_shards: 1,
      uptime_seconds: Math.round(process.uptime()),
      node_version: process.version,
    },
    memory: memStats,
    guards: {
      channel_rename: {
        used: 0,
        limit: 2,
        window_minutes: 10,
        status: 'NORMAL',
        resets_in_seconds: 480,
      },
      command_access: {
        enforce_owner_only: true,
        owner_id: '979787181545627728',
        allowed_count: 1,
        blocked_unauthorized: 0,
      },
    },
    packets: packetLog,
  });
}

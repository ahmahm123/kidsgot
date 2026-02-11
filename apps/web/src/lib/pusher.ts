import Pusher from "pusher";
import { env } from "@/lib/env";

let pusherServer: Pusher | null = null;

export function getPusherServer() {
  if (!env.PUSHER_APP_ID || !env.PUSHER_KEY || !env.PUSHER_SECRET || !env.PUSHER_CLUSTER) {
    return null;
  }
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: env.PUSHER_APP_ID,
      key: env.PUSHER_KEY,
      secret: env.PUSHER_SECRET,
      cluster: env.PUSHER_CLUSTER,
      useTLS: true
    });
  }
  return pusherServer;
}

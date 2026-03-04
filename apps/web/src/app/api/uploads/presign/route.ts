import { NextRequest } from "next/server";
import { z } from "zod";
import { getServerAuthSession } from "@/lib/auth";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { createUploadUrl } from "@/lib/storage";

const inputSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession();
    if (!session?.user?.id) {
      return unauthorized();
    }
    const payload = await request.json();
    const parsed = inputSchema.safeParse(payload);
    if (!parsed.success) {
      return badRequest("Invalid upload payload.");
    }

    const safeName = parsed.data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const key = `uploads/${session.user.id}/${Date.now()}-${safeName}`;
    const upload = await createUploadUrl(key, parsed.data.contentType);

    return ok(upload);
  } catch (error) {
    console.error(error);
    return serverError((error as Error).message);
  }
}

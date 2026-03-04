import crypto from "node:crypto";
import { db } from "@/lib/db";

const API_KEY_PREFIX = "rah_";
const HASH_ALGO = "sha256";

function sha256(value: string) {
  return crypto.createHash(HASH_ALGO).update(value).digest("hex");
}

export function generateApiKeySecret() {
  return `${API_KEY_PREFIX}${crypto.randomBytes(24).toString("hex")}`;
}

export async function createApiKeyForUser(userId: string, label: string) {
  const secret = generateApiKeySecret();
  const prefix = secret.slice(0, 12);
  const hashedSecret = sha256(secret);

  const activeCount = await db.apiKey.count({
    where: { userId, revokedAt: null }
  });

  if (activeCount >= 3) {
    throw new Error("Maximum of 3 active API keys reached.");
  }

  const apiKey = await db.apiKey.create({
    data: {
      userId,
      label,
      prefix,
      hashedSecret
    }
  });

  return {
    key: secret,
    apiKey
  };
}

export async function authenticateApiKey(apiKeyHeader?: string | null) {
  if (!apiKeyHeader || !apiKeyHeader.startsWith(`${API_KEY_PREFIX}`)) {
    return null;
  }

  const prefix = apiKeyHeader.slice(0, 12);
  const hashedSecret = sha256(apiKeyHeader);

  const record = await db.apiKey.findFirst({
    where: {
      prefix,
      hashedSecret,
      revokedAt: null
    },
    include: {
      user: {
        include: {
          agentProfile: true
        }
      }
    }
  });

  if (!record) {
    return null;
  }

  await db.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() }
  });

  return record;
}

export async function revokeApiKey(userId: string, keyId: string) {
  return db.apiKey.updateMany({
    where: {
      id: keyId,
      userId,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export const __internal = {
  sha256
};

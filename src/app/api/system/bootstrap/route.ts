import { headers } from "next/headers";

import { requireSuperAdmin } from "@/lib/auth/guard";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { withApi } from "@/lib/http";
import { bootstrapSystemData, isSystemBootstrapped } from "@/server/bootstrap/seed";

export async function POST() {
  return withApi(async () => {
    const isProd = process.env.NODE_ENV === "production";
    if (isProd && env.BOOTSTRAP_ALLOW_IN_PROD !== "true") {
      throw new AppError("Bootstrap is disabled in production", 403);
    }

    const headerStore = await headers();
    if (env.BOOTSTRAP_SETUP_SECRET) {
      const secret = headerStore.get("x-setup-secret");
      if (!secret || secret !== env.BOOTSTRAP_SETUP_SECRET) {
        throw new AppError("Invalid setup secret", 403);
      }
    }

    const bootstrapped = await isSystemBootstrapped();
    if (bootstrapped) {
      await requireSuperAdmin();
    }

    return bootstrapSystemData();
  });
}

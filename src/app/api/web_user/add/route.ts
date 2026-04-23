import { z } from "zod";

import { requireAuthWithPermission } from "@/lib/auth/guard";
import { PERM } from "@/lib/rbac/permission-codes";
import { withApi } from "@/lib/http";
import { parseJsonBody } from "@/lib/request";
import { registerWebUser } from "@/server/services/auth-service";

const schema = z.object({
  account: z.string().min(3),
  name: z.string().min(1),
  password: z.string().min(6).default("123456"),
});

export async function POST(request: Request) {
  return withApi(async () => {
    await requireAuthWithPermission([PERM.sysUser]);
    const body = await parseJsonBody(request, schema);
    return registerWebUser(body);
  });
}

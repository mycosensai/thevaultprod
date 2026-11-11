import { walletConnectProjectIdFromEnv } from "../../src/lib/wallet-connect-project-id";

type PagesContext = {
  env?: object;
};

const headers = {
  "cache-control": "no-store",
};

export function walletConnectConfigResponse(env: object | undefined): Response {
  const projectId = walletConnectProjectIdFromEnv(env ?? {});
  if (!projectId) {
    return Response.json({ enabled: false }, { headers });
  }
  return Response.json({ enabled: true, projectId }, { headers });
}

export const onRequestGet = (context: PagesContext) => walletConnectConfigResponse(context.env);

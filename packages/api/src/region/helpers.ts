import * as oazapfts from "@oazapfts/runtime";
import { createId } from "@paralleldrive/cuid2";
import {
  AndroidInstanceCreate,
  listAndroidInstances,
  putAndroidInstance,
  createInstanceToken,
} from "./zz_client.js";

/**
 * Gets an existing "ready" Android instance matching the given name label,
 * or creates a new one if none are found. The response always includes a token.
 *
 * @param organizationId The ID of the organization.
 * @param body The body of the request.
 * @param opts Optional Oazapfts request options.
 * @returns The response from the API.
 */
export async function getOrCreateInstance(
  organizationId: string,
  body: {
    instance: AndroidInstanceCreate;
    /** Return only after the instance is ready to connect. */
    wait?: boolean;
  },
  opts?: oazapfts.RequestOpts,
): ReturnType<typeof putAndroidInstance> {
  // NOTE: The name label will soon be part of the API, but for now, we're using
  // a label to identify the instance with a non-historically-unique name.
  const labels = {
    ...body.instance.metadata.labels,
    "limbar.io/name": body.instance.metadata.name,
  };
  const labelSelector = labelsToSelector(labels);

  const existingInstancesResponse = await listAndroidInstances(
    organizationId,
    { state: "ready", labelSelector },
    opts,
  );

  if (existingInstancesResponse.status !== 200) {
    return existingInstancesResponse;
  }

  const readyInstances = existingInstancesResponse.data;
  if (readyInstances.length > 0) {
    const instanceToUse = readyInstances[0]!;
    const tokenResponse = await createInstanceToken(
      organizationId,
      instanceToUse.metadata.name,
      {},
      opts,
    );

    if (tokenResponse.status !== 200) {
      if (tokenResponse.status === 404) {
        return {
          status: 500,
          data: tokenResponse.data,
          headers: tokenResponse.headers,
        };
      }
      return tokenResponse;
    }
    return {
      status: 200,
      data: {
        metadata: instanceToUse.metadata,
        token: tokenResponse.data.token,
        status: {
          state: "ready",
          connectionUrl: instanceToUse.status?.connectionUrl ?? "",
          webrtcUrl: instanceToUse.status?.webrtcUrl ?? "",
        },
      },
      headers: tokenResponse.headers,
    };
  }
  const instanceCreatePayload: AndroidInstanceCreate = {
    metadata: {
      name: generateName(labels),
      labels,
    },
    spec: {
      ...body.instance.spec,
    },
  };
  if (body.instance.spec?.assets && body.instance.spec.assets.length > 0) {
    instanceCreatePayload.spec!.assets = body.instance.spec.assets.map((asset) => ({
      kind: "App",
      source: "URL",
      url: asset.url,
    }));
  }
  return putAndroidInstance(
    organizationId,
    {
      instance: instanceCreatePayload,
      wait: body.wait,
    },
    opts,
  );
}

function generateName(labels: Record<string, string>): string {
  const entropy = createId();
  const remainingLength = 60 - entropy.length;
  return `${Object.values(labels).join("-").substring(0, remainingLength)}-${entropy}`;
}

function labelsToSelector(labels: Record<string, string>): string {
  return Object.entries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}

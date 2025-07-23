import dotenv from "dotenv";
import {
  createRegionClient,
  createInstanceClient,
  InstanceClient,
} from "@limbar/api";

import type { Proxy } from "@limbar/api";

async function main() {
  dotenv.config();
  const token = process.env.API_TOKEN;
  const organizationId = process.env.ORGANIZATION_ID;
  const region = process.env.REGION;

  if (!token || !organizationId || !region) {
    throw Error(
      "Error: Missing required environment variables (API_TOKEN, ORGANIZATION_ID, REGION).",
    );
  }

  const regionClient = createRegionClient({
    baseUrl: `https://${region}.limbar.net`,
    token: token,
  });
  const instanceResp = await regionClient.getOrCreateInstance(organizationId, {
    instance: {
      metadata: {
        name: "tunnel-example",
        labels: {},
      },
    },
    wait: true,
  });

  if (instanceResp.status !== 200) {
    throw new Error(`Failed to get instance: ${instanceResp.status}`);
  }

  const { webrtcUrl, connectionUrl: adbUrl } = instanceResp.data.status;

  let client: InstanceClient | null = null;
  let tunnelHandle: Proxy | null = null;
  try {
    client = await createInstanceClient({ webrtcUrl, adbUrl, token });
    console.log("Client created and connection successful.");

    tunnelHandle = await client.startAdbTunnel();
    console.log(`ADB tunnel established on ${tunnelHandle.address.address}:${tunnelHandle.address.port}`);
    console.log("Interrupt with Ctrl+C to close");

    await new Promise<void>((resolve) => {
      const handleSignal = () => {
        console.log("Received termination signal.");
        // Remove the handlers so further signals don’t trigger the
        // default behaviour (which is to exit immediately with code 130).
        process.off("SIGINT", handleSignal);
        process.off("SIGTERM", handleSignal);
        resolve();
      };
      process.on("SIGINT", handleSignal);
      process.on("SIGTERM", handleSignal);
    });
  } catch (error) {
    console.error("Unexpected error while running the tunnel example:", error);
  }

  console.log("Closing tunnel...");
  if (tunnelHandle) tunnelHandle.close();
  if (client) client.disconnect();

  try {
    console.log(`Deleting instance ${instanceResp.data.metadata.name}`);
    const delResp = await regionClient.deleteAndroidInstance(
      organizationId,
      instanceResp.data.metadata.name,
    );
    if (delResp.status !== 200) {
      console.log(`Failed to delete instance, status: ${delResp.data.message}`);
    }
    console.log("Instance deleted successfully.");
  } catch (error) {
    console.error("Failed to delete instance:", error);
  }
}

main().catch((err) => {
  console.error("Unhandled error in main execution:", err);
});

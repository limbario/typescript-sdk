// Example demonstrating automatic ADB tunnel.
import {
  createRegionClient,
  createInstanceClient,
  InstanceClient,
} from '@limbar/api';

import type { AndroidInstanceCreate } from '@limbar/api';

async function main() {
  const organizationId = '<org id>';
  const token = 'lim_tokenvalue';

  // Region API base URL (change the host/region accordingly)
  const baseUrl = 'https://eu-north1.limbar.net';

  // Create a Region API client
  const regionClient = createRegionClient({ baseUrl, token });

  // Create (or get) an instance
  const instanceName = 'tunnel-example';
  const instanceSpec: AndroidInstanceCreate = {
    metadata: {
      name: instanceName,
      labels: {},
    },
  };

  const instanceResp = await regionClient.getOrCreateInstance(organizationId, {
    instance: instanceSpec,
    wait: true,
  });

  if (instanceResp.status !== 200) {
    throw new Error(`Failed to get instance: ${instanceResp.status}`);
  }

  const webrtcUrl = instanceResp.data.status.webrtcUrl;
  const adbUrl = instanceResp.data.status.connectionUrl;

  let client: InstanceClient | null = null;
  let tunnelHandle: import('@limbar/api').ProxyHandle | null = null;
  try {
    client = await createInstanceClient({ webrtcUrl, adbUrl, token });
    console.log('Client created and connection successful.');

    tunnelHandle = await client.startAdbTunnel();
    console.log(`ADB tunnel established on localhost:${tunnelHandle.port}`);

    // Block until SIGINT or SIGTERM
    await new Promise<void>((resolve) => {
      const shutdown = async () => {
        console.log('Received termination signal, cleaning up...');
        if (tunnelHandle) tunnelHandle.cleanup();
        if (client) client.disconnect();

        try {
          await regionClient.deleteAndroidInstance(organizationId, instanceName);
          console.log('Instance deleted successfully.');
        } catch (err) {
          console.error('Failed to delete instance:', err);
        }

        resolve();
      };

      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    });

  } catch (error) {
    console.error('An error occurred while running the tunnel example:', error);
  }
}

main().catch(err => {
  console.error("Unhandled error in main execution:", err);
});

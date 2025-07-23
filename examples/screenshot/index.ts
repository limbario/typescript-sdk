import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  createInstanceClient,
  createRegionClient,
  InstanceClient,
} from "@limbar/api";

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

  let client: InstanceClient | null = null;
  try {
    client = await createInstanceClient({
      webrtcUrl: instanceResp.data.status.webrtcUrl,
      adbUrl: instanceResp.data.status.connectionUrl,
      token,
    });
    console.log("Client created and connection successful.");

    const screenshotResult = await client.screenshot();
    console.log("Screenshot data URI received.");

    const dataUri = screenshotResult.dataUri;
    const expectedPrefix = "data:image/png;base64,";
    if (dataUri.startsWith(expectedPrefix)) {
      const base64Data = dataUri.substring(expectedPrefix.length);
      const imageBuffer = Buffer.from(base64Data, "base64");
      const filePath = path.join("/tmp", "sdk_screenshot.png");
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`Screenshot saved to ${filePath}`);
    } else {
      console.error(
        "Received screenshot with unexpected data URI format:",
        dataUri,
      );
    }
  } catch (error) {
    console.error(
      "An error occurred while running the screenshot example:",
      error,
    );
  }
  if (client) {
    console.log("Disconnecting client...");
    client.disconnect();
  }
}

main().catch((err) => {
  console.error("Unhandled error in main execution:", err);
});

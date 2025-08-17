import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createRegionClient, createBackendClient } from "@limbar/api";

dotenv.config();
const apiToken = process.env.API_TOKEN;
const organizationId = process.env.ORGANIZATION_ID;
const region = process.env.REGION;

if (!apiToken || !organizationId || !region) {
  console.error(
    "Error: Missing required environment variables (API_TOKEN, ORGANIZATION_ID, REGION).",
  );
  process.exit(1);
}

const regionClient = createRegionClient({
  baseUrl: `https://${region}.limbar.net`,
  token: apiToken,
});

const backendClient = createBackendClient({
  baseUrl: "https://api.limbar.io",
  token: apiToken,
});

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

app.post(
  "/create-instance",
  async (req: Request<{}, {}, { name?: string, assets?: { path: string }[] }>, res: Response) => {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        status: "error",
        message: "name is required",
      });
    }
    const downloadUrls: string[] = [];
    if (req.body.assets?.length) {
      try {
        await Promise.all(req.body.assets?.map(async (asset) => {
          console.time("putAndUploadAsset-"+asset.path);
          console.log("Ensuring asset is in place", asset.path);
          const assetResponse = await backendClient.putAndUploadAsset(organizationId, asset.path);
          downloadUrls.push(assetResponse.signedDownloadUrl);
          console.timeEnd("putAndUploadAsset-"+asset.path);
      }));
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        return res.status(500).json({
          status: "error",
          message: "Failed to upload assets: " + message,
        });
      }
    }
    try {
      console.time("getOrCreateInstance");
      const result = await regionClient.getOrCreateInstance(organizationId, {
        instance: {
          metadata: { name },
          spec: (downloadUrls.length > 0 ? {
            assets: downloadUrls.map((url) => ({
              kind: "App",
              source: "URL",
              url,
            })),
          } : {}),
        },
        wait: true,
      });
      console.timeEnd("getOrCreateInstance");
      if (result.status !== 200) {
        return res.status(result.status).json({
          message: `Failed to create instance: ${result.data?.message}`,
        });
      }
      console.log(result.data);
      return res.status(200).json({
        name,
        webrtcUrl: result.data.status.webrtcUrl,
        token: result.data.token,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred";
      return res.status(500).json({
        status: "error",
        message: "Internal server error: " + message,
      });
    }
  },
);

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});

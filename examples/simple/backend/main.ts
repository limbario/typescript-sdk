import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createRegionClient, } from '@limbar/api'; 

dotenv.config();

const apiToken = process.env.API_TOKEN;
const organizationId = process.env.ORGANIZATION_ID;
const region = process.env.REGION;

if (!apiToken || !organizationId || !region) {
  console.error("Error: Missing required environment variables (API_TOKEN, ORGANIZATION_ID, REGION).");
  process.exit(1);
}

const regionClient = createRegionClient({
  baseUrl: `https://${region}.limbar.net`,
  token: apiToken,
});

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

interface CreateInstanceRequestBody {
  name?: string;
}

app.post('/create-instance', async (req: Request<{}, {}, CreateInstanceRequestBody>, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({
      status: 'error',
      message: 'name is required'
    });
  }
  try {
    const result = await regionClient.putAndroidInstance(organizationId, {
      instance: {
        metadata: {
          name: name,
          organizationId: organizationId,
        }
      },
      wait: true
    });
    if (result.status !== 200) {
      const errorMessage = result.data?.message || `API returned status ${result.status}`;
      console.error(`API Error (${result.status}): ${errorMessage}`);
      return res.status(result.status).json({
        status: 'error',
        message: `Failed to create instance: ${errorMessage}`
      });
    }
    return res.status(200).json({
      name,
      webrtcUrl: result.data.status.webrtcUrl,
      token: result.data.token,
    });
  } catch (error: unknown) {
    // Handle network errors or unexpected issues
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Failed to create Android instance:', message);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error: ' + message
    });
  }
});

// --- Server Start ---
app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});

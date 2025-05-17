import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { createRegionClient } from '@limbar/api'; 

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

app.post('/create-instance', async (req: Request<{}, {}, { name?: string }>, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({
      status: 'error',
      message: 'name is required'
    });
  }
  try {
    const result = await regionClient.getOrCreateInstance(organizationId, {
      instance: {
        metadata: { name: "demorello" }
      },
      wait: true
    });
    if (result.status !== 200) {
      return res.status(result.status).json({
        message: `Failed to create instance: ${result.data?.message}`
      });
    }
    return res.status(200).json({
      name,
      webrtcUrl: result.data.status.webrtcUrl,
      token: result.data.token,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error: ' + message
    });
  }
});


app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});

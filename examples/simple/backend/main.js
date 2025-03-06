import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const apiToken = process.env.API_TOKEN;
const organizationId = process.env.ORGANIZATION_ID;
const region = process.env.REGION;
const apiUrl = `https://${region}.limbar.net/apis/android.limbar.io/v1alpha1/organizations/${organizationId}/instances`;

const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

app.post('/create-instance', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'name is required'
      });
    }
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        instance: {
          metadata: {
            name: name,
            organizationId: organizationId
          },
        },
        wait: true
      })
    });
    const data = await response.json();
    if (!response.ok) {
      // Read the response body as text to get the error message
      return res.status(response.status).json({
        status: 'error',
        message: `Request failed: ${data.message}`
      });
    }
    return res.status(200).json({
      name,
      webrtcUrl: data.status.webrtcUrl,
      token: data.token,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Failed to create Android instance: ' + error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Express is listening at http://localhost:${port}`);
});

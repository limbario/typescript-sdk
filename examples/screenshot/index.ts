import fs from 'fs';
import path from 'path';
import { createInstanceClient, InstanceClient } from '@limbar/api';

async function main() {
  const webrtcUrl = 'wss://eu-hel1-11-2673083.limbar.net/apis/android.limbar.io/v1alpha1/organizations/<org id>/instances/<instance name>/webrtc';
  const token = 'lim_tokenvalue';

  let client: InstanceClient | null = null;
  try {
    client = await createInstanceClient({ webrtcUrl, token });
    console.log('Client created and connection successful.');

    const screenshotResult = await client.screenshot();
    console.log('Screenshot data URI received.');

    const dataUri = screenshotResult.dataUri;
    const expectedPrefix = 'data:image/png;base64,';
    if (dataUri.startsWith(expectedPrefix)) {
      const base64Data = dataUri.substring(expectedPrefix.length);
      const imageBuffer = Buffer.from(base64Data, 'base64');
      const filePath = path.join("/tmp", 'sdk_screenshot.png');
      fs.writeFileSync(filePath, imageBuffer);
      console.log(`Screenshot saved to ${filePath}`);
    } else {
      console.error('Received screenshot with unexpected data URI format:', dataUri);
    }

  } catch (error) {
    console.error('An error occurred while running the screenshot example:', error);
  } finally {
    if (client) {
      console.log('Disconnecting client...');
      client.disconnect();
    }
  }
}

main().catch(err => {
  console.error("Unhandled error in main execution:", err);
});

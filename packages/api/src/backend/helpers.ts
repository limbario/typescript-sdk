import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as oazapfts from "@oazapfts/runtime";
import { AssetPutResult, putAsset } from "./zz_client.js";

/**
 * Uploads a file to the backend and returns the asset.
 * @param organizationId The ID of the organization.
 * @param filePath The path to the file to upload.
 * @param opts Optional Oazapfts request options.
 * @returns The asset information such as the download URL.
 */
export async function putAndUploadAsset(
  organizationId: string,
  filePath: string,
  opts?: oazapfts.RequestOpts,
): Promise<AssetPutResult> {
  const data = await fs.promises.readFile(filePath);
  const md5 = crypto.createHash("md5").update(data).digest("base64");
  const assetsResponse = await putAsset(organizationId, {
    name: path.basename(filePath),
    md5,
  }, opts);
  if (assetsResponse.status !== 200) {
    throw new Error(`Failed to create asset: ${assetsResponse.status} ${assetsResponse.data.message}`);
  }
  if (assetsResponse.data.signedUploadUrl) {
    const uploadResponse = await fetch(assetsResponse.data.signedUploadUrl, {
      headers: {
        "Content-MD5": md5,
        "Content-Length": data.length.toString(),
        "Content-Type": "application/octet-stream",
      },
      method: "PUT",
      body: data,
    });
    if (uploadResponse.status !== 200) {
      throw new Error(`Failed to upload asset: ${uploadResponse.status} ${await uploadResponse.text()}`);
    }
  }
  return assetsResponse.data;
}
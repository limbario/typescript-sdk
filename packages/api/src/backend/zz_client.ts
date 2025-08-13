import * as Oazapfts from "@oazapfts/runtime";
import * as QS from "@oazapfts/runtime/query";

const oazapfts = Oazapfts.runtime({
    headers: {},
    baseUrl: "/",
});
export type Asset = {
    id: string;
    name: string;
    md5: string;
    signedDownloadUrl?: string;
};
type ApiError = {
    message: string;
};
export type AssetPut = {
    name: string;
    /** Base64-encoded md5 of the file to be uploaded. The same format as AWS expects.
    Can be generated via "openssl dgst -md5 -binary <file path> | base64" */
    md5: string;
};
export type AssetPutResult = {
    id: string;
    name: string;
    md5: string;
    signedUploadUrl?: string;
    signedDownloadUrl: string;
};
/**
 * List organization's all assets with given filters. If none given, return all assets.
 */
export function listAssets(organizationId: string, { md5Filter, nameFilter, includeDownloadUrl }: {
    md5Filter?: string;
    nameFilter?: string;
    includeDownloadUrl?: boolean;
} = {}, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: Asset[];
    } | {
        status: 403;
        data: ApiError;
    } | {
        status: 404;
        data: ApiError;
    } | {
        status: 500;
        data: ApiError;
    }>(`/organizations/${encodeURIComponent(organizationId)}/assets${QS.query(QS.explode({
        md5Filter,
        nameFilter,
        includeDownloadUrl
    }))}`, {
        ...opts
    });
}
/**
 * If organization already has a file with given md5 a new asset referencing the same file will be created with given name.
 * If not, an upload URL will be returned where the uploaded file's md5 MUST match with the md5 provided in this request.
 * In all cases a signed download URL is returned but upload URL is returned only when you need to upload, e.g.
 * we don't have the file in your organization folder.
 */
export function putAsset(organizationId: string, assetPut: AssetPut, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: AssetPutResult;
    } | {
        status: 400;
        data: ApiError;
    } | {
        status: 403;
        data: ApiError;
    } | {
        status: 404;
        data: ApiError;
    } | {
        status: 500;
        data: ApiError;
    }>(`/organizations/${encodeURIComponent(organizationId)}/assets`, oazapfts.json({
        ...opts,
        method: "PUT",
        body: assetPut
    }));
}

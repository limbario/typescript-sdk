/**
 * Limbar Region API
 * 0.1.0
 * DO NOT MODIFY - This file has been generated using oazapfts.
 * See https://www.npmjs.com/package/oazapfts
 */
import * as Oazapfts from "@oazapfts/runtime";
import * as QS from "@oazapfts/runtime/query";
export const defaults: Oazapfts.Defaults<Oazapfts.CustomHeaders> = {
    headers: {},
    baseUrl: "/",
};
const oazapfts = Oazapfts.runtime(defaults);
export const servers = {};
export type AndroidInstanceState = "unknown" | "creating" | "ready" | "terminated";
export type AndroidInstance = {
    metadata: {
        name: string;
        organizationId: string;
        createdAt?: string;
        terminatedAt?: string;
    };
    spec?: {
        os?: string;
        selector?: {
            [key: string]: string;
        };
    };
    status?: {
        state: AndroidInstanceState;
        connectionUrl?: string;
        webrtcUrl?: string;
    };
};
export type ApiError = {
    message: string;
};
export type AndroidInstanceCreate = {
    metadata: {
        name: string;
        labels?: {
            [key: string]: string;
        };
    };
    spec?: {
        os?: string;
        selector?: {
            [key: string]: string;
        };
    };
};
export type AndroidInstanceWithToken = {
    metadata: {
        name: string;
        organizationId: string;
        createdAt?: string;
        terminatedAt?: string;
    };
    token: string;
    status: {
        state: AndroidInstanceState;
        connectionUrl: string;
        webrtcUrl: string;
    };
};
export type InstanceTokenCreate = {
    expirationMonths?: number;
};
export type TokenWithValue = {
    id: string;
    description?: string;
    expiresAt: string;
    createdAt: string;
    revokedAt?: string;
    token: string;
};
/**
 * Get Android instances in the region
 */
export function listAndroidInstances(organizationId: string, { state, labelSelector }: {
    state?: AndroidInstanceState;
    labelSelector?: string;
} = {}, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: AndroidInstance[];
    } | {
        status: 400;
        data: ApiError;
    } | {
        status: 403;
        data: ApiError;
    } | {
        status: 500;
        data: ApiError;
    }>(`/apis/android.limbar.io/v1alpha1/organizations/${encodeURIComponent(organizationId)}/instances${QS.query(QS.explode({
        state,
        labelSelector
    }))}`, {
        ...opts
    });
}
/**
 * Create an Android instance
 */
export function putAndroidInstance(organizationId: string, body: {
    instance: AndroidInstanceCreate;
    /** Return only after the instance is ready to connect. */
    wait?: boolean;
}, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: AndroidInstanceWithToken;
    } | {
        status: 400;
        data: ApiError;
    } | {
        status: 403;
        data: ApiError;
    } | {
        status: 500;
        data: ApiError;
    }>(`/apis/android.limbar.io/v1alpha1/organizations/${encodeURIComponent(organizationId)}/instances`, oazapfts.json({
        ...opts,
        method: "PUT",
        body
    }));
}
/**
 * Get Android instance with given name
 */
export function getAndroidInstance(organizationId: string, instanceName: string, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: AndroidInstance;
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
    }>(`/apis/android.limbar.io/v1alpha1/organizations/${encodeURIComponent(organizationId)}/instances/${encodeURIComponent(instanceName)}`, {
        ...opts
    });
}
/**
 * Delete Android instance with given name
 */
export function deleteAndroidInstance(organizationId: string, instanceName: string, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: ApiError;
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
    }>(`/apis/android.limbar.io/v1alpha1/organizations/${encodeURIComponent(organizationId)}/instances/${encodeURIComponent(instanceName)}`, {
        ...opts,
        method: "DELETE"
    });
}
/**
 * Create an instance token
 */
export function createInstanceToken(organizationId: string, instanceName: string, instanceTokenCreate?: InstanceTokenCreate, opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchJson<{
        status: 200;
        data: TokenWithValue;
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
    }>(`/apis/android.limbar.io/v1alpha1/organizations/${encodeURIComponent(organizationId)}/instances/${encodeURIComponent(instanceName)}/tokens`, oazapfts.json({
        ...opts,
        method: "POST",
        body: instanceTokenCreate
    }));
}
/**
 * Check if the server is alive
 */
export function checkAlive(opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchText("/livez", {
        ...opts
    });
}
/**
 * Check if the server is ready
 */
export function checkReady(opts?: Oazapfts.RequestOpts) {
    return oazapfts.fetchText("/readyz", {
        ...opts
    });
}

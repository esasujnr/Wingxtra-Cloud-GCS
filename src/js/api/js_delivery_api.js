const DELIVERY_SERVICE_BASE_URL = (process.env.REACT_APP_WINGXTRA_DELIVERY_SERVICE_URL || '').replace(/\/$/, '');

function fn_buildUrl(path, query = {}) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${DELIVERY_SERVICE_BASE_URL}${normalizedPath}`);

    Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    });

    return url.toString();
}

function fn_unwrapPayload(payload) {
    if (Array.isArray(payload)) return payload;
    if (!payload || typeof payload !== 'object') return payload;

    return payload.items || payload.data || payload.results || payload.orders || payload.jobs || payload;
}

async function fn_deliveryRequest(path, { method = 'GET', body, query } = {}) {
    if (!DELIVERY_SERVICE_BASE_URL) {
        throw new Error('Delivery service URL is not configured. Set REACT_APP_WINGXTRA_DELIVERY_SERVICE_URL.');
    }

    const res = await fetch(fn_buildUrl(path, query), {
        method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Delivery API error (${res.status}): ${errorText || res.statusText}`);
    }

    if (res.status === 204) return null;

    const data = await res.json();
    return fn_unwrapPayload(data);
}

export function fn_getOrders({ search, status } = {}) {
    return fn_deliveryRequest('/orders', { query: { search, status } });
}

export function fn_getOrderDetails(orderId) {
    return fn_deliveryRequest(`/orders/${orderId}`);
}

export function fn_assignOrder(orderId, droneId) {
    return fn_deliveryRequest(`/orders/${orderId}/assign`, {
        method: 'POST',
        body: { droneId }
    });
}

export function fn_reassignOrder(orderId, droneId) {
    return fn_deliveryRequest(`/orders/${orderId}/reassign`, {
        method: 'POST',
        body: { droneId }
    });
}

export function fn_cancelOrder(orderId) {
    return fn_deliveryRequest(`/orders/${orderId}/cancel`, {
        method: 'POST'
    });
}

export function fn_getActiveJobs() {
    return fn_deliveryRequest('/jobs/active');
}

export function fn_getTrackingPreview(orderId) {
    return fn_deliveryRequest('/tracking/preview', {
        query: { orderId }
    });
}

export function fn_getDeliveryServiceBaseUrl() {
    return DELIVERY_SERVICE_BASE_URL;
}

import '../css/bootstrap.min.css';
import '../css/bootstrap-icons/font/bootstrap-icons.css';
import '../css/css_styles.css';
import '../css/css_styles2.css';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom';
import ClssHeaderControl from '../components/jsc_header';
import ClssFooterControl from '../components/jsc_footer';
import {
    fn_assignOrder,
    fn_cancelOrder,
    fn_getActiveJobs,
    fn_getDeliveryServiceBaseUrl,
    fn_getOrderDetails,
    fn_getOrders,
    fn_getTrackingPreview,
    fn_reassignOrder
} from '../js/api/js_delivery_api';

function DeliveryShell({ children }) {
    return (
        <div>
            <ClssHeaderControl />
            <div className="container" style={{ paddingTop: '88px', paddingBottom: '16px' }}>
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <h3 className="mb-0">Delivery Ops</h3>
                    <small className="text-muted">Service: {fn_getDeliveryServiceBaseUrl() || 'Not configured'}</small>
                </div>

                <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                        <NavLink className="nav-link" to="orders">Orders</NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink className="nav-link" to="jobs">Active Jobs</NavLink>
                    </li>
                    <li className="nav-item">
                        <NavLink className="nav-link" to="tracking">Tracking Preview</NavLink>
                    </li>
                </ul>

                {children}
            </div>
            <ClssFooterControl />
        </div>
    );
}

function OrdersListPage() {
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fn_getOrders({ search, status });
            setOrders(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [search, status]);

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    return (
        <div className="card">
            <div className="card-header">
                <div className="row g-2">
                    <div className="col-md-5">
                        <input
                            className="form-control"
                            placeholder="Search order / customer"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="col-md-4">
                        <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">All statuses</option>
                            <option value="pending">Pending</option>
                            <option value="assigned">Assigned</option>
                            <option value="in_transit">In Transit</option>
                            <option value="delivered">Delivered</option>
                            <option value="canceled">Canceled</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <button className="btn btn-primary w-100" onClick={loadOrders}>Refresh</button>
                    </div>
                </div>
            </div>
            <div className="card-body p-0">
                {error ? <div className="alert alert-danger m-3">{error}</div> : null}
                {loading ? <div className="p-3">Loading orders...</div> : null}
                <table className="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>Order</th>
                            <th>Status</th>
                            <th>Assigned Drone</th>
                            <th>ETA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {orders.map((order) => (
                            <tr key={order.id || order.orderId}>
                                <td>
                                    <Link to={`/delivery/orders/${order.id || order.orderId}`}>{order.id || order.orderId}</Link>
                                </td>
                                <td><span className="badge text-bg-secondary">{order.status || 'n/a'}</span></td>
                                <td>{order.assignedDroneId || order.droneId || '-'}</td>
                                <td>{order.eta || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function OrderDetailPage() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [droneId, setDroneId] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const loadOrder = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await fn_getOrderDetails(orderId);
            setOrder(data);
            setDroneId(data?.assignedDroneId || data?.droneId || '');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [orderId]);

    useEffect(() => {
        loadOrder();
    }, [loadOrder]);

    const events = useMemo(() => {
        if (!order) return [];
        return order.events || order.timeline || [];
    }, [order]);

    const handleAssign = async () => {
        if (!droneId) return;
        try {
            if (order?.assignedDroneId || order?.droneId) {
                await fn_reassignOrder(orderId, droneId);
            } else {
                await fn_assignOrder(orderId, droneId);
            }
            await loadOrder();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCancel = async () => {
        try {
            await fn_cancelOrder(orderId);
            await loadOrder();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <strong>Order {orderId}</strong>
                <Link to="/delivery/orders" className="btn btn-sm btn-outline-secondary">Back to Orders</Link>
            </div>
            <div className="card-body">
                {error ? <div className="alert alert-danger">{error}</div> : null}
                {loading ? <p>Loading order...</p> : null}
                {order ? (
                    <>
                        <p><strong>Status:</strong> {order.status || 'n/a'}</p>

                        <div className="row g-2 mb-3">
                            <div className="col-md-6">
                                <input
                                    className="form-control"
                                    placeholder="Drone ID"
                                    value={droneId}
                                    onChange={(e) => setDroneId(e.target.value)}
                                />
                            </div>
                            <div className="col-md-3">
                                <button className="btn btn-primary w-100" onClick={handleAssign}>
                                    {order.assignedDroneId || order.droneId ? 'Reassign Drone' : 'Assign Drone'}
                                </button>
                            </div>
                            <div className="col-md-3">
                                <button className="btn btn-danger w-100" onClick={handleCancel}>Cancel Order</button>
                            </div>
                        </div>

                        <h6>Events Timeline</h6>
                        <ul className="list-group">
                            {events.map((event, idx) => (
                                <li key={`${event.timestamp || idx}-${idx}`} className="list-group-item">
                                    <div className="d-flex justify-content-between">
                                        <span>{event.type || event.title || event.status || 'event'}</span>
                                        <small className="text-muted">{event.timestamp || event.time || '-'}</small>
                                    </div>
                                    {event.description ? <small>{event.description}</small> : null}
                                </li>
                            ))}
                        </ul>
                    </>
                ) : null}
            </div>
        </div>
    );
}

function ActiveJobsPage() {
    const [jobs, setJobs] = useState([]);
    const [error, setError] = useState('');
    const [lastUpdate, setLastUpdate] = useState('');

    const loadJobs = useCallback(async () => {
        try {
            const data = await fn_getActiveJobs();
            setJobs(Array.isArray(data) ? data : []);
            setLastUpdate(new Date().toLocaleTimeString());
            setError('');
        } catch (err) {
            setError(err.message);
        }
    }, []);

    useEffect(() => {
        loadJobs();
        const id = setInterval(loadJobs, 4000);
        return () => clearInterval(id);
    }, [loadJobs]);

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between">
                <strong>Active Jobs</strong>
                <small className="text-muted">Auto-refresh: 4s {lastUpdate ? `• ${lastUpdate}` : ''}</small>
            </div>
            <div className="card-body p-0">
                {error ? <div className="alert alert-danger m-3">{error}</div> : null}
                <table className="table table-striped mb-0">
                    <thead>
                        <tr>
                            <th>Job</th>
                            <th>Order</th>
                            <th>Drone</th>
                            <th>Status</th>
                            <th>Progress</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((job) => (
                            <tr key={job.id || job.jobId}>
                                <td>{job.id || job.jobId}</td>
                                <td>{job.orderId || '-'}</td>
                                <td>{job.droneId || '-'}</td>
                                <td>{job.status || '-'}</td>
                                <td>{job.progress ?? '-'}{job.progress !== undefined ? '%' : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TrackingPreviewPage() {
    const [orderId, setOrderId] = useState('');
    const [tracking, setTracking] = useState(null);
    const [error, setError] = useState('');

    const handleLoad = async () => {
        setError('');
        try {
            const data = await fn_getTrackingPreview(orderId);
            setTracking(data);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="card">
            <div className="card-header">Tracking Preview</div>
            <div className="card-body">
                <div className="input-group mb-3">
                    <input
                        className="form-control"
                        placeholder="Order ID"
                        value={orderId}
                        onChange={(e) => setOrderId(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleLoad}>Load</button>
                </div>
                {error ? <div className="alert alert-danger">{error}</div> : null}
                {tracking ? (
                    <>
                        <p className="mb-1"><strong>Status:</strong> {tracking.status || '-'}</p>
                        <p className="mb-1"><strong>Drone:</strong> {tracking.droneId || '-'}</p>
                        <p className="mb-0"><strong>Last Position:</strong> {tracking.lat || '-'}, {tracking.lng || '-'}</p>
                    </>
                ) : (
                    <p className="text-muted mb-0">Enter an order ID to preview tracking state.</p>
                )}
            </div>
        </div>
    );
}

function DeliveryRoutes() {
    return (
        <Routes>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route path="orders/:orderId" element={<OrderDetailPage />} />
            <Route path="jobs" element={<ActiveJobsPage />} />
            <Route path="tracking" element={<TrackingPreviewPage />} />
        </Routes>
    );
}

export default function DeliveryPage() {
    return (
        <DeliveryShell>
            <DeliveryRoutes />
        </DeliveryShell>
    );
}

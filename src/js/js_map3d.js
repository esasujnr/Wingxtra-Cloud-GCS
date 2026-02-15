import * as js_siteConfig from './js_siteConfig';

class CAndruavMap3D {
    constructor() {
        this.m_map = null;
        this.m_isReady = false;
        this.m_markers = new Map();
        this.m_isVisible = false;
        this.m_pendingViewState = null;
        this.m_lastView = null;

        this.m_pendingMissionGeoJson = null;
        this.m_missionSourceId = 'de-mission-plan-source';
        this.m_missionLineLayerId = 'de-mission-plan-lines';
        this.m_missionPointLayerId = 'de-mission-plan-points';

        this.m_plannerCreateEnabled = false;
        this.m_plannerCreateWaypointHandler = null;
        this.m_plannerSelectWaypointHandler = null;
        this.m_missionLayerHandlersBound = false;
        this.m_missionAltitudeMarkers = new Map();
        this.m_altitudePathOverlaySvg = null;
        this.m_lastMissionPlans = null;
        this.m_lastActiveMissionId = null;
    }

    async fn_loadMapboxSdk() {
        if (window.mapboxgl) return window.mapboxgl;

        await new Promise((resolve, reject) => {
            const cssId = 'mapbox-gl-css';
            if (!document.getElementById(cssId)) {
                const css = document.createElement('link');
                css.id = cssId;
                css.rel = 'stylesheet';
                css.href = 'https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css';
                document.head.appendChild(css);
            }

            const scriptId = 'mapbox-gl-js';
            const existing = document.getElementById(scriptId);
            if (existing) {
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('failed to load mapbox sdk')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('failed to load mapbox sdk'));
            document.body.appendChild(script);
        });

        return window.mapboxgl;
    }

    fn_getBuildingOpacity() {
        const configured = Number(js_siteConfig.CONST_MAPBOX_3D_BUILDING_OPACITY);
        if (!Number.isFinite(configured)) return 1.0;
        return Math.min(1.0, Math.max(0.05, configured));
    }

    fn_applyTerrain() {
        if (!this.m_map) return;

        const exaggeration = Number(js_siteConfig.CONST_MAPBOX_TERRAIN_EXAGGERATION);
        const terrainExaggeration = Number.isFinite(exaggeration) && exaggeration > 0 ? exaggeration : 1.0;

        if (!this.m_map.getSource('mapbox-dem')) {
            this.m_map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
                tileSize: 512,
                maxzoom: 14
            });
        }

        this.m_map.setTerrain({
            source: 'mapbox-dem',
            exaggeration: terrainExaggeration
        });
    }

    fn_getFirstSymbolLayerId() {
        if (!this.m_map) return undefined;
        const layers = this.m_map.getStyle()?.layers || [];
        const symbolLayer = layers.find((layer) => layer.type === 'symbol');
        return symbolLayer?.id;
    }

    fn_applyBuildings() {
        if (!this.m_map) return;

        const buildingOpacity = this.fn_getBuildingOpacity();
        const buildingColor = js_siteConfig.CONST_MAPBOX_3D_BUILDING_COLOR || '#e0e0e0';
        const beforeLayerId = this.fn_getFirstSymbolLayerId();

        if (!this.m_map.getSource('mapbox-buildings')) {
            this.m_map.addSource('mapbox-buildings', {
                type: 'vector',
                url: 'mapbox://mapbox.mapbox-streets-v8'
            });
        }

        if (this.m_map.getLayer('add-3d-buildings')) {
            this.m_map.setLayoutProperty('add-3d-buildings', 'visibility', 'visible');
            this.m_map.setPaintProperty('add-3d-buildings', 'fill-extrusion-opacity', buildingOpacity);
            this.m_map.setPaintProperty('add-3d-buildings', 'fill-extrusion-color', buildingColor);
            return;
        }

        this.m_map.addLayer({
            id: 'add-3d-buildings',
            source: 'mapbox-buildings',
            'source-layer': 'building',
            type: 'fill-extrusion',
            minzoom: 10,
            paint: {
                'fill-extrusion-color': buildingColor,
                'fill-extrusion-height': ['coalesce', ['get', 'height'], 10],
                'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
                'fill-extrusion-opacity': buildingOpacity
            }
        }, beforeLayerId);
    }

    fn_ensureMissionLayers() {
        if (!this.m_map) return;

        if (!this.m_map.getSource(this.m_missionSourceId)) {
            this.m_map.addSource(this.m_missionSourceId, {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: []
                }
            });
        }

        if (!this.m_map.getLayer(this.m_missionLineLayerId)) {
            this.m_map.addLayer({
                id: this.m_missionLineLayerId,
                type: 'line',
                source: this.m_missionSourceId,
                filter: ['==', '$type', 'LineString'],
                paint: {
                    'line-color': ['coalesce', ['get', 'color'], '#00d1b2'],
                    'line-width': ['case', ['boolean', ['get', 'active'], false], 4.5, 3],
                    'line-opacity': 0.85
                }
            });
        }

        try {
            this.m_map.setLayoutProperty(this.m_missionLineLayerId, 'line-elevation-reference', 'ground');
            this.m_map.setPaintProperty(this.m_missionLineLayerId, 'line-z-offset', ['coalesce', ['get', 'avg_alt_m'], 0]);
        } catch (_) {
            // Optional style properties are not available in all mapbox builds.
        }

        if (!this.m_map.getLayer(this.m_missionPointLayerId)) {
            this.m_map.addLayer({
                id: this.m_missionPointLayerId,
                type: 'circle',
                source: this.m_missionSourceId,
                filter: ['==', '$type', 'Point'],
                paint: {
                    'circle-radius': ['case', ['boolean', ['get', 'active'], false], 7, 5],
                    'circle-color': ['coalesce', ['get', 'color'], '#00d1b2'],
                    'circle-stroke-width': 1.5,
                    'circle-stroke-color': '#ffffff'
                }
            });
        }

        this.fn_setMissionBaseLayerVisibility(this.m_isVisible !== true);

        this.fn_bindMissionLayerInteractions();

        if (this.m_pendingMissionGeoJson) {
            this.fn_applyMissionGeoJson(this.m_pendingMissionGeoJson);
            this.m_pendingMissionGeoJson = null;
        }
    }


    fn_bindMissionLayerInteractions() {
        if (!this.m_map) return;
        if (this.m_missionLayerHandlersBound === true) return;
        if (!this.m_map.getLayer(this.m_missionPointLayerId)) return;

        this.m_map.on('click', this.m_missionPointLayerId, (event) => {
            if (typeof this.m_plannerSelectWaypointHandler !== 'function') return;

            const feature = event?.features?.[0];
            const missionId = feature?.properties?.missionId;
            const order = Number(feature?.properties?.order);
            if (missionId == null || !Number.isFinite(order) || order <= 0) return;

            this.m_plannerSelectWaypointHandler({ missionId, order });
        });

        this.m_map.on('mouseenter', this.m_missionPointLayerId, () => {
            this.m_map.getCanvas().style.cursor = 'pointer';
        });

        this.m_map.on('mouseleave', this.m_missionPointLayerId, () => {
            this.m_map.getCanvas().style.cursor = '';
        });

        this.m_missionLayerHandlersBound = true;
    }

    fn_applyMissionGeoJson(geojson) {
        if (!geojson) return;
        if (!this.m_map || !this.m_isReady) {
            this.m_pendingMissionGeoJson = geojson;
            return;
        }

        const src = this.m_map.getSource(this.m_missionSourceId);
        if (!src) {
            this.m_pendingMissionGeoJson = geojson;
            return;
        }

        src.setData(geojson);
    }


    fn_clearMissionAltitudeMarkers() {
        this.m_missionAltitudeMarkers.forEach((entry) => {
            try {
                entry.marker.remove();
            } catch (_) {
                // ignore marker cleanup errors
            }
        });
        this.m_missionAltitudeMarkers.clear();
    }

    fn_getShapeAltitudeMeters(shape) {
        const rawAlt = Number(shape?.m_missionItem?.alt);
        if (!Number.isFinite(rawAlt)) return 0;
        return Math.max(0, rawAlt);
    }

    fn_getStemHeightPx(altitudeMeters) {
        return Math.min(120, Math.max(10, Math.round(altitudeMeters * 1.5)));
    }

    fn_ensureAltitudePathOverlay() {
        if (!this.m_map || !this.m_map.getContainer) return;
        if (this.m_altitudePathOverlaySvg) return;

        const container = this.m_map.getContainer();
        if (!container) return;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'css_map3d_altitude_path_overlay');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${container.clientWidth || 1} ${container.clientHeight || 1}`);
        container.appendChild(svg);
        this.m_altitudePathOverlaySvg = svg;
    }

    fn_clearAltitudePathOverlay() {
        if (!this.m_altitudePathOverlaySvg) return;
        while (this.m_altitudePathOverlaySvg.firstChild) {
            this.m_altitudePathOverlaySvg.removeChild(this.m_altitudePathOverlaySvg.firstChild);
        }
    }

    fn_refreshAltitudeVisuals() {
        if (!this.m_map || !this.m_isReady) return;

        if (this.m_isVisible === true) {
            this.fn_setMissionBaseLayerVisibility(false);
            this.fn_renderAltitudePathOverlay(this.m_lastMissionPlans, this.m_lastActiveMissionId);
            return;
        }

        this.fn_setMissionBaseLayerVisibility(true);
        this.fn_clearAltitudePathOverlay();
    }

    // Backward compatibility for older bundled listeners that may still call this name.
    fn_scheduleAltitudePathOverlayRender() {
        this.fn_refreshAltitudeVisuals();
    }

    fn_setMissionBaseLayerVisibility(isVisible) {
        if (!this.m_map) return;

        const visibility = isVisible === true ? 'visible' : 'none';
        try {
            if (this.m_map.getLayer(this.m_missionPointLayerId)) {
                this.m_map.setLayoutProperty(this.m_missionPointLayerId, 'visibility', visibility);
            }
            if (this.m_map.getLayer(this.m_missionLineLayerId)) {
                this.m_map.setLayoutProperty(this.m_missionLineLayerId, 'visibility', visibility);
            }
        } catch (_) {
            // Ignore layer visibility failures.
        }
    }

    fn_renderAltitudePathOverlay(missionPlans, activeMissionId) {
        if (!this.m_map || !this.m_isReady) return;

        this.fn_ensureAltitudePathOverlay();
        if (!this.m_altitudePathOverlaySvg) return;

        const container = this.m_map.getContainer();
        const w = container?.clientWidth || 1;
        const h = container?.clientHeight || 1;
        this.m_altitudePathOverlaySvg.setAttribute('viewBox', `0 0 ${w} ${h}`);

        this.fn_clearAltitudePathOverlay();

        const plans = missionPlans ? Object.entries(missionPlans) : [];
        for (const [missionId, mission] of plans) {
            if (!mission || !Array.isArray(mission.m_all_mission_items_shaps)) continue;
            const items = mission.m_all_mission_items_shaps
                .filter((shape) => shape && typeof shape.getLatLng === 'function')
                .slice()
                .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

            if (items.length < 2) continue;

            const isActiveMission = String(missionId) === String(activeMissionId);
            const color = mission.m_pathColor || '#00d1b2';

            for (let i = 0; i < items.length - 1; i += 1) {
                const fromShape = items[i];
                const toShape = items[i + 1];
                const fromLL = fromShape.getLatLng();
                const toLL = toShape.getLatLng();
                if (!fromLL || !toLL) continue;

                const fromPoint = this.m_map.project([fromLL.lng, fromLL.lat]);
                const toPoint = this.m_map.project([toLL.lng, toLL.lat]);

                const fromY = fromPoint.y - this.fn_getStemHeightPx(this.fn_getShapeAltitudeMeters(fromShape));
                const toY = toPoint.y - this.fn_getStemHeightPx(this.fn_getShapeAltitudeMeters(toShape));

                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', `${fromPoint.x}`);
                line.setAttribute('y1', `${fromY}`);
                line.setAttribute('x2', `${toPoint.x}`);
                line.setAttribute('y2', `${toY}`);
                line.setAttribute('stroke', color);
                line.setAttribute('stroke-width', isActiveMission ? '3.5' : '2.5');
                line.setAttribute('stroke-linecap', 'round');
                line.setAttribute('opacity', isActiveMission ? '1' : '0.78');
                this.m_altitudePathOverlaySvg.appendChild(line);
            }
        }
    }

    fn_createAltitudeMarkerElement(altitudeMeters, isActive) {
        const root = document.createElement('div');
        root.className = `css_map3d_altitude_marker${isActive ? ' active' : ''}`;

        const stem = document.createElement('div');
        stem.className = 'css_map3d_altitude_stem';
        const stemHeight = this.fn_getStemHeightPx(altitudeMeters);
        stem.style.height = `${stemHeight}px`;

        const head = document.createElement('div');
        head.className = 'css_map3d_altitude_head';

        const label = document.createElement('div');
        label.className = 'css_map3d_altitude_label';
        label.innerText = `${Math.round(altitudeMeters)}m`;

        root.appendChild(label);
        root.appendChild(head);
        root.appendChild(stem);
        return root;
    }

    fn_syncAltitudeMarkers(missionPlans, activeMissionId) {
        if (!this.m_map || !this.m_isReady) return;

        const nextKeys = new Set();
        const plans = missionPlans ? Object.entries(missionPlans) : [];

        for (const [missionId, mission] of plans) {
            if (!mission || !Array.isArray(mission.m_all_mission_items_shaps)) continue;
            const isActiveMission = String(missionId) === String(activeMissionId);

            mission.m_all_mission_items_shaps.forEach((shape) => {
                if (!shape || typeof shape.getLatLng !== 'function') return;
                const ll = shape.getLatLng();
                if (!ll || !Number.isFinite(ll.lat) || !Number.isFinite(ll.lng)) return;

                const altitudeMeters = this.fn_getShapeAltitudeMeters(shape);
                const key = `${missionId}:${shape.order}`;
                nextKeys.add(key);

                const existing = this.m_missionAltitudeMarkers.get(key);
                if (existing) {
                    const shouldRecreate = existing.altitude !== altitudeMeters || existing.isActive !== isActiveMission;
                    if (shouldRecreate !== true) {
                        existing.marker.setLngLat([ll.lng, ll.lat]);
                        return;
                    }

                    try {
                        existing.marker.remove();
                    } catch (_) {
                        // ignore marker cleanup errors
                    }
                    this.m_missionAltitudeMarkers.delete(key);
                }

                const element = this.fn_createAltitudeMarkerElement(altitudeMeters, isActiveMission);
                element.addEventListener('click', () => {
                    if (typeof this.m_plannerSelectWaypointHandler === 'function') {
                        this.m_plannerSelectWaypointHandler({ missionId, order: Number(shape.order) });
                    }
                });

                const marker = new window.mapboxgl.Marker({
                    element,
                    anchor: 'bottom'
                })
                    .setLngLat([ll.lng, ll.lat])
                    .addTo(this.m_map);

                this.m_missionAltitudeMarkers.set(key, {
                    marker,
                    altitude: altitudeMeters,
                    isActive: isActiveMission
                });
            });
        }

        for (const [key, value] of this.m_missionAltitudeMarkers.entries()) {
            if (nextKeys.has(key)) continue;
            try {
                value.marker.remove();
            } catch (_) {
                // ignore marker cleanup errors
            }
            this.m_missionAltitudeMarkers.delete(key);
        }
    }

    fn_buildMissionGeoJson(missionPlans, activeMissionId) {
        const features = [];
        if (!missionPlans) {
            return { type: 'FeatureCollection', features };
        }

        const entries = Object.entries(missionPlans);

        for (const [missionId, mission] of entries) {
            if (!mission || !mission.m_all_mission_items_shaps || mission.m_all_mission_items_shaps.length === 0) {
                continue;
            }

            const isActive = String(missionId) === String(activeMissionId);
            const color = mission.m_pathColor || '#00d1b2';

            const points = [];
            mission.m_all_mission_items_shaps.forEach((shape) => {
                if (!shape || typeof shape.getLatLng !== 'function') return;
                const ll = shape.getLatLng();
                if (ll == null || ll.lat == null || ll.lng == null) return;

                const alt_m = this.fn_getShapeAltitudeMeters(shape);
                points.push({ ll, alt_m, order: Number(shape.order || 0) });

                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [ll.lng, ll.lat]
                    },
                    properties: {
                        missionId: String(missionId),
                        order: Number(shape.order || 0),
                        alt_m,
                        color,
                        active: isActive
                    }
                });
            });

            if (points.length > 1) {
                for (let i = 0; i < points.length - 1; i += 1) {
                    const fromPoint = points[i];
                    const toPoint = points[i + 1];
                    const avg_alt_m = (fromPoint.alt_m + toPoint.alt_m) / 2.0;

                    features.push({
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: [
                                [fromPoint.ll.lng, fromPoint.ll.lat],
                                [toPoint.ll.lng, toPoint.ll.lat]
                            ]
                        },
                        properties: {
                            missionId: String(missionId),
                            fromOrder: fromPoint.order,
                            toOrder: toPoint.order,
                            avg_alt_m,
                            color,
                            active: isActive
                        }
                    });
                }
            }
        }

        return {
            type: 'FeatureCollection',
            features
        };
    }

    fn_syncMissionPlans(missionPlans, activeMissionId) {
        this.m_lastMissionPlans = missionPlans;
        this.m_lastActiveMissionId = activeMissionId;

        const geojson = this.fn_buildMissionGeoJson(missionPlans, activeMissionId);
        this.fn_applyMissionGeoJson(geojson);
        this.fn_syncAltitudeMarkers(missionPlans, activeMissionId);
        this.fn_refreshAltitudeVisuals();
    }

    fn_setPlannerCreateWaypointHandler(handler) {
        this.m_plannerCreateWaypointHandler = handler;
    }


    fn_setPlannerSelectWaypointHandler(handler) {
        this.m_plannerSelectWaypointHandler = handler;
    }

    fn_enablePlannerCreateWaypoint(enabled) {
        this.m_plannerCreateEnabled = enabled === true;
    }

    async fn_initMap(containerId) {
        if (this.m_isReady === true || this.m_map != null) return;

        const token = js_siteConfig.CONST_MAPBOX_ACCESS_TOKEN;
        if (!token) {
            console.warn('Mapbox 3D disabled: CONST_MAPBOX_ACCESS_TOKEN is not configured.');
            return;
        }

        const mapboxgl = await this.fn_loadMapboxSdk();
        mapboxgl.accessToken = token;

        this.m_map = new mapboxgl.Map({
            container: containerId,
            style: js_siteConfig.CONST_MAPBOX_STYLE || 'mapbox://styles/mapbox/standard-satellite',
            center: [-0.1870, 5.6037],
            zoom: 11.5,
            pitch: 45,
            bearing: 0,
            antialias: true
        });

        this.m_map.on('style.load', () => {
            this.fn_applyTerrain();
            this.fn_applyBuildings();
        });

        this.m_map.on('load', () => {
            this.m_isReady = true;
            this.fn_ensureMissionLayers();

            if (this.m_pendingViewState) {
                this.fn_applyViewState(this.m_pendingViewState);
                this.m_pendingViewState = null;
            }

            if (this.m_isVisible === true) {
                this.m_map.resize();
                this.fn_setMissionBaseLayerVisibility(false);
                this.fn_refreshAltitudeVisuals();
            }
        });

        this.m_map.on('click', (event) => {
            if (this.m_plannerCreateEnabled !== true || typeof this.m_plannerCreateWaypointHandler !== 'function') {
                return;
            }

            if (event?.originalEvent?.shiftKey !== true) {
                return;
            }

            this.m_plannerCreateWaypointHandler({
                lat: event.lngLat.lat,
                lng: event.lngLat.lng
            });
        });

        this.m_map.on('move', () => {
            this.fn_refreshAltitudeVisuals();
        });

        this.m_map.on('render', () => {
            this.fn_refreshAltitudeVisuals();
        });

        this.m_map.on('click', (event) => {
            if (this.m_plannerCreateEnabled !== true || typeof this.m_plannerCreateWaypointHandler !== 'function') {
                return;
            }

            if (event?.originalEvent?.shiftKey !== true) {
                return;
            }

            this.m_plannerCreateWaypointHandler({
                lat: event.lngLat.lat,
                lng: event.lngLat.lng
            });
        });

        this.m_map.on('move', () => {
            this.fn_refreshAltitudeVisuals();
        });

        this.m_map.on('render', () => {
            this.fn_refreshAltitudeVisuals();
        });

        this.m_map.on('click', (event) => {
            if (this.m_plannerCreateEnabled !== true || typeof this.m_plannerCreateWaypointHandler !== 'function') {
                return;
            }

            if (event?.originalEvent?.shiftKey !== true) {
                return;
            }

            this.m_plannerCreateWaypointHandler({
                lat: event.lngLat.lat,
                lng: event.lngLat.lng
            });
        });

        this.m_map.on('move', () => {
            this.fn_refreshAltitudeVisuals();
        });

        this.m_map.on('render', () => {
            this.fn_refreshAltitudeVisuals();
        });

        // single move handler (you had it duplicated)
        this.m_map.on('move', () => {
            this.fn_scheduleAltitudePathOverlayRender();
        });

        this.m_map.on('click', (evt) => {
            if (this.m_plannerCreateEnabled !== true || typeof this.m_plannerCreateWaypointHandler !== 'function') return;
            if (evt?.originalEvent?.shiftKey !== true) return;

            this.m_plannerCreateWaypointHandler({
                lat: evt.lngLat.lat,
                lng: evt.lngLat.lng
            });
        });

        this.m_map.on('render', () => {
            if (this.m_isVisible !== true) return;
            this.fn_scheduleAltitudePathOverlayRender();
        });

        this.m_map.on('moveend', () => {
            const view = this.fn_getView();
            if (view) this.m_lastView = view;
            this.fn_refreshAltitudeVisuals();
        });

        this.m_map.on('resize', () => {
            this.fn_refreshAltitudeVisuals();
        });
    }

    // ---------- VIEW STATE ----------
    fn_getViewState() {
        if (!this.m_map || !this.m_isReady) {
            return { lat: 5.6037, lng: -0.1870, zoom: 11.5, bearing: 0, pitch: 45 };
        }

        const center = this.m_map.getCenter();
        return {
            lat: center.lat,
            lng: center.lng,
            zoom: this.m_map.getZoom(),
            bearing: this.m_map.getBearing(),
            pitch: this.m_map.getPitch()
        };
    }

    fn_applyViewState(state) {
        if (state == null) return;

        if (!this.m_map || !this.m_isReady) {
            this.m_pendingViewState = state;
            return;
        }

        const lat = Number(state.lat);
        const lng = Number(state.lng);
        const zoom = Number(state.zoom);
        const bearing = Number(state.bearing);
        const pitch = Number(state.pitch);

        if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(zoom)) return;

        this.m_map.jumpTo({
            center: [lng, lat],
            zoom,
            bearing: Number.isFinite(bearing) ? bearing : this.m_map.getBearing(),
            pitch: Number.isFinite(pitch) ? pitch : this.m_map.getPitch()
        });
    }

    // aliases
    fn_getView() {
        return this.fn_getViewState();
    }

    fn_applyView(state) {
        this.fn_applyViewState(state);
    }

    fn_show() {
        this.m_isVisible = true;
        if (this.m_map) {
            this.m_map.resize();
            this.fn_setMissionBaseLayerVisibility(false);
            this.fn_refreshAltitudeVisuals();
        }
    }

    fn_hide() {
        this.m_isVisible = false;
        this.m_pendingViewState = null;
        this.fn_setMissionBaseLayerVisibility(true);
        this.fn_clearMissionAltitudeMarkers();
        this.fn_clearAltitudePathOverlay();
    }

    fn_focusUnit(unit) {
        if (!this.m_map || !this.m_isReady || !unit?.m_Nav_Info?.p_Location) return;
        const { lat, lng } = unit.m_Nav_Info.p_Location;
        if (lat == null || lng == null) return;

        this.m_map.easeTo({
            center: [lng, lat],
            duration: 500,
            pitch: 53
        });
    }

    fn_syncUnit(unit) {
        if (!this.m_map || !this.m_isReady || !unit?.m_Nav_Info?.p_Location) return;

        const { lat, lng } = unit.m_Nav_Info.p_Location;
        if (lat == null || lng == null) return;

        const id = unit.getPartyID();
        let marker = this.m_markers.get(id);

        if (!marker) {
            const el = document.createElement('div');
            el.className = 'css_map3d_marker';
            el.title = unit.m_unitName || id;
            marker = new window.mapboxgl.Marker({ element: el, rotationAlignment: 'map' });
            marker.addTo(this.m_map);
            this.m_markers.set(id, marker);
        }

        marker.setLngLat([lng, lat]);

        const yaw = unit?.m_Nav_Info?.p_Orientation?.yaw;
        if (Number.isFinite(yaw)) {
            marker.setRotation(yaw);
        }
    }
}

export const js_map3d = new CAndruavMap3D();

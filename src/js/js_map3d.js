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

            const coords = [];
            mission.m_all_mission_items_shaps.forEach((shape) => {
                if (!shape || typeof shape.getLatLng !== 'function') return;
                const ll = shape.getLatLng();
                if (ll == null || ll.lat == null || ll.lng == null) return;
                coords.push([ll.lng, ll.lat]);

                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [ll.lng, ll.lat]
                    },
                    properties: {
                        missionId: String(missionId),
                        order: Number(shape.order || 0),
                        color,
                        active: isActive
                    }
                });
            });

            if (coords.length > 1) {
                features.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: coords
                    },
                    properties: {
                        missionId: String(missionId),
                        color,
                        active: isActive
                    }
                });
            }
        }

        return {
            type: 'FeatureCollection',
            features
        };
    }

    fn_syncMissionPlans(missionPlans, activeMissionId) {
        const geojson = this.fn_buildMissionGeoJson(missionPlans, activeMissionId);
        this.fn_applyMissionGeoJson(geojson);
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

        this.m_map.on('moveend', () => {
            const view = this.fn_getView();
            if (view) this.m_lastView = view;
        });
    }

    // ---------- VIEW STATE (single canonical implementation) ----------
    fn_getViewState() {
        if (!this.m_map || !this.m_isReady) {
            return {
                lat: 5.6037,
                lng: -0.1870,
                zoom: 11.5,
                bearing: 0,
                pitch: 45
            };
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

    // Backward-compatible aliases for any stale/hot-reload references.
    fn_getView() {
        return this.fn_getViewState();
    }

    fn_applyView(state) {
        this.fn_applyViewState(state);
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

    fn_show() {
        this.m_isVisible = true;
        if (this.m_map) this.m_map.resize();
    }

    fn_hide() {
        this.m_isVisible = false;
        this.m_pendingViewState = null;
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

import * as js_siteConfig from './js_siteConfig';

class CAndruavMap3D {
    constructor() {
        this.m_map = null;
        this.m_isReady = false;
        this.m_markers = new Map();
        this.m_isVisible = false;
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
        return Math.min(0.95, Math.max(0.05, configured));
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

    fn_applyBuildings() {
        if (!this.m_map) return;

        const buildingOpacity = this.fn_getBuildingOpacity();
        const buildingColor = js_siteConfig.CONST_MAPBOX_3D_BUILDING_COLOR || '#e0e0e0';
        const style = this.m_map.getStyle();
        const layers = style?.layers || [];

        const existingBuildingLayerIds = layers
            .filter((layer) => layer.type === 'fill-extrusion' && layer.id.toLowerCase().includes('building'))
            .map((layer) => layer.id);

        if (existingBuildingLayerIds.length > 0) {
            existingBuildingLayerIds.forEach((layerId) => {
                this.m_map.setLayoutProperty(layerId, 'visibility', 'visible');
                this.m_map.setPaintProperty(layerId, 'fill-extrusion-opacity', buildingOpacity);
                this.m_map.setPaintProperty(layerId, 'fill-extrusion-color', buildingColor);
                this.m_map.setPaintProperty(layerId, 'fill-extrusion-height', ['coalesce', ['get', 'height'], 10]);
                this.m_map.setPaintProperty(layerId, 'fill-extrusion-base', ['coalesce', ['get', 'min_height'], 0]);
            });
            return;
        }

        if (!this.m_map.getLayer('add-3d-buildings') && this.m_map.getSource('composite')) {
            this.m_map.addLayer({
                id: 'add-3d-buildings',
                source: 'composite',
                'source-layer': 'building',
                type: 'fill-extrusion',
                minzoom: 10,
                paint: {
                    'fill-extrusion-color': buildingColor,
                    'fill-extrusion-height': ['coalesce', ['get', 'height'], 10],
                    'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
                    'fill-extrusion-opacity': buildingOpacity
                }
            });
        }
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
            center: [24.767945, 42.144913],
            zoom: 15.47,
            pitch: 53,
            bearing: 0,
            antialias: true
        });

        this.m_map.on('style.load', () => {
            this.fn_applyTerrain();
            this.fn_applyBuildings();
        });

        this.m_map.on('load', () => {
            this.m_isReady = true;
            if (this.m_isVisible === true) {
                this.m_map.resize();
            }
        });
    }

    fn_show() {
        this.m_isVisible = true;
        if (this.m_map) this.m_map.resize();
    }

    fn_hide() {
        this.m_isVisible = false;
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

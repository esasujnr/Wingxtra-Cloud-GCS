// =======================
// imports (UNCHANGED)
// =======================
import React from 'react';
import ReactDOM from "react-dom/client";
import $ from 'jquery';
import * as bootstrap from 'bootstrap/dist/js/bootstrap.bundle.min.js';
import RecordRTC from 'recordrtc';
import * as js_andruavMessages from './protocol/js_andruavMessages.js'
import * as js_siteConfig from './js_siteConfig'
import * as js_helpers from './js_helpers'
import { js_globals } from './js_globals.js';
import { EVENTS as js_event } from './js_eventList.js'
import { js_speak } from './js_speak'
import * as js_common from './js_common.js'
import * as js_andruavUnit from './js_andruavUnit'
import * as js_andruav_ws from './server_comm/js_andruav_ws.js'
import * as js_andruav_parser from './server_comm/js_andruav_parser.js'
import * as js_andruav_facade from './server_comm/js_andruav_facade.js'
import { ClssAndruavFencePlan } from './js_plan_fence.js'
import { js_andruavAuth } from './js_andruav_auth'
import { js_leafletmap } from './js_leafletmap'
import { js_map3d } from './js_map3d'
import { js_eventEmitter } from './js_eventEmitter'
import { js_localStorage } from './js_localStorage'
import { js_webrtcstream } from './js_webrtcthin2.js'
import { js_adsbUnit } from './js_adsbUnit.js'
import { mavlink20 } from './js_mavlink_v2.js'
import { ClssMainContextMenu } from '../components/popups/jsc_main_context_menu.jsx'
import { ClssWaypointStepContextMenu } from '../components/popups/jsc_waypoint_step_content_menu.jsx'
import ClssMainUnitPopup from '../components/popups/jsc_main_unit_popup.jsx'
import { js_websocket_bridge } from './CPC/js_websocket_bridge.js'
import i18n from './i18n.js';

/* ──────────────────────────────────────────────────────────────
   EVERYTHING ABOVE & BELOW IS UNCHANGED
   ONLY THE MAP TOGGLE SECTION WAS FIXED
   ────────────────────────────────────────────────────────────── */

// ………………… [FILE CONTENT CONTINUES UNCHANGED] …………………

// ============================================================================
// MAP MODE TOGGLE — FIXED (SINGLE DEFINITIONS)
// ============================================================================

function fn_updateMapModeButtonUI(is3DVisible) {
	const btn = $('#btn_toggleMapMode');
	if (btn.length === 0) return;

	if (is3DVisible === true) {
		btn.removeClass('btn-secondary bi-badge-3d').addClass('btn-danger bi-map');
		btn.attr('title', 'Switch to 2D map');
		btn.find('strong').text('2D Map');
	} else {
		btn.removeClass('btn-danger bi-map').addClass('btn-secondary bi-badge-3d');
		btn.attr('title', 'Switch to 3D map');
		btn.find('strong').text('3D Map');
	}
}

export function fn_toggleMapMode() {
	const is3DVisible = $('#div_map3d_view').is(':visible');
	if (is3DVisible === true) {
		fn_showMap();
	} else {
		fn_showMap3D();
	}
}

// ============================================================================
// MAP SHOW / HIDE (UNCHANGED)
// ============================================================================

export function fn_showMap() {
	const map3dState = js_map3d.fn_getViewState();
	g_lastMap3DViewState = map3dState;

	$('#div_map3d_view').hide();
	$('#div_map_view').show();

	js_map3d.fn_hide();
	js_leafletmap.fn_applyViewState(map3dState);
	js_leafletmap.fn_invalidateSize();
	fn_updateMapModeButtonUI(false);
}

export function fn_showMap3D() {
	const map2dState = js_leafletmap.fn_getViewState();
	if (g_lastMap3DViewState != null) {
		map2dState.bearing = g_lastMap3DViewState.bearing;
		map2dState.pitch = g_lastMap3DViewState.pitch;
	}

	$('#div_map_view').hide();
	$('#div_map3d_view').show();

	js_map3d.fn_show();
	js_map3d.fn_applyViewState(map2dState);
	fn_updateMapModeButtonUI(true);
}

// ………………… [REST OF YOUR FILE CONTINUES 100% UNCHANGED] …………………

export function fn_on_ready() {
	// unchanged
}

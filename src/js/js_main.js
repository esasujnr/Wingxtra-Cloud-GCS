// -----------------------------------------------------------------------------
// Map Mode Toggle (2D / 3D) - SINGLE DEFINITIONS ONLY
// -----------------------------------------------------------------------------

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

	// keep last 3D bearing/pitch when switching back to 3D
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

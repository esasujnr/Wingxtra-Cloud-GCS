import React from 'react';
import { withTranslation } from 'react-i18next';
import { fn_showSettings, fn_showMap, fn_showMap3D, fn_showVideoMainTab } from '../js/js_main';

class ClssCtrlLayout extends React.Component {
    render() {
        const { t } = this.props; // Access t function with ctrlLayout namespace
        return (
            <div id="main_btn_group" role="group" className="d-flex align-items-center" >
                <button
                    type="button"
                    id="btn_showSettings"
                    className="btn btn-success btn-sm  bi bi-gear-fill"
                    title={t('ctrlLayout:settings.title')}
                    onClick={(e) => fn_showSettings()}
                >
                    <strong>{t('ctrlLayout:settings.label')}</strong>
                </button>
                <button
                    type="button"
                    id="btn_showMap"
                    className="btn btn-danger btn-sm  bi bi-map"
                    title={t('ctrlLayout:map.title')}
                    onClick={(e) => fn_showMap()}
                >
                    <strong>2D Map</strong>
                </button>
                <button
                    type="button"
                    id="btn_showMap3D"
                    className="btn btn-secondary btn-sm bi bi-badge-3d"
                    title={t('ctrlLayout:map3d.title')}
                    onClick={(e) => fn_showMap3D()}
                >
                    <strong>3D Map</strong>
                </button>
                <button
                    type="button"
                    id="btn_showVideo"
                    className="btn btn-warning btn-sm  bi bi-camera-fill"
                    title={t('ctrlLayout:camera.title')}
                    onClick={(e) => fn_showVideoMainTab()}
                >
                    <strong>{t('ctrlLayout:camera.label')}</strong>
                </button>
            </div>
        );
    }
}

export default withTranslation('ctrlLayout')(ClssCtrlLayout);

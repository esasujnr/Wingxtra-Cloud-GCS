import React from 'react';
import { withTranslation } from 'react-i18next';
import { js_localStorage } from '../js/js_localStorage';
import { fn_showMap, fn_showMap3D, fn_showVideoMainTab, fn_showControl } from '../js/js_main';
import { ClssLanguageSwitcher } from './gadgets/jsc_language_switcher.jsx';

class ClssCtrlLayout extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            now: new Date()
        };
        this.m_timer = null;
        js_localStorage.fn_getDisplayMode();
    }

    componentDidMount() {
        this.m_timer = setInterval(() => {
            this.setState({ now: new Date() });
        }, 1000);
    }

    componentWillUnmount() {
        if (this.m_timer) clearInterval(this.m_timer);
    }

    fn_getDateLabel() {
        return this.state.now.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
    }

    fn_getTimeLabel() {
        return this.state.now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    render() {
        const { t } = this.props;
        const v_display_mode = js_localStorage.fn_getDisplayMode() % 5 + 1;

        return (
            <div id="main_btn_group" role="group" className="d-flex flex-column align-items-end gap-1">
                <div className="css_cockpit_statusbar">
                    <div className="css_cockpit_datetime user-select-none">
                        <span className="css_cockpit_time">{this.fn_getTimeLabel()}</span>
                        <span className="css_cockpit_date">{this.fn_getDateLabel()}</span>
                    </div>
                    <div id="vehicle_alert_space" className="css_vehicle_alert_space user-select-none" title="Vehicle alerts area">
                        Vehicle Alerts: --
                    </div>
                </div>

                <div className="d-flex align-items-center flex-wrap justify-content-end gap-1">
                    <button
                        type="button"
                        id="btn_showMap"
                        className="btn btn-danger btn-sm bi bi-map"
                        title={t('ctrlLayout:map.title')}
                        onClick={() => fn_showMap()}
                    >
                        <strong>2D Map</strong>
                    </button>
                    <button
                        type="button"
                        id="btn_showMap3D"
                        className="btn btn-secondary btn-sm bi bi-badge-3d"
                        title={t('ctrlLayout:map3d.title')}
                        onClick={() => fn_showMap3D()}
                    >
                        <strong>3D Map</strong>
                    </button>
                    <button
                        type="button"
                        id="btn_showVideo"
                        className="btn btn-warning btn-sm bi bi-camera-fill"
                        title={t('ctrlLayout:camera.title')}
                        onClick={() => fn_showVideoMainTab()}
                    >
                        <strong>{t('ctrlLayout:camera.label')}</strong>
                    </button>
                    <button
                        type="button"
                        id="btn_showControl"
                        className="btn btn-primary btn-sm d-none d-sm-inline bi bi-grid-1x2-fill"
                        title={t('ctrlLayout:layout.title')}
                        onClick={() => fn_showControl(false)}
                    >
                        <strong>{t('ctrlLayout:layout.label', { mode: v_display_mode })}</strong>
                    </button>
                    <button
                        type="button"
                        id="btn_showControl_small"
                        className="btn btn-primary btn-sm d-inline d-sm-none bi bi-grid-1x2-fill"
                        title={t('ctrlLayout:layoutSmall.title')}
                        onClick={() => fn_showControl(true)}
                    >
                        <strong>{t('ctrlLayout:layoutSmall.label', { mode: v_display_mode })}</strong>
                    </button>
                    <ClssLanguageSwitcher className="ms-1" />
                </div>
            </div>
        );
    }
}

export default withTranslation('ctrlLayout')(ClssCtrlLayout);

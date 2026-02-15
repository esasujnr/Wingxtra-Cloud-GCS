import React from 'react';
import { withTranslation } from 'react-i18next';

class ClssCtrlLayout extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            now: new Date()
        };
        this.m_timer = null;
    }

    componentDidMount() {
        this.m_timer = setInterval(() => {
            this.setState({ now: new Date() });
        }, 1000);
    }

    componentWillUnmount() {
        if (this.m_timer) clearInterval(this.m_timer);
    }

    fn_getDateTimeLabel() {
        const dayName = this.state.now.toLocaleDateString(undefined, { weekday: 'short' });
        const dateLabel = this.state.now.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit'
        });
        const timeLabel = this.state.now.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        return `${timeLabel}, ${dayName} ${dateLabel}`;
    }

    render() {
        return (
            <div id="main_btn_group" role="group" className="d-flex align-items-center justify-content-end">
                <div id="vehicle_alert_space" className="css_vehicle_alert_space user-select-none" title="Vehicle alerts area">
                    Vehicle Alerts: --
                </div>
                <div className="css_cockpit_datetime user-select-none ms-3">
                    <span className="css_cockpit_time">{this.fn_getDateTimeLabel()}</span>
                </div>
            </div>
        );
    }
}

export default withTranslation('ctrlLayout')(ClssCtrlLayout);

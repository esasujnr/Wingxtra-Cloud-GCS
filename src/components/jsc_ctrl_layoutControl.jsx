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
        if (this.m_timer) {
            clearInterval(this.m_timer);
            this.m_timer = null;
        }
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
        return (
            <div
                id="main_btn_group"
                role="group"
                className="d-flex align-items-center justify-content-end"
            >
                <div
                    id="vehicle_alert_space"
                    className="css_vehicle_alert_space user-select-none"
                    title="Vehicle alerts area"
                >
                    Vehicle Alerts: --
                </div>

                <div className="css_cockpit_datetime user-select-none ms-3">
                    <span className="css_cockpit_time">
                        {this.fn_getTimeLabel()}
                    </span>
                    <span className="css_cockpit_date">
                        {this.fn_getDateLabel()}
                    </span>
                </div>
            </div>
        );
    }
}

export default withTranslation('ctrlLayout')(ClssCtrlLayout);

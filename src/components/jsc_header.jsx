
import React from 'react';

import * as  js_siteConfig from '../js/js_siteConfig'

import ClssLoginControl from './jsc_login.jsx'
import ClssCtrlLayout from './jsc_ctrl_layoutControl.jsx'

import { withTranslation } from 'react-i18next';

class ClssHeaderControl extends React.Component {
    constructor() {
        super();
        this.state = {};
    }

    render() {

        let ctrl = [];
        if (this.props.no_layout_ctrl !== null && this.props.no_layout_ctrl !== undefined) {
            ctrl.push(
                <div key='hdr_ctrl2' className='col-9 col-lg-4     css_margin_zero css_padding_zero al_r '>
                </div>
            );
        }
        else {
            ctrl.push(
                <div key='hdr_ctrl2' className='col-9 col-lg-4     css_margin_zero css_padding_zero al_r '>
                    <ClssCtrlLayout />
                </div>
            );
        }
        if (this.props.no_login !== null && this.props.no_login !== undefined) {
            ctrl.push(
                <div key='hdr_ctrl1' className=' col-2 col-lg-1    css_margin_zero  al_r'>

                </div>
            );
        }
        else {
            ctrl.push(
                <div key='hdr_ctrl1' className=' col-2 col-lg-1    css_margin_zero  al_r'>
                    <ClssLoginControl simple='true' />
                </div>
            );
        }
        return (
            <div id='rowheader' key='ClssHeaderControl' className='row  css_padding_zero txt-theme-aware-bg fixed-top ps-3'>
                <div className='col-7  css_margin_zero css_padding_zero d-lg-block d-none d-xl-block'>
                    <nav className="navbar navbar-expand-lg txt-theme-aware-navbar p-0">
                        <a className="navbar-brand fs-3" href=".">
                            <img src="/images/de/DE_logo_w_title.png" width="48" height="48" className="d-inline-block align-top pt-2" alt="" />
                            {js_siteConfig.CONST_TITLE}
                        </a>
                        <div className="collapse navbar-collapse" id="navbarNav">
                            <ul className="navbar-nav">
                                <li className="nav-item">
                                    <a className="nav-link" href="./">Operations</a>
                                </li>
                                <li className="nav-item">
                                    <a className="nav-link" href="./delivery/orders">Delivery</a>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </div>
                {ctrl}
            </div>
        );
    }
}



export default withTranslation()(ClssHeaderControl);



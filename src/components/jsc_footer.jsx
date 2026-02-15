import packageJson from  '../../package.json'

import React from 'react';
import { withTranslation } from 'react-i18next';


class ClssFooterControl extends React.Component {
	constructor()
	{
        super ();
		this.state = {};
    }


    render()
    {
        const year = (new Date()).getFullYear();

        return (
            <footer className="text-center bg-4 text-light">
  
                <p className="user-select-none">© Copyright  2014-{year}, <span className="a_nounderline a_hoverinvers link-success" title="Wingxtra C2">Wingxtra C2</span> <span className="small text-decoration-underline">  build:{packageJson.build_number}</span></p> 
    
            </footer>
        );
    }
}

export default withTranslation()(ClssFooterControl);

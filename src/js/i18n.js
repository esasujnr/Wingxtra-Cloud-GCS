import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslation from '../locales/en/translation.json';
import enUnitBar from '../locales/en/unitBar.json';
import enHome from '../locales/en/home_js.json';
import en_jsc_ctrlLayoutControl from '../locales/en/jsc_ctrlLayoutControl.json';
import en_jsc_unit_control_imu from '../locales/en/jsc_unit_control_imu.json';
import en_jsc_ctrl_udp_proxy_telemetry from '../locales/en/jsc_ctrl_udp_proxy_telemetry.json';
import en_jsc_ctrl_swarm from '../locales/en/jsc_ctrl_swarm.json';
import en_jsc_global_settings from '../locales/en/jsc_global_settings.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslation,
        unitBar: enUnitBar,
        home: enHome,
        ctrlLayout: en_jsc_ctrlLayoutControl,
        unit_control_imu: en_jsc_unit_control_imu,
        udpProxyTelemetry: en_jsc_ctrl_udp_proxy_telemetry,
        swarmCtrl: en_jsc_ctrl_swarm,
        globalSettings: en_jsc_global_settings
      }
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false }
  });

export default i18n;

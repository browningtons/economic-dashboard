export const BUILD_VERSION = 'Version 2';
export const BUILD_VERSION_LABEL = 'API Refresh + Validation';
export const BUILD_VERSION_SUMMARY = 'Version 2 marks the shift from a charting prototype to an operational dashboard with automated API refreshes, validation checks, and ongoing data monitoring.';
export const BUILD_NOTES_TITLE = 'Recent changes in Version 2';

export interface BuildNote {
  hash: string;
  date: string;
  title: string;
}

export const BUILD_NOTES: BuildNote[] = [
  {
    hash: '34a5623',
    date: 'Mar 17, 2026',
    title: 'Add dashboard data confidence layer',
  },
  {
    hash: '1145043',
    date: 'Mar 18, 2026',
    title: 'Automated economic indicator snapshot refresh',
  },
  {
    hash: '5840ed1',
    date: 'Mar 17, 2026',
    title: 'Downgrade stock market freshness alert to warning',
  },
  {
    hash: '63df837',
    date: 'Mar 18, 2026',
    title: 'Automated economic indicator snapshot refresh',
  },
  {
    hash: '26714b7',
    date: 'Mar 17, 2026',
    title: 'Treat blank CSV cells as missing in validation',
  },
  {
    hash: '9acf247',
    date: 'Mar 18, 2026',
    title: 'Automated economic indicator snapshot refresh',
  },
  {
    hash: '4fbf2d3',
    date: 'Mar 17, 2026',
    title: 'Fix missing month diff helper',
  },
  {
    hash: 'd17fada',
    date: 'Mar 17, 2026',
    title: 'Harden economic data workflow failures',
  },
  {
    hash: 'ae18758',
    date: 'Mar 12, 2026',
    title: 'Fix data refresh alerting loop',
  },
  {
    hash: 'eab8dfb',
    date: 'Mar 02, 2026',
    title: 'Add release calendar validation and split dashboard views',
  },
];

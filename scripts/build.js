#!/usr/bin/env node
/* Static site builder — reads src/templates + src/partials, emits dist/ */
const { build } = require('./lib-build');

build({
  distDirName: 'dist',
  templatesDirName: 'templates',
  partialsDirName: 'partials',
  assetsDirName: 'assets',
  themeCss: '/assets/css/style.css',
  themeColor: '#ff6a1a',
  themeFonts: `<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />`,
});

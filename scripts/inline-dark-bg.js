#!/usr/bin/env node
// Injects a dark background <style> as the first child of <head> in dist/index.html
// so the very first painted frame is dark — before the external CSS bundle loads.
// Idempotent: skips if the marker is already present.
// Run automatically after every `expo export --platform web`.

const fs = require('fs');
const path = require('path');

const DIST = path.resolve(__dirname, '../apps/mobile/dist/index.html');
const MARKER = 'data-huddle-dark';
const STYLE = `<style ${MARKER}>html,body,#root{background-color:#0A0E14!important;margin:0}</style>`;

let html = fs.readFileSync(DIST, 'utf8');

if (html.includes(MARKER)) {
  console.log('inline-dark-bg: already present, skipping');
  process.exit(0);
}

// Insert as the very first child of <head> so it applies before any <link>
html = html.replace('<head>', `<head>\n  ${STYLE}`);

fs.writeFileSync(DIST, html, 'utf8');
console.log('inline-dark-bg: injected dark background into', DIST);

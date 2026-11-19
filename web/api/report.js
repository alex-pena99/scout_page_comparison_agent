import { get } from '@vercel/blob';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { renderReport } from '../lib/view.js';

const reportIdPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
const assetPattern = /^[a-z0-9][a-z0-9-]{0,79}\.(png|json|zip)$/;
const readBlob = pathname => get(pathname, { access: 'private' });

export default async function handler(req, res) {
  // This project uses Vercel Authentication on All Deployments, including
  // direct function URLs. Storage is private and is read only on this server.
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Security-Policy',
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed.');
  }

  const { auditId, asset } = req.query;
  if (typeof auditId !== 'string' || !reportIdPattern.test(auditId) ||
      (asset !== undefined && (typeof asset !== 'string' || !assetPattern.test(asset)))) {
    return res.status(404).send('Report or evidence not found.');
  }

  try {
    const base = `reports/${auditId}`;
    const result = await readBlob(asset ? `${base}/evidence/${asset}` : `${base}/report.json`);
    if (result?.statusCode !== 200) return res.status(404).send('Report or evidence not found.');

    if (asset) {
      const type = asset.endsWith('.png') ? 'image/png' : asset.endsWith('.zip') ? 'application/zip' : 'application/json; charset=utf-8';
      res.setHeader('Content-Type', type);
      if (asset.endsWith('.zip')) res.setHeader('Content-Disposition', `attachment; filename="${asset}"`);
      if (req.method === 'HEAD') {
        await result.stream.cancel();
        return res.end();
      }
      await pipeline(Readable.fromWeb(result.stream), res);
      return;
    }

    const report = await new Response(result.stream).json();
    if (report.id !== auditId) throw new Error('Report ID does not match its path.');
    const html = renderReport(report);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Scout report read failed', { name: error?.name });
    if (res.headersSent || res.destroyed) return;
    return res.status(503).send('This report is temporarily unavailable.');
  }
}

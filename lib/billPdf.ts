import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as Print from 'expo-print';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import i18n from './i18n';
import { billsRepo, customersRepo, ordersRepo, paymentsRepo } from './data/repository';
import { formatCurrency, formatDate } from './format';
import { parseGarmentType } from './garments';
import { uploadPdf } from './storage';
import { sendWhatsAppMessage } from './whatsapp';
import type { Shop } from '../types';
import type { Tables } from './database.types';

type BillData = {
  bill: Tables<'bills'>;
  customer: Tables<'customers'> | null;
  order: Tables<'orders'> | null;
  items: Tables<'order_items'>[];
  paid: number;
  balance: number;
};

/** Pre-processed images embedded in the PDF (data URIs). */
export type BillImages = { logo: string | null; photos: string[] };

/** Cloth photos beyond this are left out so the PDF stays a quick download. */
const MAX_PHOTOS = 9;
/** Photos are shrunk to this width before embedding (camera originals are MBs). */
const PHOTO_WIDTH = 600;

const tb = (key: string, opts?: Record<string, unknown>) => i18n.t(key, { ns: 'billing', ...opts });

/** Everything a bill PDF shows, read from the local-first mirror. */
export async function loadBillData(shopId: string, billId: string): Promise<BillData> {
  const bill = await billsRepo.get(billId);
  if (!bill) throw new Error(tb('pdf.notFound'));
  const [customer, order, payments] = await Promise.all([
    customersRepo.get(bill.customer_id),
    bill.order_id ? ordersRepo.get(bill.order_id) : Promise.resolve(null),
    paymentsRepo.listForShop(shopId),
  ]);
  const items = order ? await ordersRepo.itemsForOrder(order.id) : [];
  const paid = payments.filter((p) => p.bill_id === bill.id).reduce((s, p) => s + Number(p.amount_paid), 0);
  const balance = Math.max(Number(bill.total_amount ?? 0) - paid, 0);
  return { bill, customer, order, items, paid, balance };
}

function escapeHtml(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Remote/local image URLs are unreliable inside the print WebView, so images are inlined as data URIs. */
async function toDataUri(url: string): Promise<string | null> {
  try {
    const blob = await (await fetch(url)).blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Downloads a photo and shrinks it to a small JPEG; null if it can't be loaded. */
async function compressedPhoto(url: string): Promise<string | null> {
  const source = await toDataUri(url);
  if (!source) return null;
  try {
    // Pass both dimensions: the web implementation doesn't derive a missing
    // one (it fails with "height is zero"), and this never upscales.
    const original = await ImageManipulator.manipulate(source).renderAsync();
    const width = Math.min(PHOTO_WIDTH, original.width);
    const height = Math.round((width * original.height) / original.width);
    const context = ImageManipulator.manipulate(source);
    context.resize({ width, height });
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
  } catch {
    // Couldn't resize (unsupported format etc.) — skip it rather than embed a multi-MB original.
    return null;
  }
}

export async function loadBillImages(shop: Shop, data: BillData): Promise<BillImages> {
  const urls = (data.order?.design_photo_urls ?? []).filter(Boolean).slice(0, MAX_PHOTOS);
  const [logo, ...photos] = await Promise.all([
    shop.logo_url ? toDataUri(shop.logo_url) : Promise.resolve(null),
    ...urls.map(compressedPhoto),
  ]);
  return { logo, photos: photos.filter((p): p is string => !!p) };
}

function itemLabel(garmentType: string): string {
  const type = parseGarmentType(garmentType);
  return type ? i18n.t(`form.garmentTypes.${type}`, { ns: 'orders' }) : garmentType;
}

const STYLES = `
  @page { margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, Roboto, 'Noto Sans', 'Noto Sans Gujarati', 'Noto Sans Devanagari', sans-serif;
    color: #101828; font-size: 12px; line-height: 1.45; padding: 28px 28px 24px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .logo { width: 52px; height: 52px; border-radius: 10px; object-fit: contain; border: 1px solid #EAECF0; }
  .logo-fallback { width: 52px; height: 52px; border-radius: 10px; background: #1D4ED8; color: #fff;
    font-size: 22px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  .shop-name { font-size: 18px; font-weight: 700; letter-spacing: -0.2px; }
  .muted { color: #667085; }
  .small { font-size: 10.5px; }
  .doc { text-align: right; white-space: nowrap; }
  .doc-title { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: #1D4ED8; }
  .doc-no { font-size: 16px; font-weight: 700; margin-top: 2px; }
  .rule { height: 3px; background: #1D4ED8; border-radius: 2px; margin: 16px 0 18px; }
  .cards { display: flex; gap: 12px; margin-bottom: 18px; }
  .card { flex: 1; background: #F8FAFC; border: 1px solid #EAECF0; border-radius: 10px; padding: 10px 12px; }
  .label { font-size: 9.5px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: #667085; margin-bottom: 5px; }
  .strong { font-weight: 700; font-size: 13px; }
  .kv { display: flex; justify-content: space-between; gap: 8px; }
  .kv + .kv { margin-top: 3px; }
  .section-title { font-size: 9.5px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: #667085; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  .items th { text-align: left; font-size: 10px; font-weight: 700; color: #475467; background: #F2F4F7; padding: 7px 10px; }
  .items th:first-child { border-radius: 8px 0 0 8px; } .items th:last-child { border-radius: 0 8px 8px 0; }
  .items td { padding: 8px 10px; border-bottom: 1px solid #F2F4F7; }
  .items tr.sum td { border-bottom: 0; font-weight: 700; color: #475467; }
  .r, .items th.r { text-align: right; }
  .summary { display: flex; justify-content: flex-end; margin-top: 16px; page-break-inside: avoid; }
  .summary-box { width: 62%; }
  .summary table { width: 100%; }
  .summary td { padding: 4px 0; }
  .summary .total td { border-top: 1px solid #EAECF0; padding-top: 8px; font-size: 14px; font-weight: 700; }
  .status { margin-top: 8px; border-radius: 10px; padding: 9px 12px; display: flex; justify-content: space-between;
    align-items: center; font-weight: 700; font-size: 13px; }
  .status.due { background: #FEF3F2; color: #B42318; }
  .status.paid { background: #ECFDF3; color: #067647; }
  .photos { margin-top: 20px; }
  .grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .photo { width: calc((100% - 16px) / 3); page-break-inside: avoid; }
  .photo img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; border-radius: 8px; border: 1px solid #EAECF0; display: block; }
  .photo div { font-size: 9.5px; color: #667085; text-align: center; margin-top: 3px; }
  .footer { margin-top: 22px; padding-top: 12px; border-top: 1px dashed #D0D5DD; text-align: center; page-break-inside: avoid; }
  .thanks { font-weight: 700; font-size: 12.5px; }
`;

export function buildBillHtml(shop: Shop, data: BillData, images: BillImages): string {
  const { bill, customer, order, items, paid, balance } = data;
  const esc = escapeHtml;
  const money = (v: number | string | null | undefined) => esc(formatCurrency(v));
  const docNo = order ? `#${order.order_number}` : '';
  const billDate = formatDate(order?.order_date ?? bill.created_at);

  const brand = images.logo
    ? `<img class="logo" src="${images.logo}"/>`
    : `<div class="logo-fallback">${esc(shop.shop_name.trim().charAt(0).toUpperCase())}</div>`;

  const orderRows = [
    order ? [tb('pdf.orderNumber'), docNo] : null,
    [tb('pdf.date'), billDate],
    order?.delivery_date ? [tb('pdf.deliveryDate'), formatDate(order.delivery_date)] : null,
  ]
    .filter((r): r is string[] => !!r)
    .map(([k, v]) => `<div class="kv"><span class="muted">${esc(k)}</span><b>${esc(v)}</b></div>`)
    .join('');

  const totalPieces = items.reduce((s, i) => s + (Number(i.cloth_count) || 0), 0);
  const itemsHtml = items.length
    ? `<div class="section-title">${esc(tb('pdf.items'))}</div>
       <table class="items">
         <tr><th>${esc(tb('pdf.item'))}</th><th class="r">${esc(tb('pdf.quantity'))}</th></tr>
         ${items.map((i) => `<tr><td>${esc(itemLabel(i.garment_type))}</td><td class="r">${i.cloth_count}</td></tr>`).join('')}
         ${items.length > 1 ? `<tr class="sum"><td>${esc(tb('pdf.totalPieces'))}</td><td class="r">${totalPieces}</td></tr>` : ''}
       </table>`
    : '';

  const charge = (label: string, value: number | null | undefined, negative = false) =>
    Number(value)
      ? `<tr><td class="muted">${esc(label)}</td><td class="r">${negative ? '- ' : ''}${money(value)}</td></tr>`
      : '';
  const isPaid = balance <= 0;

  // Photos are stored shirt slots first, then pant slots. When every slot has
  // a photo the garment of each one is known, so caption it "Shirt 1" /
  // "Pant 1"; otherwise (some slots skipped) fall back to "Photo 1".
  const slotLabels = items.flatMap((i) =>
    Array.from({ length: Number(i.cloth_count) || 0 }, (_, n) => `${itemLabel(i.garment_type)} ${n + 1}`)
  );
  const labelsKnown =
    slotLabels.length === images.photos.length && items.every((i) => parseGarmentType(i.garment_type) !== 'both');
  const photosHtml = images.photos.length
    ? `<div class="photos">
         <div class="section-title">${esc(tb('pdf.photos'))}</div>
         <div class="grid">${images.photos
           .map((src, i) => {
             const caption = labelsKnown ? slotLabels[i] : tb('pdf.photo', { number: i + 1 });
             return `<div class="photo"><img src="${src}"/><div>${esc(caption)}</div></div>`;
           })
           .join('')}</div>
       </div>`
    : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>${STYLES}</style></head>
<body>
  <div class="header">
    <div class="brand">
      ${brand}
      <div>
        <div class="shop-name">${esc(shop.shop_name)}</div>
        ${shop.address ? `<div class="muted small">${esc(shop.address)}</div>` : ''}
        ${shop.phone ? `<div class="muted small">${esc(shop.phone)}</div>` : ''}
      </div>
    </div>
    <div class="doc">
      <div class="doc-title">${esc(tb('pdf.title'))}</div>
      ${docNo ? `<div class="doc-no">${esc(docNo)}</div>` : ''}
      <div class="muted small">${esc(billDate)}</div>
    </div>
  </div>
  <div class="rule"></div>

  <div class="cards">
    <div class="card">
      <div class="label">${esc(tb('pdf.billTo'))}</div>
      <div class="strong">${esc(customer?.name ?? '—')}</div>
      ${customer?.phone ? `<div class="muted">${esc(customer.phone)}</div>` : ''}
      ${customer?.address ? `<div class="muted small">${esc(customer.address)}</div>` : ''}
    </div>
    <div class="card">
      <div class="label">${esc(tb('pdf.orderDetails'))}</div>
      ${orderRows}
    </div>
  </div>

  ${itemsHtml}

  <div class="summary"><div class="summary-box">
    <table>
      ${charge(tb('detail.stitchingCharge'), bill.stitching_charge)}
      ${charge(tb('detail.fabricCost'), bill.fabric_cost)}
      ${charge(tb('detail.tax'), bill.tax)}
      ${charge(tb('detail.discount'), bill.discount, true)}
      <tr class="total"><td>${esc(tb('detail.totalAmount'))}</td><td class="r">${money(bill.total_amount)}</td></tr>
      <tr><td class="muted">${esc(tb('detail.paid'))}</td><td class="r">${money(paid)}</td></tr>
    </table>
    <div class="status ${isPaid ? 'paid' : 'due'}">
      <span>${esc(isPaid ? tb('pdf.paidInFull') : tb('detail.balanceDue'))}</span>
      <span>${money(balance)}</span>
    </div>
  </div></div>

  ${photosHtml}

  <div class="footer">
    <div class="thanks">${esc(tb('pdf.thankYou'))}</div>
    ${shop.phone ? `<div class="muted small">${esc(tb('pdf.contact', { phone: shop.phone }))}</div>` : ''}
  </div>
</body></html>`;
}

/**
 * expo-print's web build ignores `html` and prints the current app screen,
 * so print the bill from a hidden frame instead (browser "Save as PDF").
 */
function printHtmlOnWeb(html: string) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', width: '0', height: '0', border: '0', right: '0', bottom: '0' });
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  frame.srcdoc = html;
  document.body.appendChild(frame);
}

/**
 * Makes a PDF of the bill, uploads it to the shop's `bills` folder under a
 * random name and opens WhatsApp straight to the customer's chat with a
 * short summary plus the PDF link.
 *
 * Web can't produce a PDF file (expo-print only opens the print dialog
 * there), so it shows the bill for printing / "Save as PDF" instead.
 */
export async function sendBillOnWhatsApp(shop: Shop, billId: string): Promise<'sent' | 'printed'> {
  const data = await loadBillData(shop.id, billId);
  if (!data.customer?.phone) throw new Error(i18n.t('whatsapp.errorNoPhone', { ns: 'common' }));
  const html = buildBillHtml(shop, data, await loadBillImages(shop, data));

  if (Platform.OS === 'web') {
    printHtmlOnWeb(html);
    return 'printed';
  }

  // A5 portrait (points at 72 PPI) reads well on a phone screen.
  const { uri } = await Print.printToFileAsync({ html, width: 420, height: 595 });
  const link = await uploadPdf({ bucket: 'bills', shopId: shop.id, localUri: uri, fileName: Crypto.randomUUID() });

  await sendWhatsAppMessage(
    data.customer.phone,
    i18n.t('whatsapp.billPdf', {
      ns: 'common',
      customerName: data.customer.name,
      shopName: shop.shop_name,
      orderPart: data.order ? i18n.t('whatsapp.billPdfOrder', { ns: 'common', orderNumber: data.order.order_number }) : '',
      total: formatCurrency(data.bill.total_amount),
      paid: formatCurrency(data.paid),
      pending: formatCurrency(data.balance),
      link,
    })
  );
  return 'sent';
}

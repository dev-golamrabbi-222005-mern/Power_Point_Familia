import webpush from 'web-push';

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BABq7lffGaYOgAzhdMo_ejmgbRX2frBfpeK-isTyU-CvqsoU55Rc5zX9uLPiDUxr_0Ycds8-8mM6Y7F13h_IUh8';

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  'jM5dX6El9pGGMexgY01HJ7FIRMeTmukPdzcRPR3Vifk';

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@familia.com';

try {
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  }
} catch (e) {
  console.warn('VAPID setup deferred or invalid credentials:', e);
}

export default webpush;

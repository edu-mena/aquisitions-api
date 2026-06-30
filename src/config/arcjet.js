import arcjet, {
  shield,
  detectBot,
  tokenBucket,
  slidingWindow,
} from '@arcjet/node';

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules: [
    shield({ mode: 'LIVE' }),
    detectBot({
      mode: 'LIVE',
      allow: [
        'CATEGORY:SEARCH_ENGINE',
        // 'CATEGORY:MONITOR',
        // 'CATEGORY:PREVIEW',
      ],
    }),
    tokenBucket({
      mode: 'LIVE',
      refillRate: 5,
      interval: 10,
      capacity: 10,
    }),
    slidingWindow({
      mode: 'LIVE',
      interval: 30, // janela de 60 segundos
      max: 20, // máximo de 100 requisições por janela
    }),
  ],
});

export default aj;

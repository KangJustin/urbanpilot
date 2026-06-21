export const INTERVENTION_IMAGES = [
  { match: /tree canopy|street tree/i, img: '/images/interventions/tree-canopy.jpg' },
  { match: /bioswale|permeable|green infrastructure|stormwater/i, img: '/images/interventions/permeable-streets.jpg' },
  { match: /ada|crossing|accessib/i, img: '/images/interventions/ada-crossing.jpg' },
  { match: /bike|bicycle|cycling/i, img: '/images/interventions/transit-expansion.jpg' },
  { match: /transit-oriented|mixed-use housing|affordable housing/i, img: '/images/interventions/affordable-housing.jpg' },
  { match: /infill|small-site|small-lot/i, img: '/images/interventions/infill-housing.jpg' },
];

export function getInterventionImage(rec) {
  const text = `${rec.title} ${rec.description}`;
  return INTERVENTION_IMAGES.find(m => m.match.test(text))?.img || null;
}

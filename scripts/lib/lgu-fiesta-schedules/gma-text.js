/**
 * General Mariano Alvarez, Cavite — barangay feast schedule.
 * Source: https://genmarianoalvarez.gov.ph/barangay-feast/ (hand-curated from LGU page)
 */
export const GMA_FIESTA_TEXT = `
January 9 Sto. Niño Barangay Poblacion 5
January 20 San Sebastian Barangay San Gabriel
January 25 Holy Family Holy Family Parish Church
May 1 San Jose Manggagawa Barangay San Jose
May 1 San Jose Manggagawa Barangay N. Virata
May 1 San Jose Manggagawa Barangay T. Tiago
May 1 San Jose Manggagawa Barangay F. Reyes
May 1 San Jose Manggagawa Barangay G. De Jesus
May 1 St. Joseph Barangay Poblacion 4
May 15 San Isidro Labrador Barangay G. Maderan
June 13-16 San Antonio De Padua Barangay F. Calimag
June 13-16 San Antonio De Padua Barangay B. Tirona
June 13-16 San Antonio De Padua Barangay M. Dacon
June 13-16 San Antonio De Padua Barangay E. Malia
June 13-16 San Antonio De Padua Barangay JP Elises
June 27 Our Mother of Perpetual Help Barangay M. Memije
June 27 Our Mother of Perpetual Help Barangay R. Cruz Sr.
August 16 Senior San Roque Barangay B. Pulido
September 29 San Miguel Arc Angel Barangay Poblacion 1
October 4-5 St. Francis of Assisi Barangay J. Lumbreras
November 15 Blessed Mary of the Passion Barangay S. Delas Alas
November 27 Our Lady of Miraculous Medal Barangay P. Granados
December 8 Immaculate Concepcion Barangay Poblacion 3
`;

/** Relative dates resolved at build time via parseDateFromRaw. */
export const GMA_RELATIVE_FIESTA_SCHEDULE = [
  { date: "3rd Sunday of May", barangay: "Francisco De Castro (Sunshine Vill.)", patronSaint: "Our Lady of Peace and Good Voyage" },
  { date: "Last Sunday of May", barangay: "Inocencio Salud", patronSaint: "Virgin of the Poor" },
  { date: "Last Sunday of May", barangay: "Aldiano Olaes", patronSaint: "Virgin of the Poor" },
  { date: "Last Sunday of May", barangay: "Kapitan Kua (Area F)", patronSaint: "Virgin of the Poor" },
  { date: "Last Sunday of December", barangay: "Barangay 2 Poblacion", patronSaint: "Holy Family" },
];

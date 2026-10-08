import type { ImageMetadata } from "astro";
import traver from "@/assets/images/stock/bravo-farms-traver.jpg";
import kettlemanCity from "@/assets/images/stock/bravo-farms-kettleman-city.jpg";

/**
 * Photographs by other people, used under licences that require credit.
 * Each carries its credit with it, so a page cannot show the photo without
 * the line that makes showing it allowed. LICENSE-NOTICE.md names the
 * files and does not reserve them.
 */
export interface CreditedPhoto {
  src: ImageMetadata;
  alt: string;
  /** What and where, ahead of the credit. */
  caption: string;
  credit: {
    title: string;
    url: string;
    author: string;
    authorUrl: string;
    license: string;
    licenseUrl: string;
  };
}

const CC_BY_2 = {
  license: "CC BY 2.0",
  licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
};

export const bravoFarmsTraver: CreditedPhoto = {
  src: traver,
  alt: "The Bravo Farms store in Traver: a stone building lettered BRAVO FARMS under a star, with a rusted Farmall tractor parked out front",
  caption: "Bravo Farms, Traver",
  credit: {
    title: "Bravo Farms ~ Traver, California",
    url: "https://www.flickr.com/photos/prayitnophotography/51422967173/",
    author: "Thank You (25 Millions ) views",
    authorUrl: "https://www.flickr.com/photos/prayitnophotography/",
    ...CC_BY_2,
  },
};

export const bravoFarmsKettlemanCity: CreditedPhoto = {
  src: kettlemanCity,
  alt: "The Bravo Farms restaurant in Kettleman City at dusk: a two-storey wooden frontier-style building with its sign lit",
  caption: "Bravo Farms, Kettleman City",
  credit: {
    title: "Bravo Farms, Kettleman City",
    url: "https://www.flickr.com/photos/kennejima/29184982401/",
    author: "kennejima",
    authorUrl: "https://www.flickr.com/photos/kennejima/",
    ...CC_BY_2,
  },
};

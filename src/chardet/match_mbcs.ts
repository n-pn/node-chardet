import { Context, Match } from './types';
import binarySearch from './binary_search';
import CharIterator from './char_iterator';

/**
 * Asian double or multi-byte - charsets.
 * Match is determined mostly by the input data adhering to the
 * encoding scheme for the charset, and, optionally,
 * frequency-of-occurrence of characters.
 */
export default function matchMbcs(
  det: Context,
  name: string,
  commonChars: number[],
  nextChar: (iter: CharIterator, det: Context) => boolean
): Match | null {
  let doubleByteCharCount = 0;
  let commonCharCount = 0;
  let badCharCount = 0;
  let totalCharCount = 0;
  let confidence = 0;

  const iter = new CharIterator();

  detectBlock: {
    for (iter.reset(); nextChar(iter, det); ) {
      totalCharCount++;
      if (iter.error) {
        badCharCount++;
      } else {
        const cv = iter.charValue & 0xffffffff;

        if (cv > 0xff) {
          doubleByteCharCount++;
          if (commonChars != null) {
            // NOTE: This assumes that there are no 4-byte common chars.
            if (binarySearch(commonChars, cv) >= 0) {
              commonCharCount++;
            }
          }
        }
      }
      if (badCharCount >= 2 && badCharCount * 5 >= doubleByteCharCount) {
        // console.log('its here!')
        // Bail out early if the byte data is not matching the encoding scheme.
        break detectBlock;
      }
    }

    if (doubleByteCharCount <= 10 && badCharCount == 0) {
      // Not many multi-byte chars.
      if (doubleByteCharCount == 0 && totalCharCount < 10) {
        // There weren't any multibyte sequences, and there was a low density of non-ASCII single bytes.
        // We don't have enough data to have any confidence.
        // Statistical analysis of single byte non-ASCII characters would probably help here.
        confidence = 0;
      } else {
        //   ASCII or ISO file?  It's probably not our encoding,
        //   but is not incompatible with our encoding, so don't give it a zero.
        confidence = 10;
      }
      break detectBlock;
    }

    //
    //  No match if there are too many characters that don't fit the encoding scheme.
    //    (should we have zero tolerance for these?)
    //
    if (doubleByteCharCount < 20 * badCharCount) {
      confidence = 0;
      break detectBlock;
    }

    if (commonChars == null) {
      // We have no statistics on frequently occurring characters.
      //  Assess confidence purely on having a reasonable number of
      //  multi-byte characters (the more the better
      confidence = 30 + doubleByteCharCount - 20 * badCharCount;
      if (confidence > 100) {
        confidence = 100;
      }
    } else {
      // Frequency of occurrence statistics exist.
      const maxVal = Math.log(doubleByteCharCount / 4);
      const scaleFactor = 90.0 / maxVal;
      confidence = Math.floor(Math.log(commonCharCount + 1) * scaleFactor + 10);
      confidence = Math.min(confidence, 100);
    }
  } // end of detectBlock:

  return confidence == 0 ? null : { name: name, confidence };
}

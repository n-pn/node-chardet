import type { Context, Match, Recogniser } from './chardet/types';
import CharIterator from './chardet/char_iterator';
import matchMbcs from './chardet/match_mbcs';

import { big5CommonChars, gb18030CommonChars } from './chardet/common_chars';

/**
 *   Big5 charset recognizer.
 */

export class Big5 implements Recogniser {
  match(det: Context) {
    return matchMbcs(det, 'Big5', big5CommonChars, this.nextChar);
  }

  nextChar(iter: CharIterator, det: Context) {
    iter.index = iter.nextIndex;
    iter.error = false;

    const firstByte = (iter.charValue = iter.nextByte(det));

    if (firstByte < 0) return false;

    // single byte character.
    if (firstByte <= 0x7f || firstByte == 0xff) return true;

    const secondByte = iter.nextByte(det);

    if (secondByte < 0) return false;

    iter.charValue = (iter.charValue << 8) | secondByte;

    if (secondByte < 0x40 || secondByte == 0x7f || secondByte == 0xff)
      iter.error = true;

    return true;
  }
}

/**
 *   GB-18030 recognizer. Uses simplified Chinese statistics.
 */
export class GB_18030 implements Recogniser {
  match(det: Context) {
    return matchMbcs(det, 'GB18030', gb18030CommonChars, this.nextChar);
  }

  /*
   *  Get the next character value for EUC based encodings.
   *  Character 'value' is simply the raw bytes that make up the character
   *     packed into an int.
   */

  nextChar(iter: CharIterator, det: Context) {
    iter.index = iter.nextIndex;
    iter.error = false;
    let firstByte = 0;
    let secondByte = 0;
    let thirdByte = 0;
    let fourthByte = 0;

    buildChar: {
      firstByte = iter.charValue = iter.nextByte(det);
      if (firstByte < 0) {
        // Ran off the end of the input data
        iter.done = true;
        break buildChar;
      }
      if (firstByte <= 0x80) {
        // single byte char
        break buildChar;
      }

      secondByte = iter.nextByte(det);
      iter.charValue = (iter.charValue << 8) | secondByte;

      if (firstByte >= 0x81 && firstByte <= 0xfe) {
        // Two byte Char
        if (
          (secondByte >= 0x40 && secondByte <= 0x7e) ||
          (secondByte >= 80 && secondByte <= 0xfe)
        ) {
          break buildChar;
        }

        // Four byte char
        if (secondByte >= 0x30 && secondByte <= 0x39) {
          thirdByte = iter.nextByte(det);
          if (thirdByte >= 0x81 && thirdByte <= 0xfe) {
            fourthByte = iter.nextByte(det);
            if (fourthByte >= 0x30 && fourthByte <= 0x39) {
              iter.charValue =
                (iter.charValue << 16) | (thirdByte << 8) | fourthByte;
              break buildChar;
            }
          }
        }
        iter.error = true;
        break buildChar;
      }
    }

    return iter.done == false;
  }
}

export class UTF_16BE implements Recogniser {
  match(det: Context): Match | null {
    const input = det.rawInput;

    if (
      input.length >= 2 &&
      (input[0] & 0xff) == 0xfe &&
      (input[1] & 0xff) == 0xff
    ) {
      return { name: 'UTF-16BE', confidence: 100 }; // confidence = 100
    }

    // TODO: Do some statistics to check for unsigned UTF-16BE
    return null;
  }
}

export class UTF_16LE implements Recogniser {
  match(det: Context): Match | null {
    const input = det.rawInput;

    if (
      input.length >= 2 &&
      (input[0] & 0xff) == 0xff &&
      (input[1] & 0xff) == 0xfe
    ) {
      // LE BOM is present.
      if (input.length >= 4 && input[2] == 0x00 && input[3] == 0x00) {
        // It is probably UTF-32 LE, not UTF-16
        return null;
      }
      return { name: 'UTF-16LE', confidence: 100 }; // confidence = 100
    }

    // TODO: Do some statistics to check for unsigned UTF-16LE
    return null;
  }
}

export class UTF_8 implements Recogniser {
  match(det: Context): Match | null {
    let numValid = 0;
    let numInvalid = 0;
    let trailBytes = 0;
    let confidence;

    const input = det.rawInput;

    const hasBOM =
      det.rawLen >= 3 &&
      (input[0] & 0xff) == 0xef &&
      (input[1] & 0xff) == 0xbb &&
      (input[2] & 0xff) == 0xbf;

    // Scan for multi-byte sequences
    for (let i = 0; i < det.rawLen; i++) {
      const b = input[i];
      if ((b & 0x80) == 0) continue; // ASCII

      // Hi bit on char found.  Figure out how long the sequence should be
      if ((b & 0x0e0) == 0x0c0) {
        trailBytes = 1;
      } else if ((b & 0x0f0) == 0x0e0) {
        trailBytes = 2;
      } else if ((b & 0x0f8) == 0xf0) {
        trailBytes = 3;
      } else {
        numInvalid++;
        if (numInvalid > 5) break;
        trailBytes = 0;
      }

      // Verify that we've got the right number of trail bytes in the sequence
      for (i = i + 1; i < det.rawLen; i++) {
        if ((input[i] & 0xc0) != 0x080) {
          numInvalid++;
          break;
        }
        if (--trailBytes == 0) {
          numValid++;
          break;
        }
      }
    }

    // Cook up some sort of confidence score, based on presense of a BOM
    //    and the existence of valid and/or invalid multi-byte sequences.
    confidence = 0;

    if (hasBOM && numInvalid == 0) confidence = 100;
    else if (hasBOM && numValid > numInvalid * 10) confidence = 80;
    else if (numValid > 3 && numInvalid == 0) confidence = 100;
    else if (numValid > 0 && numInvalid == 0) confidence = 80;
    else if (numValid == 0 && numInvalid == 0) confidence = 10; // Plain ASCII.
    // Probably corrupt utf-8 data.  Valid sequences aren't likely by chance.
    else if (numValid > numInvalid * 10) confidence = 25;
    else return null;

    return { name: 'UTF-8', confidence };
  }
}

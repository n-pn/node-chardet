import type { Context } from './types';
// 'Character'  iterated character class.
//    Recognizers for specific Mbcs encodings make their 'characters' available
//    by providing a nextChar() function that fills in an instance of charIterator
//    with the next char from the input.
//    The returned characters are not converted to Unicode, but remain as the raw
//    bytes (concatenated into an int) from the codepage data.
//
//  For Asian charsets, use the raw input rather than the input that has been
//   stripped of markup.  Detection only considers multi-byte chars, effectively
//   stripping markup anyway, and double byte chars do occur in markup too.
//

export default class CharIterator {
  charValue: number; // 1-4 bytes from the raw input data
  index: number;
  nextIndex: number;
  error: boolean;
  done: boolean;

  constructor() {
    this.charValue = 0; // 1-4 bytes from the raw input data
    this.index = 0;
    this.nextIndex = 0;
    this.error = false;
    this.done = false;
  }

  reset() {
    this.charValue = 0;
    this.index = -1;
    this.nextIndex = 0;
    this.error = false;
    this.done = false;
  }

  nextByte(det: Context) {
    if (this.nextIndex >= det.rawLen) {
      this.done = true;
      return -1;
    }
    const byteValue = det.rawInput[this.nextIndex++] & 0x00ff;
    return byteValue;
  }
}

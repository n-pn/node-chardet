import type { Match, Recogniser, Context } from './chardet/types';
import { UTF_8, UTF_16BE, UTF_16LE, Big5, GB_18030 } from './chardet';

const recognisers: Recogniser[] = [
  new GB_18030(),
  new UTF_8(),
  new Big5(),
  new UTF_16LE(),
  new UTF_16BE(),
];

export const analyse = (buffer: Uint8Array): Match[] => {
  // Tally up the byte occurrence statistics.
  const byteStats = [];
  for (let i = 0; i < 256; i++) byteStats[i] = 0;

  for (let i = buffer.length - 1; i >= 0; i--) byteStats[buffer[i] & 0x00ff]++;

  let c1Bytes = false;
  for (let i = 0x80; i <= 0x9f; i += 1) {
    if (byteStats[i] !== 0) {
      c1Bytes = true;
      break;
    }
  }

  const context: Context = {
    byteStats,
    c1Bytes,
    rawInput: buffer,
    rawLen: buffer.length,
    inputBytes: buffer,
    inputLen: buffer.length,
  };

  const matches = recognisers
    .map((rec) => {
      return rec.match(context);
    })
    .filter((match) => {
      return !!match;
    })
    .sort((a, b) => {
      return b!.confidence - a!.confidence;
    });

  return matches as Match[];
};

export const chardet = (buffer: Uint8Array): string | null => {
  const matches: Match[] = analyse(buffer);
  return matches.length > 0 ? matches[0].name : null;
};

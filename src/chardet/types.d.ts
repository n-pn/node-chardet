export interface Context {
  byteStats: number[];
  c1Bytes: boolean;
  rawInput: Uint8Array;
  rawLen: number;
  inputBytes: Uint8Array;
  inputLen: number;
}

export interface Recogniser {
  match(input: Context): Match | null;
}

export interface Match {
  name: string;
  confidence: number;
}

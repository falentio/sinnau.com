const CLOSING_CHAR_RE = /["'\u201D\u2019)\]»\u00BB]/u;

const isClosingChar = (ch: string): boolean => CLOSING_CHAR_RE.test(ch);

const tryNewline = (
  content: string,
  idealEnd: number,
  maxNewline: number
): number | null => {
  const limit = Math.min(maxNewline, content.length - 1);
  for (let pos = limit; pos >= idealEnd; pos -= 1) {
    if (content.charAt(pos) === "\n") {
      let end = pos + 1;
      while (end < content.length && content.charAt(end) === "\n") {
        end += 1;
      }
      return end;
    }
  }
  return null;
};

const trySentence = (
  content: string,
  idealEnd: number,
  maxSentence: number
): number | null => {
  const limit = Math.min(maxSentence, content.length - 1);
  for (let pos = limit; pos >= idealEnd; pos -= 1) {
    const ch = content.charAt(pos);
    if (ch !== "." && ch !== "?" && ch !== "!") {
      continue;
    }

    let next = pos + 1;
    if (next < content.length && isClosingChar(content.charAt(next))) {
      next += 1;
    }
    if (next < content.length && /\s/u.test(content.charAt(next))) {
      return next + 1;
    }
  }
  return null;
};

const tryWordBreak = (
  content: string,
  idealEnd: number,
  maxWord: number
): number | null => {
  const limit = Math.min(maxWord, content.length - 1);
  for (let pos = limit; pos >= idealEnd; pos -= 1) {
    if (/\s/u.test(content.charAt(pos))) {
      return pos + 1;
    }
  }
  return null;
};

export const chunkContent = (content: string, chunkSize: number): string[] => {
  if (content.length === 0) {
    throw new Error("content must not be empty");
  }
  if (chunkSize <= 0) {
    throw new Error("chunkSize must be positive");
  }

  if (content.length <= chunkSize) {
    return [content];
  }

  const overlap = Math.floor(chunkSize * 0.05);
  const chunks: string[] = [];
  let scanFrom = 0;

  while (scanFrom < content.length) {
    const remaining = content.length - scanFrom;

    if (remaining <= chunkSize) {
      if (remaining < chunkSize * 0.5 && chunks.length > 0) {
        chunks[chunks.length - 1] += content.slice(scanFrom);
      } else {
        chunks.push(content.slice(scanFrom));
      }
      break;
    }

    const idealEnd = scanFrom + chunkSize;
    const maxNewline = idealEnd + Math.floor(chunkSize * 0.05);
    const maxSentence = idealEnd + Math.floor(chunkSize * 0.03);
    const maxWord = idealEnd + Math.floor(chunkSize * 0.01);

    let splitPoint = idealEnd;

    const nl = tryNewline(content, idealEnd, maxNewline);
    if (nl !== null) {
      splitPoint = nl;
    }
    const sent = trySentence(content, idealEnd, maxSentence);
    if (nl === null && sent !== null) {
      splitPoint = sent;
    }
    const word = tryWordBreak(content, idealEnd, maxWord);
    if (nl === null && sent === null && word !== null) {
      splitPoint = word;
    }

    chunks.push(content.slice(scanFrom, splitPoint));
    const nextScanFrom = splitPoint - overlap;
    if (nextScanFrom <= scanFrom) {
      break;
    }
    scanFrom = nextScanFrom;
  }

  return chunks;
};

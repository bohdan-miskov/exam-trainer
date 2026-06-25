export interface Question {
  id: number;
  text: string;
  options: { text: string; isCorrect: boolean }[];
}

export function parseMarkdown(content: string): Question[] {
  const questionHeaderRegex = /^### (.+)/gm;
  const optionRegex = /^- \[([ x])\]\s+(.+)$/gm;

  const questions: Question[] = [];
  let match;
  const headers: { index: number; text: string }[] = [];

  while ((match = questionHeaderRegex.exec(content)) !== null) {
    headers.push({ index: match.index, text: match[1].trim() });
  }

  for (let i = 0; i < headers.length; i++) {
    const start = headers[i].index;
    const end = i + 1 < headers.length ? headers[i + 1].index : content.length;
    const block = content.substring(start, end);

    const options: Question["options"] = [];
    let optMatch;

    // Скидаємо lastIndex для нового блоку
    optionRegex.lastIndex = 0;
    while ((optMatch = optionRegex.exec(block)) !== null) {
      options.push({
        isCorrect: optMatch[1].toLowerCase() === "x",
        text: optMatch[2].trim(),
      });
    }

    if (options.length > 0) {
      questions.push({
        id: i + 1,
        text: headers[i].text,
        options,
      });
    }
  }

  return questions;
}

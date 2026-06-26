import { customAlphabet } from "nanoid";

export const SLUG_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
export const SLUG_LENGTH = 6;

export const SLUG_REGEX = new RegExp(
  `^[${SLUG_ALPHABET}]{${SLUG_LENGTH}}$`
);

const MAX_RETRIES = 5;

const generate = customAlphabet(SLUG_ALPHABET, SLUG_LENGTH);

export function generateSlug(): string {
  return generate();
}

export async function createUniqueSlug(
  isTaken: (slug: string) => Promise<boolean>
): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const slug = generateSlug();
    if (!(await isTaken(slug))) {
      return slug;
    }
  }
  throw new Error("Không thể tạo slug duy nhất sau 5 lần thử");
}

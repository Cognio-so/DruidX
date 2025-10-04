export function useConstructurl(key: string) {
  if (!key || key.trim() === '') {
    return '';
  }
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

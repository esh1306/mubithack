// UK commodity codes are 10 digits. Keep leading zeros; never right-pad a short HS fragment.

export function digitsOnly(code: string) {
  return (code ?? "").replace(/\D/g, "");
}

export function isUk10(code: string) {
  return /^\d{10}$/.test(digitsOnly(code));
}

export function uk10(code: string) {
  const d = digitsOnly(code);
  return d.length === 10 ? d : null;
}

export function hs6(code: string) {
  return digitsOnly(code).slice(0, 6);
}

export function heading4(code: string) {
  return digitsOnly(code).slice(0, 4);
}

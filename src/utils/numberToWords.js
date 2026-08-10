const SMALL = ["zero","one","two","three","four","five","six","seven","eight","nine","ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

export const numberToWords = (value) => {
  if (value === 0) return 'zero';
  if (value < 0) return `minus ${numberToWords(Math.abs(value))}`;

  const inWords = (num) => {
    if (num < 20) return SMALL[num];
    if (num < 100) return `${TENS[Math.floor(num / 10)]}${num % 10 ? `-${SMALL[num % 10]}` : ''}`;
    if (num < 1000) return `${SMALL[Math.floor(num / 100)]} hundred${num % 100 ? ` ${inWords(num % 100)}` : ''}`;
    if (num < 1000000) return `${inWords(Math.floor(num / 1000))} thousand${num % 1000 ? ` ${inWords(num % 1000)}` : ''}`;
    return num.toString();
  };

  const [integerPart, decimals] = Number(value).toFixed(2).split('.');
  const words = inWords(parseInt(integerPart, 10));
  return decimals === '00' ? words : `${words} and ${decimals}/100`;
};

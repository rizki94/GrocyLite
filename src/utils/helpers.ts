export const cls = (input: string) =>
  input
    .replace(/\s+/gm, ' ')
    .split(' ')
    .filter(cond => typeof cond === 'string')
    .join(' ')
    .trim();

export const numberWithComma = (val: number | string, delimiter = 0) => {
  if (val !== undefined && val !== null) {
    return (+val).toFixed(delimiter).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');
  }
  return '0';
};

export const dateFormatted = (val?: Date | string | null) => {
  if (!val) return '';
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) {
    return typeof val === 'string' ? val.split(' ')[0] : '';
  }
  return (
    d.getFullYear() +
    '-' +
    ('0' + (d.getMonth() + 1)).slice(-2) +
    '-' +
    ('0' + d.getDate()).slice(-2)
  );
};

export const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const dateDiff = (a: Date, b: Date) => {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
};

export const changesDueDate = (
  date: string | Date,
  topValue: string | number,
) => {
  const dueDateFormatted = dateFormatted(
    addDays(
      new Date(date),
      typeof topValue === 'string' ? parseInt(topValue) : topValue,
    ),
  );
  return dueDateFormatted;
};

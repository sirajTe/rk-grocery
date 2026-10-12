export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN')
export const discount = (p) => (p.mrp > p.price ? Math.round(((p.mrp - p.price) / p.mrp) * 100) : 0)

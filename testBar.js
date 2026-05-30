const txt1 = "Simples R$ 10,00\n3.10";
const txt2 = "Simples R$10,00 3.10";
const re = /(?:simples|múltipla|dupla).*?r\$[\s\S]{0,10}?\d+[,.]\d{2}\s*([1-9][0-9]*[,.][0-9]{2})/i;
console.log(txt1.match(re));
console.log(txt2.match(re));

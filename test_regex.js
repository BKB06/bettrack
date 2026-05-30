
    const text = `Simples R$ 10,00
    3.10`;
    const m = text.match(/(?:simples|múltipla|dupla).*?r\$[\s\S]{0,10}?\d+[,.]\d{2}\s*([1-9][0-9]*[,.][0-9]{2})/i);
    console.log(m ? m[1] : 'null');
    
let desc = "VR Giovanni Perricard vs NovakDjokovic O";
desc = desc.replace(/^([a-zA-ZÀ-ÿ]{1,2}\b[\s\W\d]*)*(?=[a-zA-ZÀ-ÿ])/i, '');
desc = desc.replace(/[\s\W\d]+([a-zA-ZÀ-ÿ]{1,2}\b[\s\W\d]*)*$/i, '');
console.log("->", desc);

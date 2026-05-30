import re

def parseBetText(text):
    cleanText = re.sub(r'[\r\n]+', '\n', text).strip()
    
    matchOdd = re.search(r'(?:odd|odds)[\s:=]*([1-9][0-9]*[,.][0-9]{2,3})\b', cleanText, re.I)
    criarApostaMatch = re.search(r'(?:(?:criar aposta)|(?:bet builder))[\s\S]{0,40}?([1-9][0-9]*[,.][0-9]{2})', cleanText, re.I)
    
    odd = 0
    if matchOdd:
        odd = float(matchOdd.group(1).replace(',', '.'))
    if odd == 0 and criarApostaMatch:
        odd = float(criarApostaMatch.group(1).replace(',', '.'))
        
    lines = cleanText.split('\n')
    validLines = []
    for l in lines:
        if re.match(r'^[\d.,\s:xX\-@]+$', l) or re.search(r'(?:odd|odds)\b', l, re.I) or re.search(r'reutiliz|apostar|confirmar|pagamento', l, re.I):
            continue
        validLines.append(l.strip())
        
    desc = ''
    eventIdx = -1
    for i, l in enumerate(validLines):
        if re.search(r'\s+(x|vs|-|–)\s+', l, re.I):
            eventIdx = i
            break
            
    if eventIdx != -1:
        desc = validLines[eventIdx]
    else:
        betterLines = [l for l in validLines if len(l) >= 3 and re.search(r'[a-zA-Z]{3,}', l) and not re.search(r'menos de|mais de|abaixo|acima|handicap|chutes|marcar|jogador|escanteios', l, re.I)]
        if len(betterLines) > 0:
            desc = betterLines[0]
        if len(betterLines) > 1 and not re.search(r'\s+(x|vs|-|–)\s+', desc, re.I):
            if len(betterLines[1]) < 35 and not re.search(r'menos de|mais de|abaixo|acima|chutes|marcar|jogador|escanteios', betterLines[1], re.I):
                desc += " - " + betterLines[1]
                
    # cleanup replacements like JS
    desc = re.sub(r'^.*?(?:simples|múltipla|dupla)[\s\S]*?\d+[,.]\d{2}[^a-zA-ZÀ-ÿ]*(?=[a-zA-ZÀ-ÿ])', '', desc, flags=re.I)
    desc = re.sub(r'\s*(?:\b(?:odd|odds)\b|@).*$', '', desc, flags=re.I)
    desc = re.sub(r'\s+\d+[,.]\d{2}[\s\W_]*$', '', desc, flags=re.I)
    desc = re.sub(r'\s+\d+[,.]\d{2}\s+(?=-|x|vs)', ' ', desc, flags=re.I)
    desc = re.sub(r'\s*(?:esta noite|hoje|amanhã|amanha)\b', '', desc, flags=re.I)
    desc = re.sub(r'\s+\d{2}[:h]\d{2}\b', '', desc, flags=re.I)
    desc = re.sub(r'\s+(?:cio|ço|co|es|as|os|do|de)\s*[\d:.,\s]*$', '', desc, flags=re.I)
    desc = re.sub(r'\s+\d{3,4}[.,\s]*$', '', desc, flags=re.I)
    desc = re.sub(r'^(?:[\s\W_]|[a-zA-Z]{1,3}\b)*reutiliz[a-z]*[\s\W_]*', '', desc, flags=re.I)
    desc = re.sub(r'\breutiliz[a-z]*\b', '', desc, flags=re.I)
    desc = re.sub(r'^([a-zA-ZÀ-ÿ]{1}\b[\s\W\d]*)*(?=[a-zA-ZÀ-ÿ])', '', desc, flags=re.I)
    desc = re.sub(r'^[\s\W_]+', '', desc)
    desc = re.sub(r'[^\w\)]+$', '', desc)
    
    return odd, desc.strip()

print(parseBetText("Criar Aposta\n3.10\n1 Athletico-PR\nAmanhã 16:00\n[shield]\nmirasso\nOdd: 2,1\nReutilizar"))

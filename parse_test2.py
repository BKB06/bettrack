import re

def is_invalid(l):
    lw = l.lower()
    if 'playoff' in lw or 'aposta' in lw or 'odds' in lw or 'ganhos' in lw or 'retornos' in lw or 'superbet' in lw or 'betano' in lw or 'bet365' in lw or 'pitaco' in lw or 'informações sobre' in lw or 'simples' in lw or 'dupla' in lw or 'múltipla' in lw or 'em aberto' in lw or 'finalizadas' in lw or 'pendentes' in lw or 'ao vivo' in lw or 'em revisão' in lw or 'reutilizar' in lw:
        return True
    if re.match(r'^[\d.,\s$r\+hx]+$', lw):  # regex equivalent to /^[\d.,\s$r+hx]+$/i
        return True
    return False

def parseBetText(text):
    cleanText = re.sub(r'[\r\n]+', '\n', text).strip()
    lines = cleanText.split('\n')
    validLines = [l.strip() for l in lines if not is_invalid(l)]
    
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
                
    # New Fixes
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
    
    return desc.strip()

print('TEST 1:', parseBetText("Criar Aposta\n3.10\n1 Athletico-PR\nAmanhã 16:00\n[shield]\nmirasso\nOdd: 2,1\nReutilizar"))
print('TEST 2:', parseBetText("Simples 3.10\nMirassoL"))
print('TEST 3:', parseBetText("Criar Aposta\nAthletico-PR\n21:30\nmirassol"))

import re
from collections import Counter

# Global dictionary
WORDS = Counter()

def load_dictionary(text):
    """Loads a large string of words into the frequency dictionary."""
    global WORDS
    # Expecting words separated by newlines or spaces
    found_words = re.findall(r'\w+', text.lower())
    WORDS.update(found_words)
    # Boost some common words and specific ones mentioned by user
    boost = ['excited', 'share', 'completed', 'i', 'have', 'has', 'the', 'to', 'and']
    for word in boost:
        WORDS[word] += 10000 

def P(word): 
    """Probability of `word`."""
    N = sum(WORDS.values())
    return WORDS[word] / (N if N > 0 else 1)

def known(words): 
    """The subset of `words` that appear in the dictionary of WORDS."""
    return set(w for w in words if w in WORDS)

def edits1(word):
    """All edits that are one edit away from `word`."""
    letters    = 'abcdefghijklmnopqrstuvwxyz'
    splits     = [(word[:i], word[i:])    for i in range(len(word) + 1)]
    deletes    = [L + R[1:]               for L, R in splits if R]
    transposes = [L + R[1] + R[0] + R[2:] for L, R in splits if len(R)>1]
    replaces   = [L + c + R[1:]           for L, R in splits if R for c in letters]
    inserts    = [L + c + R               for L, R in splits for c in letters]
    return set(deletes + transposes + replaces + inserts)

def edits2(word): 
    """All edits that are two edits away from `word`."""
    return (e2 for e1 in edits1(word) for e2 in edits1(e1))

def candidates(word): 
    """Generate possible spelling corrections for word."""
    # Efficiency optimization: check known first, then edits1, then only edits2 if needed
    k = known([word])
    if k: return k
    
    e1 = known(edits1(word))
    if e1: return e1
    
    # Only do edits2 for short words to save CPU
    if len(word) < 7:
        e2 = known(edits2(word))
        if e2: return e2
        
    return [word]

def get_suggestions(word):
    word = word.lower()
    if not word.isalpha():
        return []
    
    # If word is already very common, don't suggest anything
    if word in WORDS and WORDS[word] > 5:
        return []
    
    all_candidates = candidates(word)
    sorted_candidates = sorted(all_candidates, key=P, reverse=True)
    
    results = [c for c in sorted_candidates if c != word]
    return results[:3]

def check_grammar(text):
    """Checks for common grammatical errors and returns corrections."""
    text_lower = text.lower()
    suggestions = []
    
    # Rule-based grammar correction
    # Format: (Regex Pattern, Replacement)
    rules = [
        (r"\bi\s+has\s+completed\b", "i completed"),
        (r"\bi\s+has\s+done\b", "i did"),
        (r"\bi\s+has\b", "i have"),
        (r"\bshe\s+have\b", "she has"),
        (r"\bhe\s+have\b", "he has"),
        (r"\bit\s+have\b", "it has"),
        (r"\bthey\s+has\b", "they have"),
        (r"\bwe\s+has\b", "we have"),
        (r"\byou\s+has\b", "you have"),
    ]
    
    for pattern, replacement in rules:
        if re.search(pattern, text_lower):
            suggestions.append(replacement)
            
    return suggestions

def check_text(text):
    words_list = re.findall(r'\w+|\W+', text)
    result = []
    for item in words_list:
        if item.isalnum():
            suggestions = get_suggestions(item)
            result.append({
                "word": item,
                "suggestions": suggestions,
                "is_correct": not suggestions and (item.lower() in WORDS or not item.isalpha())
            })
        else:
            result.append({
                "word": item,
                "is_separator": True
            })
    return result

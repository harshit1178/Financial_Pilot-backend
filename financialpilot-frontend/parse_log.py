import re

with open('build_output.txt', 'r', encoding='utf-16') as f:
    text = f.read()

text = re.sub(r'\x1b\[[0-9;]*m', '', text)
text = text.replace('\x1bc', '\n')
text = text.replace('\x1b[2J\x1b[3J\x1b[H', '\n')
print(text.strip()[-1000:])

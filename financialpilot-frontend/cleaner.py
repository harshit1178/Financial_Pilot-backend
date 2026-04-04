import sys

with open('logs.txt', 'rb') as f:
    text = f.read()

# usually npm run build in powershell makes UTF-16LE or UTF-8. 
try:
    text = text.decode('utf-16le')
except:
    text = text.decode('utf-8', errors='ignore')

import re
# remove ansi escape sequences
clean = re.sub(r'[\x00-\x19\x1b].*?m|\x1b\[.*?[A-Za-z]|\x1bc', '\n', text)
clean = re.sub(r'[\x00-\x09\x0b-\x1f]', '', clean)
for line in clean.split('\n'):
    if line.strip():
        print(line.strip())
